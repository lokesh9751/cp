import { z } from 'zod';
import { ErrorCode } from '../constants/enums.js';

/**
 * Middleware to validate request body against a Zod schema
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 */
export function validateBody(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const fieldErrors = {};
        result.error.errors.forEach((error) => {
          const field = error.path[0] || 'root';
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(error.message);
        });

        return res.status(400).json({
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Please check the highlighted fields.',
            fieldErrors,
          },
        });
      }

      req.validatedBody = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to validate request parameters
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 */
export function validateParams(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const fieldErrors = {};
        result.error.errors.forEach((error) => {
          const field = error.path[0] || 'root';
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(error.message);
        });

        return res.status(400).json({
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Please check the highlighted fields.',
            fieldErrors,
          },
        });
      }

      req.validatedParams = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to validate request query parameters
 * @param {z.ZodSchema} schema - Zod validation schema
 * @returns {Function} Express middleware
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const fieldErrors = {};
        result.error.errors.forEach((error) => {
          const field = error.path[0] || 'root';
          if (!fieldErrors[field]) {
            fieldErrors[field] = [];
          }
          fieldErrors[field].push(error.message);
        });

        return res.status(400).json({
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Please check the highlighted fields.',
            fieldErrors,
          },
        });
      }

      req.validatedQuery = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}