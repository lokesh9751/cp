// Re-export Prisma enums for use in application code
export { Role, ProblemType, Difficulty, ProblemStatus, ReactionType } from '@prisma/client';

// Token types
export const TokenType = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

// HTTP Status Codes
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Error codes
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

// Token settings
export const TokenSettings = {
  ACCESS_TOKEN_LIFETIME_MINUTES: 15,
  REFRESH_TOKEN_LIFETIME_DAYS: 7,
};