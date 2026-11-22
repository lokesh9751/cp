import {
  getProblems,
  toggleBookmark,
} from '../services/problems.service.js';
import { ErrorCode } from '../constants/enums.js';

/**
 * GET /api/problems
 * List problems with filtering and pagination
 */
export async function listProblems(req, res, next) {
  try {
    const userId = req.user?.id || null;

    const result = await getProblems({
      type: req.validatedQuery?.type,
      search: req.validatedQuery?.search,
      difficulty: req.validatedQuery?.difficulty,
      topicSlug: req.validatedQuery?.topic,
      status: req.validatedQuery?.status,
      page: req.validatedQuery?.page ?? 1,
      limit: req.validatedQuery?.limit ?? 10,
      userId,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/problems/:slug/bookmark
 * Toggle bookmark for a problem
 */
export async function toggleProblemBookmark(req, res, next) {
  try {
    const userId = req.user.id;
    const { slug } = req.validatedParams;

    const result = await toggleBookmark(userId, slug);

    if (!result) {
      return res.status(404).json({
        error: {
          code: ErrorCode.NOT_FOUND,
          message: 'Problem not found',
        },
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}