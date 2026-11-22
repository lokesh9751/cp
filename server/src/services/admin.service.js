import { prisma } from '../lib/prisma.js';
import { executeSingle } from '../lib/codeRunner.js';

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function resolveTopicIds(tx, topicNames = []) {
    const cleaned = [...new Set(topicNames.map((t) => String(t).trim()).filter(Boolean))];
    const topicIds = [];

    for (const name of cleaned) {
        const slug = slugify(name);
        if (!slug) continue;
        const topic = await tx.topic.upsert({
            where: { slug },
            update: {},
            create: { name, slug },
        });
        topicIds.push(topic.id);
    }

    return topicIds;
}

export async function listAdminProblems() {
    const problems = await prisma.problem.findMany({
        orderBy: { id: 'desc' },
        include: {
            topics: { include: { topic: true } },
            _count: {
                select: { testCases: true, submissions: true },
            },
        },
    });

    return problems.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        type: p.type,
        difficulty: p.difficulty,
        acceptanceRate: p.acceptanceRate,
        testCaseCount: p._count.testCases,
        submissionCount: p._count.submissions,
        topics: p.topics.map((pt) => pt.topic.name),
        createdAt: p.createdAt,
    }));
}

export async function getAdminProblemById(id) {
    const problemId = Number(id);
    if (!Number.isInteger(problemId)) return null;

    const p = await prisma.problem.findUnique({
        where: { id: problemId },
        include: {
            topics: { include: { topic: true } },
            testCases: { orderBy: { order: 'asc' } },
        },
    });

    if (!p) return null;

    return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        type: p.type,
        difficulty: p.difficulty,
        statement: p.statement || '',
        constraints: p.constraints || '',
        starterCode: p.starterCode || { cpp: '', python: '', java: '', javascript: '' },
        referenceCode: p.referenceCode || '',
        referenceLang: p.referenceLang || 'cpp',
        timeLimitMs: p.timeLimitMs,
        memoryLimitKb: p.memoryLimitKb,
        topics: p.topics.map((pt) => pt.topic.name),
        testCases: p.testCases.map((tc) => ({
            id: tc.id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isSample: tc.isSample,
            order: tc.order,
        })),
    };
}

export async function createAdminProblem(payload) {
    const slug = slugify(payload.slug || payload.title);

    return prisma.$transaction(async (tx) => {
        const topicIds = await resolveTopicIds(tx, payload.topics);

        const created = await tx.problem.create({
            data: {
                title: payload.title.trim(),
                slug,
                type: payload.type,
                difficulty: payload.difficulty,
                statement: payload.statement,
                constraints: payload.constraints || null,
                starterCode: payload.starterCode,
                referenceCode: payload.referenceCode || null,
                referenceLang: payload.referenceLang || 'cpp',
                timeLimitMs: payload.timeLimitMs,
                memoryLimitKb: payload.memoryLimitKb,
                topics: {
                    create: topicIds.map((topicId) => ({ topicId })),
                },
                testCases: {
                    create: payload.testCases.map((tc, idx) => ({
                        input: tc.input,
                        expectedOutput: tc.expectedOutput,
                        isSample: Boolean(tc.isSample),
                        order: idx + 1,
                    })),
                },
            },
            include: {
                topics: { include: { topic: true } },
                testCases: { orderBy: { order: 'asc' } },
            },
        });

        return created;
    });
}

export async function updateAdminProblem(id, payload) {
    const problemId = Number(id);
    if (!Number.isInteger(problemId)) return null;

    const existing = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!existing) return null;

    const slug = slugify(payload.slug || payload.title);

    return prisma.$transaction(async (tx) => {
        const topicIds = await resolveTopicIds(tx, payload.topics);

        await tx.problemTopic.deleteMany({ where: { problemId } });
        await tx.testCase.deleteMany({ where: { problemId } });

        const updated = await tx.problem.update({
            where: { id: problemId },
            data: {
                title: payload.title.trim(),
                slug,
                type: payload.type,
                difficulty: payload.difficulty,
                statement: payload.statement,
                constraints: payload.constraints || null,
                starterCode: payload.starterCode,
                referenceCode: payload.referenceCode || null,
                referenceLang: payload.referenceLang || 'cpp',
                timeLimitMs: payload.timeLimitMs,
                memoryLimitKb: payload.memoryLimitKb,
                topics: {
                    create: topicIds.map((topicId) => ({ topicId })),
                },
                testCases: {
                    create: payload.testCases.map((tc, idx) => ({
                        input: tc.input,
                        expectedOutput: tc.expectedOutput,
                        isSample: Boolean(tc.isSample),
                        order: idx + 1,
                    })),
                },
            },
            include: {
                topics: { include: { topic: true } },
                testCases: { orderBy: { order: 'asc' } },
            },
        });

        return updated;
    });
}

export async function deleteAdminProblem(id) {
    const problemId = Number(id);
    if (!Number.isInteger(problemId)) return null;

    const existing = await prisma.problem.findUnique({ where: { id: problemId } });
    if (!existing) return null;

    await prisma.problem.delete({ where: { id: problemId } });
    return { deletedId: problemId };
}

export async function generateExpectedOutput({
    language,
    code,
    input,
    timeLimitMs = 2000,
    memoryLimitKb = 262144,
}) {
    const res = await executeSingle({
        language,
        code,
        stdin: input,
        expectedOutput: null,
        timeLimitMs,
        memoryLimitKb,
    });

    return {
        verdict: res.verdict,
        stdout: res.stdout || '',
        errorOutput: res.errorOutput || null,
        runtimeMs: res.runtimeMs,
        memoryKb: res.memoryKb,
    };
}