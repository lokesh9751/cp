import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import {
    runCode,
    submitCode,
    getSubmission,
    getMyProblemSubmissions,
    runOrSubmitSchema,
} from '../controllers/submissions.controller.js';

const router = express.Router();

router.post('/run', requireAuth, validateBody(runOrSubmitSchema), runCode);
router.post('/', requireAuth, validateBody(runOrSubmitSchema), submitCode);
router.get('/problem/:slug', requireAuth, getMyProblemSubmissions);
router.get('/:id', requireAuth, getSubmission);

export default router;