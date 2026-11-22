import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { TokenSettings, TokenType } from '../constants/enums.js';

/**
 * Generate an access token
 * @param {string} userId - User ID
 * @returns {string} JWT access token
 */
export function generateAccessToken(userId) {
  const payload = {
    sub: userId,
    type: TokenType.ACCESS,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, config.jwtAccessSecret, {
    algorithm: 'HS256',
    expiresIn: `${TokenSettings.ACCESS_TOKEN_LIFETIME_MINUTES}m`,
    issuer: 'competitive-pirates',
    audience: 'competitive-pirates-client',
  });
}

/**
 * Generate a refresh token
 * @param {string} userId - User ID
 * @param {string} sessionId - Session ID
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(userId, sessionId) {
  const payload = {
    sub: userId,
    sessionId,
    type: TokenType.REFRESH,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, config.jwtRefreshSecret, {
    algorithm: 'HS256',
    expiresIn: `${TokenSettings.REFRESH_TOKEN_LIFETIME_DAYS}d`,
    issuer: 'competitive-pirates',
    audience: 'competitive-pirates-client',
  });
}

/**
 * Verify and decode an access token
 * @param {string} token - JWT access token
 * @returns {object} Decoded token payload
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret, {
      algorithms: ['HS256'],
      issuer: 'competitive-pirates',
      audience: 'competitive-pirates-client',
    });

    if (decoded.type !== TokenType.ACCESS) {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify and decode a refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded token payload
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtRefreshSecret, {
      algorithms: ['HS256'],
      issuer: 'competitive-pirates',
      audience: 'competitive-pirates-client',
    });

    if (decoded.type !== TokenType.REFRESH) {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}