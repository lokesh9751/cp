import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { ErrorCode } from '../constants/enums.js';
import { checkUserBanStatus } from '../services/auth.service.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Authentication required',
        },
      });
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'Invalid or expired token',
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        isBanned: true,
        bannedUntil: true,
        banReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: 'User not found',
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

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        avatarUrl: true,
        isBanned: true,
        bannedUntil: true,
        banReason: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (user) {
      const banCheck = await checkUserBanStatus(user);
      if (!banCheck.banned) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
} 