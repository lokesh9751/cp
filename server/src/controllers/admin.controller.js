import { z } from 'zod';
import {
    listAdminProblems,
    getAdminProblemById,
    createAdminProblem,
    updateAdminProblem,
    deleteAdminProblem,
    generateExpectedOutput,
} from '../services/admin.service.js';

const testCaseSchema = z.object({
    input: z.string(),
    expectedOutput: z.string(),
    isSample: z.boolean().default(false),
});

const problemPayloadSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(150),
    slug: z.string().max(160).optional().default(''),
    type: z.enum(['DSA', 'CP']).default('DSA'),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('EASY'),
    statement: z.string().min(10, 'Problem statement is required'),
    constraints: z.string().optional().default(''),
    timeLimitMs: z.coerce.number().int().min(200).max(15000).default(2000),
    memoryLimitKb: z.coerce.number().int().min(16384).max(1048576).default(262144),
    topics: z.array(z.string()).default([]),
    starterCode: z
        .object({
            cpp: z.string().default(''),
            python: z.string().default(''),
            java: z.string().default(''),
            javascript: z.string().default(''),
        })
        .default({ cpp: '', python: '', java: '', javascript: '' }),
    referenceCode: z.string().optional().default(''),
    referenceLang: z.enum(['cpp', 'python', 'java', 'javascript']).default('cpp'),
    testCases: z.array(testCaseSchema).min(1, 'At least 1 test case is required'),
});

const generateOutputSchema = z.object({
    language: z.enum(['cpp', 'python', 'java', 'javascript']),
    code: z.string().min(1, 'Reference code is required'),
    input: z.string(),
    timeLimitMs: z.coerce.number().int().min(200).max(15000).optional(),
    memoryLimitKb: z.coerce.number().int().min(16384).max(1048576).optional(),
});

function formatZodError(err) {
    const first = err.issues?.[0];
    return first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid input';
}

export async function listProblems(req, res, next) {
    try {
        const problems = await listAdminProblems();
        res.json({ problems });
    } catch (err) {
        next(err);
    }
}

export async function getProblem(req, res, next) {
    try {
        const problem = await getAdminProblemById(req.params.id);
        if (!problem) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Problem not found' },
            });
        }
        res.json({ problem });
    } catch (err) {
        next(err);
    }
}

export async function createProblem(req, res, next) {
    try {
        const parsed = problemPayloadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: formatZodError(parsed.error) },
            });
        }
        const problem = await createAdminProblem(parsed.data);
        res.status(201).json({ problem });
    } catch (err) {
        if (err?.code === 'P2002') {
            return res.status(409).json({
                error: { code: 'CONFLICT', message: 'A problem with this slug already exists.' },
            });
        }
        next(err);
    }
}

export async function updateProblem(req, res, next) {
    try {
        const parsed = problemPayloadSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: formatZodError(parsed.error) },
            });
        }
        const problem = await updateAdminProblem(req.params.id, parsed.data);
        if (!problem) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Problem not found' },
            });
        }
        res.json({ problem });
    } catch (err) {
        if (err?.code === 'P2002') {
            return res.status(409).json({
                error: { code: 'CONFLICT', message: 'Another problem already uses this slug.' },
            });
        }
        next(err);
    }
}

export async function deleteProblem(req, res, next) {
    try {
        const result = await deleteAdminProblem(req.params.id);
        if (!result) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Problem not found' },
            });
        }
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function generateOutput(req, res, next) {
    try {
        const parsed = generateOutputSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: formatZodError(parsed.error) },
            });
        }
        const result = await generateExpectedOutput(parsed.data);
        res.json(result);
    } catch (err) {
        next(err);
    }
}