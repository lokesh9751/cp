import { prisma } from '../lib/prisma.js';
import { ReactionType } from '../constants/enums.js';

export async function getContests(userId = null) {
  const now = new Date();

  const [activeContests, pastContests] = await Promise.all([
    prisma.contest.findMany({
      where: { endsAt: { gt: now } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { registrations: true, contestProblems: true } } },
    }),
    prisma.contest.findMany({
      where: { endsAt: { lte: now } },
      orderBy: [{ endsAt: 'desc' }],
      take: 15,
      include: { _count: { select: { registrations: true, contestProblems: true } } },
    }),
  ]);

  const contests = [...activeContests, ...pastContests];
  const contestIds = contests.map((c) => c.id);

  const [allReactions, userRegistrations] = await Promise.all([
    prisma.contestReaction.findMany({
      where: { contestId: { in: contestIds } },
      select: { contestId: true, reaction: true, userId: true },
    }),
    userId
      ? prisma.contestRegistration.findMany({
        where: { userId, contestId: { in: contestIds } },
        select: { contestId: true },
      })
      : Promise.resolve([]),
  ]);

  const reactionsByContest = new Map();
  for (const r of allReactions) {
    if (!reactionsByContest.has(r.contestId)) reactionsByContest.set(r.contestId, []);
    reactionsByContest.get(r.contestId).push(r);
  }

  const registeredSet = new Set(userRegistrations.map((r) => r.contestId));

  const ongoing = [];
  const upcoming = [];
  const past = [];

  for (const contest of contests) {
    const reactions = reactionsByContest.get(contest.id) || [];
    const dto = {
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      type: contest.type,
      division: contest.division,
      startsAt: contest.startsAt,
      endsAt: contest.endsAt,
      durationMinutes: contest.durationMinutes,
      participantCount: contest._count.registrations,
      problemCount: contest._count.contestProblems,
      isRegistered: registeredSet.has(contest.id),
      likesCount: reactions.filter((r) => r.reaction === 'LIKE').length,
      dislikesCount: reactions.filter((r) => r.reaction === 'DISLIKE').length,
    };

    if (contest.endsAt <= now) {
      past.push(dto);
    } else if (contest.startsAt <= now) {
      ongoing.push(dto);
    } else {
      upcoming.push(dto);
    }
  }

  return { ongoing, upcoming, past, serverTime: now };
}

