import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt.js';

const BCRYPT_SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a password with its hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if match
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Hash a refresh token using SHA-256
 * @param {string} token - Raw refresh token
 * @returns {string} Hashed token
 */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new user
 * @param {string} username - Username
 * @param {string} email - Email
 * @param {string} passwordHash - Hashed password
 * @returns {Promise<User>} Created user
 */
export async function createUser(username, email, passwordHash) {
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      role: 'USER',
    },
    select: {
      id: true,
      username: true,
      email: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Find user by email or username
 * @param {string} identifier - Email or username
 * @returns {Promise<User | null>} User or null
 */
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

/**
 * Find user by ID
 * @param {string} userId - User ID
 * @returns {Promise<User | null>} User or null
 */
export async function findUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
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

/**
 * Create a refresh token session
 * @param {string} userId - User ID
 * @returns {Promise<{token: string, sessionId: string}>} Refresh token and session ID
 */
export async function createSession(userId) {
  const sessionId = crypto.randomUUID();
  const rawToken = generateRefreshToken(userId, sessionId);
  const refreshTokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDay(expiresAt.getDay() + 7); // 7 days

  await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt,
    },
  });

  return { token: rawToken, sessionId };
}

/**
 * Find valid session by refresh token hash
 * @param {string} tokenHash - Hashed refresh token
 * @returns {Promise<{session: object, user: object}| null}> Session and user or null
 */
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

/**
 * Rotate refresh token (for secure token rotation)
 * @param {string} oldSessionId - Old session ID
 * @param {string} userId - User ID
 * @returns {Promise<{token: string, sessionId: string}>} New refresh token and session ID
 */
export async function rotateSession(oldSessionId, userId) {
  // Revoke old session
  await prisma.authSession.update({
    where: { id: oldSessionId },
    data: { revokedAt: new Date() },
  });

  // Create new session
  const { token, sessionId } = await createSession(userId);
  return { token, sessionId };
}

/**
 * Revoke a session
 * @param {string} sessionId - Session ID
 */
export async function revokeSession(sessionId) {
  await prisma.authSession.updateMany({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all sessions for a user
 * @param {string} userId - User ID
 */
export async function revokeAllSessions(userId) {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

/**
 * Clear expired sessions (cleanup)
 */
export async function cleanupExpiredSessions() {
  await prisma.authSession.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
}

/**
 * Get safe user response
 * @param {User | object} user - User object
 * @returns {object} Safe user data
 */
export function getSafeUserResponse(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}