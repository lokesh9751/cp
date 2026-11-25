import crypto from 'crypto';
import {
  hashPassword,
  comparePassword,
  findUserByIdentifier,
  createUser,
  createSession,
  findValidSession,
  rotateSession,
  revokeSession,
  getSafeUserResponse,
  checkUserBanStatus,
} from '../services/auth.service.js';
import { generateAccessToken } from '../lib/jwt.js';
import { ErrorCode } from '../constants/enums.js';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { revokeAllSessions } from '../services/auth.service.js';
import { deleteLocalAvatar } from '../lib/avatarStorage.js';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth',
};

export async function signup(req, res, next) {
  try {
    const { username, email, password } = req.validatedBody;

    const existingUsername = await findUserByIdentifier(username);
    if (existingUsername) {
      return res.status(409).json({
        error: {
          code: ErrorCode.CONFLICT,
          message: 'Unable to create account',
          fieldErrors: {
            username: ['Username is already taken'],
          },
        },
      });
    }

    const existingEmail = await findUserByIdentifier(email);
    if (existingEmail) {
      return res.status(409).json({
        error: {
          code: ErrorCode.CONFLICT,
          message: 'Unable to create account',
          fieldErrors: {
            email: ['An account with this email already exists'],
          },
        },
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(username, email, passwordHash);

    const { token: refreshToken } = await createSession(user.id);
    const accessToken = generateAccessToken(user.id);

    const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    res.cookie('refreshToken', refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: getSafeUserResponse(user),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.validatedBody;

    const user = await findUserByIdentifier(identifier);
    if (!user) {
      return res.status(401).json({
        error: {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        },
      });
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        },
      });
    }

    const banCheck = await checkUserBanStatus(user);
    if (banCheck.banned) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_BANNED',
          message: banCheck.message,
        },
      });
    }

    const { token: refreshToken } = await createSession(user.id);
    const accessToken = generateAccessToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: getSafeUserResponse(user),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(200).json({
        authenticated: false,
        user: null,
        accessToken: null,
      });
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const session = await findValidSession(tokenHash);

    if (!session) {
      res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
      return res.status(200).json({
        authenticated: false,
        user: null,
        accessToken: null,
      });
    }

    const banCheck = await checkUserBanStatus(session.user);
    if (banCheck.banned) {
      await revokeSession(session.id);
      res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
      return res.status(200).json({
        authenticated: false,
        user: null,
        accessToken: null,
      });
    }

    const newSession = await rotateSession(session.id, session.userId);

    res.cookie('refreshToken', newSession.token, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const accessToken = generateAccessToken(session.userId);

    res.json({
      authenticated: true,
      user: getSafeUserResponse(session.user),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const session = await findValidSession(tokenHash);
      if (session) {
        await revokeSession(session.id);
      }
    }

    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    res.json({
      user: getSafeUserResponse(req.user),
    });
  } catch (error) {
    next(error);
  }
}

async function generateUniqueUsername(base) {
  const cleaned =
    String(base || 'pirate')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 14) || 'pirate';

  const baseName = cleaned.length >= 3 ? cleaned : `${cleaned}99`;
  const existing = await prisma.user.findUnique({ where: { username: baseName } });
  if (!existing) return baseName;

  for (let i = 0; i < 10; i++) {
    const candidate = `${baseName.slice(0, 15)}_${Math.floor(100 + Math.random() * 900)}`;
    const taken = await prisma.user.findUnique({ where: { username: candidate } });
    if (!taken) return candidate;
  }
  return `pirate_${crypto.randomBytes(3).toString('hex')}`;
}

export async function googleAuth(req, res, next) {
  try {
    const { credential } = req.validatedBody;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        error: { code: 'CONFIG_ERROR', message: 'Google Auth is not configured on server' },
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!email || !payload?.email_verified) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Verified Google email is required' },
      });
    }

    if (!email.endsWith('@gmail.com')) {
      return res.status(403).json({
        error: { code: 'VALIDATION_ERROR', message: 'Only @gmail.com accounts are allowed' },
      });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const username = await generateUniqueUsername(email.split('@')[0]);
      const randomPasswordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
      user = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash: randomPasswordHash,
          role: 'USER',
        },
      });
    }

    const banCheck = await checkUserBanStatus(user);
    if (banCheck.banned) {
      return res.status(403).json({
        error: { code: 'ACCOUNT_BANNED', message: banCheck.message },
      });
    }

    const { token: refreshToken } = await createSession(user.id);
    const accessToken = generateAccessToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: getSafeUserResponse(user),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeEmail(req, res, next) {
  try {
    const { newEmail, currentPassword } = req.validatedBody;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: { code: ErrorCode.INVALID_CREDENTIALS, message: 'Current password is incorrect' },
      });
    }

    if (user.email === newEmail) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'New email is the same as your current email' },
      });
    }

    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) {
      return res.status(409).json({
        error: { code: ErrorCode.CONFLICT, message: 'This Gmail is already in use' },
      });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { email: newEmail },
    });

    res.json({ user: getSafeUserResponse(updated) });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.validatedBody;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: { code: ErrorCode.INVALID_CREDENTIALS, message: 'Current password is incorrect' },
      });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke old sessions and issue fresh session for current device
    await revokeAllSessions(user.id);
    const { token: refreshToken } = await createSession(user.id);
    const accessToken = generateAccessToken(user.id);

    res.cookie('refreshToken', refreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ message: 'Password updated successfully', accessToken });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, avatarUrl: true },
    });

    if (!user) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    if (user.avatarUrl) {
      await deleteLocalAvatar(user.avatarUrl);
    }

    await prisma.user.delete({ where: { id: user.id } });
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}