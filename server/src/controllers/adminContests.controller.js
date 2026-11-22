import { z } from 'zod';
import {
  listAdminContests,
  getAdminContestById,
  createAdminContest,
  updateAdminContest,
  deleteAdminContest,
  createContestProblem,
} from '../services/adminContests.service.js';

const contestPayloadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(150),
  slug: z.string().max(160).optional().default(''),
  type: z.enum(['DSA', 'CP']).default('DSA'),
  division: z.enum(['OPEN', 'DIV1', 'DIV2', 'DIV3']).default('OPEN'),
  description: z.string().optional().default(''),
  startsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid start date/time'),
  durationMinutes: z.coerce.number().int().min(10).max(10080).default(90),
  problems: z
    .array(
      z.object({
        problemId: z.coerce.number().int().positive(),
        points: z.coerce.number().int().min(10).max(5000).default(100),
      })
    )
    .min(1, 'Attach at least 1 problem to the contest'),
});

const contestProblemSchema = z.object({
  title: z.string().min(2, 'Problem title required').max(150),
  slug: z.string().max(160).optional().default(''),
  type: z.enum(['DSA', 'CP']).default('CP'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  isPublic: z.boolean().optional().default(false),
  statement: z.string().min(10, 'Problem statement must be at least 10 characters'),
  constraints: z.string().optional().default(''),
  timeLimitMs: z.coerce.number().int().min(250).max(10000).default(2000),
  memoryLimitKb: z.coerce.number().int().min(16384).max(1048576).default(262144),
  testCases: z
    .array(
      z.object({
        input: z.string(),
        expectedOutput: z.string().min(1, 'Expected output is required'),
        isSample: z.boolean().optional().default(false),
      })
    )
    .min(1, 'Add at least 1 test case'),
});

function formatZodError(err) {
  const first = err.issues?.[0];
  return first ? `${first.path.join('.') || 'body'}: ${first.message}` : 'Invalid input';
}

export async function listContestsAdmin(req, res, next) {
  try {
    const contests = await listAdminContests();
    res.json({ contests });
  } catch (err) {
    next(err);
  }
}

export async function getContestAdmin(req, res, next) {
  try {
    const contest = await getAdminContestById(req.params.id);
    if (!contest) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contest not found' },
      });
    }
    res.json({ contest });
  } catch (err) {
    next(err);
  }
}

export async function createContestProblemAdmin(req, res, next) {
  try {
    const parsed = contestProblemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: formatZodError(parsed.error) },
      });
    }
    const problem = await createContestProblem(parsed.data);
    res.status(201).json({ problem });
  } catch (err) {
    next(err);
  }
}

export async function createContestAdmin(req, res, next) {
  try {
    const parsed = contestPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: formatZodError(parsed.error) },
      });
    }
    const contest = await createAdminContest(parsed.data);
    res.status(201).json({ contest });
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'A contest with this slug already exists.' },
      });
    }
    next(err);
  }
}

export async function updateContestAdmin(req, res, next) {
  try {
    const parsed = contestPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: formatZodError(parsed.error) },
      });
    }
    const contest = await updateAdminContest(req.params.id, parsed.data);
    if (!contest) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contest not found' },
      });
    }
    res.json({ contest });
  } catch (err) {
    if (err?.code === 'P2002') {
      return res.status(409).json({
        error: { code: 'CONFLICT', message: 'Another contest already uses this slug.' },
      });
    }
    next(err);
  }
}

export async function deleteContestAdmin(req, res, next) {
  try {
    const result = await deleteAdminContest(req.params.id);
    if (!result) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contest not found' },
      });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}