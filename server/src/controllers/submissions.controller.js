import { z } from 'zod';
import {
    runProblemCode,
    createSubmission,
    getSubmissionById,
    listProblemSubmissions,
} from '../services/submissions.service.js';
import { ErrorCode } from '../constants/enums.js';

export const runOrSubmitSchema = z.object({
    slug: z.string().min(1),
    language: z.enum(['cpp', 'python', 'java', 'javascript']),
    code: z.string().min(1, 'Code cannot be empty').max(65536, 'Code size limit exceeded (64KB)'),
    customInput: z.string().max(16384).optional(),
    contestId: z.coerce.number().int().optional().nullable(),
});

export async function runCode(req, res, next) {
    try {
        const result = await runProblemCode(req.validatedBody);
        if (!result) {
            return res.status(404).json({
                error: { code: ErrorCode.NOT_FOUND, message: 'Problem not found' },
            });
        }
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function submitCode(req, res, next) {
    try {
        const result = await createSubmission({
            userId: req.user.id,
            ...req.validatedBody,
        });
        if (!result) {
            return res.status(404).json({
                error: { code: ErrorCode.NOT_FOUND, message: 'Problem not found' },
            });
        }
        res.status(201).json(result);
    } catch (err) {
        next(err);
    }
}

export async function getSubmission(req, res, next) {
    try {
        const sub = await getSubmissionById(req.params.id, req.user.id);
        if (!sub) {
            return res.status(404).json({
                error: { code: ErrorCode.NOT_FOUND, message: 'Submission not found' },
            });
        }
        if (sub === 'FORBIDDEN') {
            return res.status(403).json({
                error: { code: ErrorCode.FORBIDDEN, message: 'Access denied' },
            });
        }
        res.json({ submission: sub });
    } catch (err) {
        next(err);
    }
}

export async function getMyProblemSubmissions(req, res, next) {
    try {
        const subs = await listProblemSubmissions(req.params.slug, req.user.id);
        if (!subs) {
            return res.status(404).json({
                error: { code: ErrorCode.NOT_FOUND, message: 'Problem not found' },
            });
        }
        res.json({ submissions: subs });
    } catch (err) {
        next(err);
    }
}