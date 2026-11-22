import express from 'express';
import { validateParams, validateBody } from '../middleware/validate.js';
import {
  listContests,
  getContestBySlug,
  registerForContestController,
  toggleContestReactionController,
} from '../controllers/contests.controller.js';
import { contestSlugSchema, registrationBodySchema, contestReactionSchema } from '../validators/contests.validator.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route GET /api/contests
 * @desc List all ongoing and upcoming contests
 * @access Public (with optional auth for personalized data)
 */
router.get('/', optionalAuth, listContests);

/**
 * @route GET /api/contests/:slug
 * @desc Get a single contest by slug
 * @access Public (with optional auth for personalized data)
 */
router.get('/:slug', optionalAuth, validateParams(contestSlugSchema), getContestBySlug);

/**
 * @route POST /api/contests/:slug/register
 * @desc Register for a contest
 * @access Private (requires authentication)
 */
router.post(
  '/:slug/register',
  requireAuth,
  validateParams(contestSlugSchema),
  validateBody(registrationBodySchema),
  registerForContestController
);

/**
 * @route POST /api/contests/:slug/reaction
 * @desc Toggle contest reaction (like/dislike)
 * @access Private (requires authentication)
 */
router.post(
  '/:slug/reaction',
  requireAuth,
  validateParams(contestSlugSchema),
  validateBody(contestReactionSchema),
  toggleContestReactionController
);

export default router;