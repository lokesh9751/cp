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
} from '../services/auth.service.js';
import { generateAccessToken } from '../lib/jwt.js';
import { ErrorCode } from '../constants/enums.js';

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