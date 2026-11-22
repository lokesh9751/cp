import { prisma } from '../lib/prisma.js';
import { executeSingle, normalizeOutput } from '../lib/codeRunner.js';

async function recalculateAcceptanceRate(problemId) {
    const [totalCount, acceptedCount] = await Promise.all([
        prisma.submission.count({ where: { problemId } }),
        prisma.submission.count({ where: { problemId, status: 'ACCEPTED' } }),
    ]);

    const rate = totalCount > 0 ? Number(((acceptedCount / totalCount) * 100).toFixed(1)) : 0;
    await prisma.problem.update({
        where: { id: problemId },
        data: { acceptanceRate: rate },
    });
}

/**
 * Run code against sample test cases or custom input (does NOT save a Submission)
 */
export async function runProblemCode({ slug, language, code, customInput }) {
    const problem = await prisma.problem.findUnique({
        where: { slug },
        include: {
            testCases: {
                where: { isSample: true },
                orderBy: { order: 'asc' },
            },
        },
    });

    if (!problem) return null;

    // Custom input mode
    if (typeof customInput === 'string' && customInput.length > 0) {
        const userRes = await executeSingle({
            language,
            code,
            stdin: customInput,
            expectedOutput: null,
            timeLimitMs: problem.timeLimitMs,
            memoryLimitKb: problem.memoryLimitKb,
        });

        let expectedOutput = null;
        let verdict = userRes.verdict;

        if (problem.referenceCode && problem.referenceLang) {
            try {
                const refRes = await executeSingle({
                    language: problem.referenceLang,
                    code: problem.referenceCode,
                    stdin: customInput,
                    expectedOutput: null,
                    timeLimitMs: problem.timeLimitMs,
                    memoryLimitKb: problem.memoryLimitKb,
                });

                if (refRes.verdict === 'EXECUTED') {
                    expectedOutput = refRes.stdout;
                    if (userRes.verdict === 'EXECUTED') {
                        verdict =
                            normalizeOutput(userRes.stdout) === normalizeOutput(expectedOutput)
                                ? 'ACCEPTED'
                                : 'WRONG_ANSWER';
                    }
                }
            } catch {
                // Ignore reference run failure on invalid custom input
            }
        }

        return {
            mode: 'custom',
            verdict,
            stdout: userRes.stdout,
            expectedOutput,
            errorOutput: userRes.errorOutput,
            runtimeMs: userRes.runtimeMs,
            memoryKb: userRes.memoryKb,
        };
    }

    // Sample test cases mode
    const cases = problem.testCases;
    const results = [];
    let maxRuntimeMs = 0;
    let maxMemoryKb = 0;

    for (let i = 0; i < cases.length; i++) {
        const tc = cases[i];
        const res = await executeSingle({
            language,
            code,
            stdin: tc.input,
            expectedOutput: tc.expectedOutput,
            timeLimitMs: problem.timeLimitMs,
            memoryLimitKb: problem.memoryLimitKb,
        });

        if (res.runtimeMs != null) maxRuntimeMs = Math.max(maxRuntimeMs, res.runtimeMs);
        if (res.memoryKb != null) maxMemoryKb = Math.max(maxMemoryKb, res.memoryKb);

        results.push({
            index: i + 1,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: res.stdout,
            verdict: res.verdict,
            errorOutput: res.errorOutput,
            runtimeMs: res.runtimeMs,
            memoryKb: res.memoryKb,
        });

        if (res.verdict === 'COMPILATION_ERROR') {
            break;
        }
    }

    const overallVerdict =
        results.find((r) => r.verdict !== 'ACCEPTED')?.verdict || 'ACCEPTED';

    return {
        mode: 'sample',
        verdict: overallVerdict,
        runtimeMs: maxRuntimeMs || null,
        memoryKb: maxMemoryKb || null,
        results,
    };
}

/**
 * Submit code against all test cases (sample + hidden) and persist Submission
 */
export async function createSubmission({ userId, slug, language, code, contestId = null }) {
    const problem = await prisma.problem.findUnique({
        where: { slug },
        include: {
            testCases: {
                orderBy: { order: 'asc' },
            },
        },
    });

    if (!problem) return null;

    const submission = await prisma.submission.create({
        data: {
            userId,
            problemId: problem.id,
            contestId: contestId != null ? Number(contestId) : null,
            language,
            code,
            status: 'RUNNING',
        },
    });

    let finalStatus = 'ACCEPTED';
    let maxRuntimeMs = 0;
    let maxMemoryKb = 0;
    let passedCount = 0;

    for (const tc of problem.testCases) {
        const res = await executeSingle({
            language,
            code,
            stdin: tc.input,
            expectedOutput: tc.expectedOutput,
            timeLimitMs: problem.timeLimitMs,
            memoryLimitKb: problem.memoryLimitKb,
        });

        if (res.runtimeMs != null) maxRuntimeMs = Math.max(maxRuntimeMs, res.runtimeMs);
        if (res.memoryKb != null) maxMemoryKb = Math.max(maxMemoryKb, res.memoryKb);

        if (res.verdict === 'ACCEPTED') {
            passedCount += 1;
        } else {
            finalStatus = res.verdict;
            break;
        }
    }

    const updated = await prisma.submission.update({
        where: { id: submission.id },
        data: {
            status: finalStatus,
            runtimeMs: maxRuntimeMs || null,
            memoryKb: maxMemoryKb || null,
        },
    });

    await recalculateAcceptanceRate(problem.id);

    return {
        submission: updated,
        passedCount,
        totalCount: problem.testCases.length,
    };
}

export async function getSubmissionById(id, userId) {
    const submissionId = Number(id);
    if (!Number.isInteger(submissionId)) return null;

    const sub = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
            problem: {
                select: { slug: true, title: true, acceptanceRate: true },
            },
        },
    });

    if (!sub) return null;
    if (sub.userId !== userId) return 'FORBIDDEN';
    return sub;
}

export async function listProblemSubmissions(slug, userId) {
    const problem = await prisma.problem.findUnique({
        where: { slug },
        select: { id: true },
    });
    if (!problem) return null;

    return prisma.submission.findMany({
        where: { problemId: problem.id, userId },
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
            id: true,
            language: true,
            status: true,
            runtimeMs: true,
            memoryKb: true,
            code: true,
            createdAt: true,
        },
    });
}