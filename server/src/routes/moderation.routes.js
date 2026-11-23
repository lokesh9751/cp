import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    triggerContestFinalize,
    disqualifyParticipant,
    removeContestRating,
    updateUserBan,
    deleteUserAccount,
    toggleSuperuserStealth,
} from '../controllers/moderation.controller.js';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }
      let role = req.user.role;
      if (!role) {
        const dbUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { role: true },
        });
        role = dbUser?.role;
      }
      if (!role || !roles.includes(role)) {
        return res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

router.use(requireAuth);

// Admin & Superuser contest moderation
router.post('/contests/:contestId/finalize', requireRole('ADMIN', 'SUPERUSER'), triggerContestFinalize);
router.post('/contests/:contestId/disqualify', requireRole('ADMIN', 'SUPERUSER'), disqualifyParticipant);
router.delete('/contests/:contestId/ratings/:userId', requireRole('ADMIN', 'SUPERUSER'), removeContestRating);

// Superuser-only account moderation & stealth mode
router.patch('/users/:userId/ban', requireRole('SUPERUSER'), updateUserBan);
router.delete('/users/:userId', requireRole('SUPERUSER'), deleteUserAccount);
router.patch('/me/stealth', requireRole('SUPERUSER'), toggleSuperuserStealth);

export default router;