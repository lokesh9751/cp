import { prisma } from '../lib/prisma.js';

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listAdminContests() {
  const contests = await prisma.contest.findMany({
    orderBy: { startsAt: 'desc' },
    include: {
      _count: {
        select: { contestProblems: true, registrations: true, submissions: true },
      },
    },
  });

  return contests.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    type: c.type,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    durationMinutes: c.durationMinutes,
    problemCount: c._count.contestProblems,
    registrationCount: c._count.registrations,
    submissionCount: c._count.submissions,
  }));
}

export async function getAdminContestById(id) {
  const contestId = Number(id);
  if (!Number.isInteger(contestId)) return null;

  const c = await prisma.contest.findUnique({
    where: { id: contestId },
    include: {
      contestProblems: {
        orderBy: { order: 'asc' },
        include: {
          problem: { select: { id: true, slug: true, title: true, difficulty: true } },
        },
      },
    },
  });

  if (!c) return null;

  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    type: c.type,
    description: c.description || '',
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    durationMinutes: c.durationMinutes,
    problems: c.contestProblems.map((cp) => ({
      problemId: cp.problemId,
      slug: cp.problem.slug,
      title: cp.problem.title,
      difficulty: cp.problem.difficulty,
      order: cp.order,
      points: cp.points ?? 100,
    })),
  };
}

export async function createAdminContest(payload) {
  const slug = slugify(payload.slug || payload.title);
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(startsAt.getTime() + payload.durationMinutes * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    return tx.contest.create({
      data: {
        title: payload.title.trim(),
        slug,
        type: payload.type,
        description: payload.description || null,
        startsAt,
        endsAt,
        durationMinutes: payload.durationMinutes,
        contestProblems: {
          create: payload.problems.map((p, idx) => ({
            problemId: p.problemId,
            order: idx + 1,
            points: p.points ?? 100,
          })),
        },
      },
    });
  });
}

export async function updateAdminContest(id, payload) {
  const contestId = Number(id);
  if (!Number.isInteger(contestId)) return null;

  const existing = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!existing) return null;

  const slug = slugify(payload.slug || payload.title);
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(startsAt.getTime() + payload.durationMinutes * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    await tx.contestProblem.deleteMany({ where: { contestId } });

    return tx.contest.update({
      where: { id: contestId },
      data: {
        title: payload.title.trim(),
        slug,
        type: payload.type,
        description: payload.description || null,
        startsAt,
        endsAt,
        durationMinutes: payload.durationMinutes,
        contestProblems: {
          create: payload.problems.map((p, idx) => ({
            problemId: p.problemId,
            order: idx + 1,
            points: p.points ?? 100,
          })),
        },
      },
    });
  });
}

export async function deleteAdminContest(id) {
  const contestId = Number(id);
  if (!Number.isInteger(contestId)) return null;

  const existing = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!existing) return null;

  await prisma.contest.delete({ where: { id: contestId } });
  return { deletedId: contestId };
}
