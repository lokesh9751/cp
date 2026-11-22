import { ErrorCode, HttpStatus } from '../constants/enums.js';

/**
 * Centralized error handling middleware
 * @param {Error} err - Error object
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {Function} next - Express next function
 */
export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);

  // Handle Prisma unique constraint violations
  if (err.code === 'P2002' || err.code === 'P2003') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(HttpStatus.CONFLICT).json({
      error: {
        code: ErrorCode.CONFLICT,
        message: `This ${field} is already in use.`,
        fieldErrors: { [field]: [`A different ${field} is already registered.`] },
      },
    });
  }

  // Handle Prisma record not found
  if (err.code === 'P2025') {
    return res.status(HttpStatus.NOT_FOUND).json({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Resource not found',
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(HttpStatus.UNAUTHORIZED).json({
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Invalid or expired token',
      },
    });
  }

  // Handle Zod validation errors (should be caught by validate middleware)
  // These shouldn't reach here, but just in case
  if (err.name === 'ZodError') {
    const fieldErrors = {};
    err.errors.forEach((error) => {
      const field = error.path[0] || 'root';
      if (!fieldErrors[field]) {
        fieldErrors[field] = [];
      }
      fieldErrors[field].push(error.message);
    });

    return res.status(HttpStatus.BAD_REQUEST).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Please check the highlighted fields.',
        fieldErrors,
      },
    });
  }

  // Default to internal server error
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  });
}

/**
 * Health check error handler
 */
export function healthCheckErrorHandler(err, req, res, next) {
  return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Database connection unavailable',
    },
  });
}