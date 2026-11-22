import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
    listProblems,
    getProblem,
    createProblem,
    updateProblem,
    deleteProblem,
    generateOutput,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/problems', listProblems);
router.post('/problems', createProblem);
router.post('/problems/generate-output', generateOutput);
router.get('/problems/:id', getProblem);
router.put('/problems/:id', updateProblem);
router.delete('/problems/:id', deleteProblem);

export default router;