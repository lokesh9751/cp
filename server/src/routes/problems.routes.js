import express from 'express';
import { validateParams, validateQuery } from '../middleware/validate.js';
import {
  listProblems,
  getProblem,
  toggleProblemBookmark,
} from '../controllers/problems.controller.js';
import { problemSlugSchema, problemsListSchema } from '../validators/problems.validator.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/problems
 * @desc List problems with filtering and pagination
 * @access Public (with optional auth for personalized data)
 */
router.get('/', optionalAuth, validateQuery(problemsListSchema), listProblems);

/**
 * @route GET /api/problems/:slug
 * @desc Get single problem details with sample test cases
 * @access Public (with optional auth for personalized status)
 */
router.get('/:slug', optionalAuth, validateParams(problemSlugSchema), getProblem);

/**
 * @route POST /api/problems/:slug/bookmark
 * @desc Toggle bookmark for a problem
 * @access Private (requires authentication)
 */
router.post(
  '/:slug/bookmark',
  requireAuth,
  validateParams(problemSlugSchema),
  toggleProblemBookmark
);

export default router;