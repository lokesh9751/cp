import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin, requireSuperuser } from '../middleware/requireAdmin.js';
import {
  listProblems,
  getProblem,
  createProblem,
  updateProblem,
  deleteProblem,
  generateOutput,
} from '../controllers/admin.controller.js';
import {
  listContestsAdmin,
  getContestAdmin,
  createContestAdmin,
  updateContestAdmin,
  deleteContestAdmin,
  createContestProblemAdmin,
} from '../controllers/adminContests.controller.js';
import { listUsers, updateUserRole } from '../controllers/superuser.controller.js';

const router = Router();

const judgeGenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many Judge0 generation requests. Wait a minute.' },
  },
});

// Superuser-only routes
router.get('/superuser/users', requireAuth, requireSuperuser, listUsers);
router.patch('/superuser/users/:id/role', requireAuth, requireSuperuser, updateUserRole);

// Admin & Superuser routes
router.use(requireAuth, requireAdmin);

// Problems
router.get('/problems', listProblems);
router.post('/problems', createProblem);
router.post('/problems/generate-output', judgeGenLimiter, generateOutput);
router.get('/problems/:id', getProblem);
router.put('/problems/:id', updateProblem);
router.delete('/problems/:id', deleteProblem);

// Contests
router.get('/contests', listContestsAdmin);
router.post('/contests', createContestAdmin);
router.get('/contests', listContestsAdmin);
router.post('/contests', createContestAdmin);
router.post('/contests/problems', createContestProblemAdmin);
router.get('/contests/:id', getContestAdmin);
router.put('/contests/:id', updateContestAdmin);
router.delete('/contests/:id', deleteContestAdmin);
router.get('/contests/:id', getContestAdmin);
router.put('/contests/:id', updateContestAdmin);
router.delete('/contests/:id', deleteContestAdmin);

export default router;