export async function getContest(slug, userId = null) {
  const contest = await prisma.contest.findUnique({
    where: { slug },
    include: {
      contestProblems: {
        orderBy: { order: 'asc' },
        include: {
          problem: { select: { id: true, slug: true, title: true, difficulty: true } },
        },
      },
      _count: {
        select: { registrations: true, reactions: true, submissions: true },
      },
    },
  });

  if (!contest) return null;

  const reactions = await prisma.contestReaction.findMany({
    where: { contestId: contest.id },
    select: { reaction: true, userId: true },
  });

  const likesCount = reactions.filter((r) => r.reaction === 'LIKE').length;
  const dislikesCount = reactions.filter((r) => r.reaction === 'DISLIKE').length;

  let isRegistered = false;
  let userReaction = null;
  let isStaff = false;
  const userProblemStats = new Map();

  if (userId) {
    const [reg, userRow, userSubs] = await Promise.all([
      prisma.contestRegistration.findUnique({
        where: { userId_contestId: { userId, contestId: contest.id } },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
      prisma.submission.findMany({
        where: { userId, contestId: contest.id },
        orderBy: { createdAt: 'asc' },
        select: { problemId: true, status: true, createdAt: true },
      }),
    ]);

    isRegistered = !!reg;
    isStaff = userRow?.role === 'ADMIN' || userRow?.role === 'SUPERUSER';
    const rRow = reactions.find((r) => r.userId === userId);
    userReaction = rRow ? rRow.reaction : null;

    const startMs = new Date(contest.startsAt).getTime();
    for (const sub of userSubs) {
      if (!userProblemStats.has(sub.problemId)) {
        userProblemStats.set(sub.problemId, { solved: false, wrongAttempts: 0, solveTimeSeconds: null });
      }
      const stat = userProblemStats.get(sub.problemId);
      if (stat.solved) continue;
      if (sub.status === 'ACCEPTED') {
        stat.solved = true;
        stat.solveTimeSeconds = Math.max(0, Math.floor((new Date(sub.createdAt).getTime() - startMs) / 1000));
      } else if (sub.status !== 'PENDING' && sub.status !== 'RUNNING') {
        stat.wrongAttempts += 1;
      }
    }
  }

  const now = new Date();
  const isUpcoming = now < contest.startsAt;
  const isOngoing = now >= contest.startsAt && now < contest.endsAt;
  const isEnded = now >= contest.endsAt;

  // Upcoming: ALWAYS hidden on public contest page (admins edit in /admin/contests)
  // Ongoing: visible if registered OR if it's an OPEN division contest
  // Ended: visible to everyone for upsolving
  const canViewProblems =
    !isUpcoming && (isEnded || (isOngoing && (isRegistered || contest.division === 'OPEN')));
  const problems = canViewProblems
    ? contest.contestProblems.map((cp, idx) => {
      const st = userProblemStats.get(cp.problemId) || {
        solved: false,
        wrongAttempts: 0,
        solveTimeSeconds: null,
      };
      return {
        id: cp.problem.id,
        slug: cp.problem.slug,
        title: cp.problem.title,
        difficulty: cp.problem.difficulty,
        label: String.fromCharCode(65 + idx),
        order: cp.order,
        points: cp.points ?? 100,
        solved: st.solved,
        wrongAttempts: st.wrongAttempts,
        solveTimeSeconds: st.solveTimeSeconds,
      };
    })
    : [];

  return {
    id: contest.id,
    slug: contest.slug,
    title: contest.title,
    type: contest.type,
    division: contest.division,
    description: contest.description,
    uploadedAt: contest.uploadedAt,
    startsAt: contest.startsAt,
    endsAt: contest.endsAt,
    durationMinutes: contest.durationMinutes,
    participantCount: contest._count.registrations,
    submissionCount: contest._count.submissions,
    isRegistered,
    likesCount,
    dislikesCount,
    userReaction,
    problems,
    serverTime: now,
  };
}

export async function registerForContest(userId, slug) {
  const contest = await prisma.contest.findUnique({
    where: { slug },
    select: { id: true, endsAt: true },
  });

  if (!contest) return null;

  const now = new Date();
  // Allow registration during upcoming AND ongoing contest; close only after contest ends
  if (now >= contest.endsAt) {
    return { closed: true };
  }

  await prisma.contestRegistration.upsert({
    where: { userId_contestId: { userId, contestId: contest.id } },
    update: {},
    create: { userId, contestId: contest.id },
  });

  return { slug, isRegistered: true };
}

export async function toggleContestReaction(userId, slug, reaction) {
  const contest = await prisma.contest.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!contest) return null;

  const reactionType = reaction === 'LIKE' ? ReactionType.LIKE : ReactionType.DISLIKE;
  let likesCount = 0;
  let dislikesCount = 0;
  let userReaction = null;

  await prisma.$transaction(async (tx) => {
    const existing = await tx.contestReaction.findUnique({
      where: { userId_contestId: { userId, contestId: contest.id } },
    });

    if (existing) {
      if (existing.reaction === reactionType) {
        await tx.contestReaction.delete({ where: { userId_contestId: { userId, contestId: contest.id } } });
        userReaction = null;
      } else {
        await tx.contestReaction.update({
          where: { userId_contestId: { userId, contestId: contest.id } },
          data: { reaction: reactionType },
        });
        userReaction = reactionType;
      }
    } else {
      await tx.contestReaction.create({
        data: { userId, contestId: contest.id, reaction: reactionType },
      });
      userReaction = reactionType;
    }

    const reactions = await tx.contestReaction.findMany({
      where: { contestId: contest.id },
      select: { reaction: true },
    });

    likesCount = reactions.filter((r) => r.reaction === 'LIKE').length;
    dislikesCount = reactions.filter((r) => r.reaction === 'DISLIKE').length;
  });

  return { slug, likesCount, dislikesCount, userReaction };
}