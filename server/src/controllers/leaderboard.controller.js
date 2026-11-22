import { prisma } from '../lib/prisma.js';

const WRONG_PENALTY_SECONDS = 5 * 60; // 5 minutes per wrong attempt before AC

export async function computeContestLeaderboard(slug) {
  const contest = await prisma.contest.findUnique({
    where: { slug },
    include: {
      contestProblems: {
        orderBy: { order: 'asc' },
        include: {
          problem: { select: { id: true, slug: true, title: true, difficulty: true } },
        },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!contest) return null;

  if (!contest) return null;

  // Hide problem titles/analytics & standings before contest starts
  if (new Date() < new Date(contest.startsAt)) {
    return {
      contestId: contest.id,
      slug: contest.slug,
      title: contest.title,
      division: contest.division,
      participantCount: contest._count.registrations,
      startsAt: contest.startsAt,
      endsAt: contest.endsAt,
      locked: true,
      problems: [],
      problemAnalytics: [],
      standings: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const problemMeta = contest.contestProblems.map((cp, idx) => ({
    problemId: cp.problemId,
    slug: cp.problem.slug,
    title: cp.problem.title,
    difficulty: cp.problem.difficulty,
    label: String.fromCharCode(65 + idx),
    order: cp.order,
    points: cp.points ?? 100,
  }));

  const problemIds = problemMeta.map((p) => p.problemId);
  const pointsByProblem = new Map(problemMeta.map((p) => [p.problemId, p.points]));

  const submissions = await prisma.submission.findMany({
    where: {
      contestId: contest.id,
      problemId: { in: problemIds },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  const startMs = new Date(contest.startsAt).getTime();
  const byUser = new Map();
  const problemTracking = new Map(
    problemMeta.map((pm) => [
      pm.problemId,
      {
        totalAttempts: 0,
        solvers: [], // { userId, username, solveTimeSeconds, runtimeMs, language }
      },
    ])
  );

  for (const sub of submissions) {
    const tracker = problemTracking.get(sub.problemId);
    if (tracker && sub.status !== 'PENDING' && sub.status !== 'RUNNING') {
      tracker.totalAttempts += 1;
    }

    if (!byUser.has(sub.userId)) {
      byUser.set(sub.userId, {
        userId: sub.userId,
        username: sub.user.username,
        avatarUrl: sub.user.avatarUrl || null,
        totalPoints: 0,
        solvedCount: 0,
        totalTimeSeconds: 0,
        lastAcceptedAt: null,
        problemStats: {},
      });
    }

    const entry = byUser.get(sub.userId);
    if (!entry.problemStats[sub.problemId]) {
      entry.problemStats[sub.problemId] = {
        problemId: sub.problemId,
        solved: false,
        isFirstBlood: false,
        wrongAttempts: 0,
        solveTimeSeconds: null,
        language: null,
        runtimeMs: null,
        acceptedAt: null,
      };
    }

    const pStat = entry.problemStats[sub.problemId];
    if (pStat.solved) continue;

    if (sub.status === 'ACCEPTED') {
      const elapsedSec = Math.max(0, Math.floor((new Date(sub.createdAt).getTime() - startMs) / 1000));
      const pts = pointsByProblem.get(sub.problemId) ?? 100;
      const isFirstBlood = tracker ? tracker.solvers.length === 0 : false;

      pStat.solved = true;
      pStat.isFirstBlood = isFirstBlood;
      pStat.solveTimeSeconds = elapsedSec;
      pStat.language = sub.language;
      pStat.runtimeMs = sub.runtimeMs;
      pStat.acceptedAt = sub.createdAt;

      entry.solvedCount += 1;
      entry.totalPoints += pts;
      entry.totalTimeSeconds += elapsedSec + pStat.wrongAttempts * WRONG_PENALTY_SECONDS;
      entry.lastAcceptedAt = sub.createdAt;

      if (tracker) {
        tracker.solvers.push({
          userId: sub.userId,
          username: sub.user.username,
          solveTimeSeconds: elapsedSec,
          runtimeMs: sub.runtimeMs,
          language: sub.language,
        });
      }
    } else if (sub.status !== 'PENDING' && sub.status !== 'RUNNING') {
      pStat.wrongAttempts += 1;
    }
  }

  const problemAnalytics = problemMeta.map((pm) => {
    const tracker = problemTracking.get(pm.problemId);
    const solvers = tracker ? tracker.solvers : [];
    const totalAttempts = tracker ? tracker.totalAttempts : 0;
    const avgSolveTimeSeconds =
      solvers.length > 0
        ? Math.round(solvers.reduce((acc, s) => acc + s.solveTimeSeconds, 0) / solvers.length)
        : null;

    return {
      problemId: pm.problemId,
      label: pm.label,
      title: pm.title,
      points: pm.points,
      solvedCount: solvers.length,
      totalAttempts,
      acceptanceRate: totalAttempts > 0 ? Math.round((solvers.length / totalAttempts) * 100) : 0,
      firstBlood: solvers[0] || null,
      avgSolveTimeSeconds,
      fastestSolvers: solvers.slice(0, 5),
    };
  });

  const standings = Array.from(byUser.values())
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      return a.totalTimeSeconds - b.totalTimeSeconds;
    })
    .map((row, idx) => ({
      rank: idx + 1,
      userId: row.userId,
      username: row.username,
      avatarUrl: row.avatarUrl,
      totalPoints: row.totalPoints,
      solvedCount: row.solvedCount,
      totalTimeSeconds: row.totalTimeSeconds,
      problems: problemMeta.map((pm) => {
        const s = row.problemStats[pm.problemId];
        return (
          s || {
            problemId: pm.problemId,
            solved: false,
            isFirstBlood: false,
            wrongAttempts: 0,
            solveTimeSeconds: null,
            language: null,
            runtimeMs: null,
            acceptedAt: null,
          }
        );
      }),
    }));

  return {
    contestId: contest.id,
    slug: contest.slug,
    title: contest.title,
    division: contest.division,
    participantCount: contest._count.registrations,
    startsAt: contest.startsAt,
    endsAt: contest.endsAt,
    problems: problemMeta,
    problemAnalytics,
    standings,
    updatedAt: new Date().toISOString(),
  };
}

export async function getLeaderboardController(req, res, next) {
  try {
    const data = await computeContestLeaderboard(req.params.slug);
    if (!data) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contest not found' },
      });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function streamLeaderboardController(req, res, next) {
  try {
    const initial = await computeContestLeaderboard(req.params.slug);
    if (!initial) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Contest not found' },
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendSnapshot = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendSnapshot(initial);

    const interval = setInterval(async () => {
      try {
        const fresh = await computeContestLeaderboard(req.params.slug);
        if (fresh) sendSnapshot(fresh);
      } catch {
        // ignore transient errors on stream tick
      }
    }, 4000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } catch (err) {
    next(err);
  }
}