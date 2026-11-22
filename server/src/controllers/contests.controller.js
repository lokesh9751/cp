import {
  getContests,
  getContest,
  registerForContest,
  toggleContestReaction,
} from '../services/contests.service.js';
import { ErrorCode } from '../constants/enums.js';

/**
 * GET /api/contests
 * List all ongoing and upcoming contests
 */
export async function listContests(req, res, next) {
  try {
    const userId = req.user?.id || null;

    const result = await getContests(userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/contests/:slug
 * Get a single contest by slug
 */
export async function getContestBySlug(req, res, next) {
  try {
    const userId = req.user?.id || null;
    const { slug } = req.validatedParams;

    const contest = await getContest(slug, userId);

    if (!contest) {
      return res.status(404).json({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Contest not found',
        },
      });
    }

    res.json(contest);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/contests/:slug/register
 * Register for a contest
 */
export async function registerForContestController(req, res, next) {
  try {
    const userId = req.user.id;
    const { slug } = req.validatedParams;

    const result = await registerForContest(userId, slug);

    if (!result) {
      return res.status(404).json({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Contest not found',
        },
      });
    }

    if (result.closed) {
      return res.status(400).json({
        error: {
          code: 'REGISTRATION_CLOSED',
          message: 'Contest has already started. Registration is closed.',
        },
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/contests/:slug/reaction
 * Toggle contest reaction (like/dislike)
 */
export async function toggleContestReactionController(req, res, next) {
  try {
    const userId = req.user.id;
    const { slug } = req.validatedParams;
    const { reaction } = req.validatedBody;

    const result = await toggleContestReaction(userId, slug, reaction);

    if (!result) {
      return res.status(404).json({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Contest not found',
        },
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}