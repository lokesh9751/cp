import { hashPassword, comparePassword, findUserByIdentifier, findUserById, createUser, createSession, findValidSession, getSafeUserResponse } from '../services/auth.service.js';
import { generateAccessToken } from '../lib/jwt.js';
import { ErrorCode } from '../constants/enums.js';

/**
 * Handle user signup
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 */
export async function signup(req, res, next) {
  try {
    const { username, email, password } = req.validatedBody;

    // Check if username already exists
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

    // Check if email already exists
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

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser(username, email, passwordHash);

    // Create session
    const { token: refreshToken, sessionId } = await createSession(user.id);
    const accessToken = generateAccessToken(user.id);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      user: getSafeUserResponse(user),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle user login
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 */
export async function login(req, res, next) {
  try {
    const { identifier, password } = req.validatedBody;

    // Find user by email or username
    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return res.status(401).json({
        error: {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        },
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid credentials',
        },
      });
    }

    // Create session
    const { token: refreshToken, sessionId } = await createSession(user.id);
    const accessToken = generateAccessToken(user.id);

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: getSafeUserResponse(user),
      accessToken,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle token refresh
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 */
export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      // Guest session - no refresh token means not authenticated
      return res.status(200).json({
        authenticated: false,
        user: null,
        accessToken: null,
      });
    }

    // Hash the provided token to compare with stored hash
    const crypto = await import('crypto');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find valid session
    const session = await findValidSession(tokenHash);

    if (!session) {
      // Guest session - invalid or expired session
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth',
      });

      return res.status(200).json({
        authenticated: false,
        user: null,
        accessToken: null,
      });
    }

    // Rotate the refresh token
    const { service: rotateSession } = await import('../services/auth.service.js');
    const newSession = await rotateSession(session.id, session.userId);

    // Set new refresh token cookie
    res.cookie('refreshToken', newSession.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

/**
 * Handle logout
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 */
export async function logout(req, res, next) {
  try {
    // Clear refresh token from database if session exists
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      const session = await import('../services/auth.service.js').then(m => m.findValidSession(tokenHash));

      if (session) {
        await import('../services/auth.service.js').then(m => m.revokeSession(session.id));
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 */
export async function me(req, res, next) {
  try {
    // req.user is set by requireAuth middleware
    const user = req.user;

    res.json({
      user: getSafeUserResponse(user),
    });
  } catch (error) {
    next(error);
  }
}