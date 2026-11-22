import { prisma } from '../lib/prisma.js';
import { ProblemType, ReactionType } from '../constants/enums.js';

/**
 * Get all contests (ongoing and upcoming only)
 * @param {string} userId - Optional user ID for personalized data
 * @returns {Promise<{ongoing: [], upcoming: [], serverTime: Date}>}
 */
export async function getContests(userId = null) {
  const now = new Date();

  // Get all upcoming and ongoing contests
  const contests = await prisma.contest.findMany({
    where: {
      OR: [
        { startsAt: { gt: now } }, // Upcoming
        {
          AND: [
            { startsAt: { lte: now } },
            { endsAt: { gt: now } },
          ],
        },
      ],
    },
    orderBy: [
      { startsAt: 'asc' },
      { id: 'asc' },
    ],
  });

  // Get reactions for all contests in one query
  const allReactions = await prisma.contestReaction.findMany({
    where: {
      contestId: { in: contests.map(c => c.id) },
    },
    select: {
      contestId: true,
      reaction: true,
      userId: true,
    },
  });

  // Group reactions by contest
  const reactionsByContest = new Map();
  allReactions.forEach(r => {
    if (!reactionsByContest.has(r.contestId)) {
      reactionsByContest.set(r.contestId, []);
    }
    reactionsByContest.get(r.contestId).push(r);
  });

  // Get user-specific data if authenticated
  const userRegistrations = userId
    ? await prisma.contestRegistration.findMany({
        where: { userId },
        select: { contestId: true },
      })
    : [];

  const userReactionMap = userId
    ? new Map(
        allReactions
          .filter(r => r.userId === userId)
          .map(r => [r.contestId, r.reaction])
      )
    : new Map();

  // Separate into ongoing and upcoming
  const ongoing = [];
  const upcoming = [];

  for (const contest of contests) {
    const reactions = reactionsByContest.get(contest.id) || [];
    const likesCount = reactions.filter(r => r.reaction === 'LIKE').length;
    const dislikesCount = reactions.filter(r => r.reaction === 'DISLIKE').length;
    const isRegistered = userRegistrations.some(r => r.contestId === contest.id);
    const userReaction = userId ? userReactionMap.get(contest.id) || null : null;

    const dto = {
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      type: contest.type,
      startsAt: contest.startsAt,
      endsAt: contest.endsAt,
      durationMinutes: contest.durationMinutes,
      isRegistered,
      likesCount,
      dislikesCount,
    };

    if (contest.startsAt <= now && contest.endsAt > now) {
      ongoing.push(dto);
    } else {
      upcoming.push(dto);
    }
  }

  return {
    ongoing,
    upcoming,
    serverTime: now,
  };
}

/**
 * Get a single contest by slug
 * @param {string} slug - Contest slug
 * @param {string} userId - Optional user ID for personalized data
 * @returns {Promise<object|null>}
 */
export async function getContest(slug, userId = null) {
  const contest = await prisma.contest.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          registrations: true,
          reactions: true,
        },
      },
    },
  });

  if (!contest) {
    return null;
  }

  // Get reactions for this contest
  const reactions = await prisma.contestReaction.findMany({
    where: { contestId: contest.id },
    select: { reaction: true, userId: true },
  });

  const likesCount = reactions.filter(r => r.reaction === 'LIKE').length;
  const dislikesCount = reactions.filter(r => r.reaction === 'DISLIKE').length;

  // Get user-specific data if authenticated
  let isRegistered = false;
  let userReaction = null;

  if (userId) {
    const userRegistration = await prisma.contestRegistration.findUnique({
      where: {
        userId_contestId: {
          userId,
          contestId: contest.id,
        },
      },
    });
    isRegistered = !!userRegistration;

    const userReactionRow = reactions.find(r => r.userId === userId);
    userReaction = userReactionRow ? userReactionRow.reaction : null;
  }

  return {
    id: contest.id,
    slug: contest.slug,
    title: contest.title,
    type: contest.type,
    description: contest.description,
    uploadedAt: contest.uploadedAt,
    startsAt: contest.startsAt,
    endsAt: contest.endsAt,
    durationMinutes: contest.durationMinutes,
    isRegistered,
    likesCount,
    dislikesCount,
    userReaction,
    serverTime: new Date(),
  };
}

/**
 * Register for a contest
 * @param {string} userId - User ID
 * @param {string} slug - Contest slug
 * @returns {Promise<{slug: string, isRegistered: boolean}|null|{closed: boolean}>}
 */
export async function registerForContest(userId, slug) {
  const contest = await prisma.contest.findUnique({
    where: { slug },
    select: { id: true, startsAt: true },
  });

  if (!contest) {
    return null;
  }

  const now = new Date();
  if (now >= contest.startsAt) {
    return { closed: true };
  }

  // Upsert registration
  const registration = await prisma.contestRegistration.upsert({
    where: {
      userId_contestId: {
        userId,
        contestId: contest.id,
      },
    },
    update: {}, // Keep original registeredAt
    create: {
      userId,
      contestId: contest.id,
    },
  });

  return { slug, isRegistered: true };
}

/**
 * Toggle contest reaction (like/dislike)
 * @param {string} userId - User ID
 * @param {string} slug - Contest slug
 * @param {string} reaction - 'LIKE' or 'DISLIKE'
 * @returns {Promise<object>}
 */
export async function toggleContestReaction(userId, slug, reaction) {
  const contest = await prisma.contest.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!contest) {
    return null;
  }

  const reactionType = reaction === 'LIKE' ? ReactionType.LIKE : ReactionType.DISLIKE;

  let likesCount = 0;
  let dislikesCount = 0;
  let userReaction = null;

  await prisma.$transaction(async (tx) => {
    // Find existing reaction
    const existingReaction = await tx.contestReaction.findUnique({
      where: {
        userId_contestId: {
          userId,
          contestId: contest.id,
        },
      },
    });

    if (existingReaction) {
      if (existingReaction.reaction === reactionType) {
        // Same reaction -> delete
        await tx.contestReaction.delete({
          where: {
            userId_contestId: {
              userId,
              contestId: contest.id,
            },
          },
        });
        userReaction = null;
      } else {
        // Different reaction -> update
        await tx.contestReaction.update({
          where: {
            userId_contestId: {
              userId,
              contestId: contest.id,
            },
          },
          data: { reaction: reactionType },
        });
        userReaction = reactionType;
      }
    } else {
      // No existing reaction -> create
      await tx.contestReaction.create({
        data: {
          userId,
          contestId: contest.id,
          reaction: reactionType,
        },
      });
      userReaction = reactionType;
    }

    // Get actual counts
    const reactions = await tx.contestReaction.findMany({
      where: { contestId: contest.id },
      select: { reaction: true },
    });

    likesCount = reactions.filter(r => r.reaction === 'LIKE').length;
    dislikesCount = reactions.filter(r => r.reaction === 'DISLIKE').length;
  });

  return {
    slug,
    likesCount,
    dislikesCount,
    userReaction,
  };
}