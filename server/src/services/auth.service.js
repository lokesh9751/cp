import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt.js';

const BCRYPT_SALT_ROUNDS = 10;

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Checks if a user is currently banned.
 * Auto-unbans if a temporary ban has expired.
 * @returns {Promise<{ banned: boolean, message?: string }>}
 */
export async function checkUserBanStatus(user) {
  if (!user?.isBanned) {
    return { banned: false };
  }

  const now = new Date();
  if (user.bannedUntil && new Date(user.bannedUntil) <= now) {
    await prisma.user.update({
      where: { id: user.id },
      data: { isBanned: false, bannedUntil: null, banReason: null },
    });
    return { banned: false };
  }

  const untilText = user.bannedUntil
    ? ` until ${new Date(user.bannedUntil).toLocaleString('en-IN')}`
    : ' permanently';
  const reasonText = user.banReason ? ` Reason: ${user.banReason}` : '';

  return {
    banned: true,
    message: `Your account is banned${untilText}.${reasonText}`,
  };
}

export async function createUser(username, email, passwordHash) {
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: 'USER',
    },
    select: {
      avatarUrl: true,
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      role: true,
    },
  });

  return user;
}

export async function findUserByIdentifier(identifier) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { username: identifier },
      ],
    },
  });

  return user;
}

export async function findUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      avatarUrl: true,
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

export async function createSession(userId) {
  const sessionId = crypto.randomUUID();
  const rawToken = generateRefreshToken(userId, sessionId);
  const refreshTokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt,
    },
  });

  return { token: rawToken, sessionId };
}

export async function findValidSession(tokenHash) {
  const session = await prisma.authSession.findFirst({
    where: {
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  return session;
}

export async function rotateSession(oldSessionId, userId) {
  await prisma.authSession.update({
    where: { id: oldSessionId },
    data: { revokedAt: new Date() },
  });

  const { token, sessionId } = await createSession(userId);
  return { token, sessionId };
}

export async function revokeSession(sessionId) {
  await prisma.authSession.updateMany({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId) {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function cleanupExpiredSessions() {
  await prisma.authSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

export function getSafeUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'USER',
    avatarUrl: user.avatarUrl || null,
    createdAt: user.createdAt,
  };
}