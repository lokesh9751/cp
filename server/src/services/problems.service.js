import { prisma } from '../lib/prisma.js';
import { ProblemType, Difficulty } from '../constants/enums.js';

/**
 * Get all problems with filtering, sorting, and pagination
 * @param {object} params - Query parameters
 * @returns {Promise<{problems: [], topics: [], pagination: {}}>}
 */
export async function getProblems({
  type,
  search,
  difficulty,
  topicSlug,
  status,
  page = 1,
  limit = 10,
  userId = null,
}) {
  const skip = (page - 1) * limit;

  // Build the type filter
  let typeFilter = undefined;
  if (type && type !== 'all') {
    typeFilter = type === 'dsa' ? ProblemType.DSA : ProblemType.CP;
  }

  // Build the difficulty filter
  let difficultyFilter = undefined;
  if (difficulty && difficulty !== 'all') {
    difficultyFilter = Difficulty[difficulty.toUpperCase()];
  }

  // Build the topic filter condition
  const topicCondition = topicSlug && topicSlug !== 'all'
    ? { topics: { some: { topic: { slug: topicSlug } } } }
    : undefined;

  // Build search filter
  const searchCondition = search
    ? { title: { contains: search, mode: 'insensitive' } }
    : undefined;

  // Base where clause (non-status filters)
  const baseWhere = {
    ...typeFilter && { type: typeFilter },
    ...difficultyFilter && { difficulty: difficultyFilter },
    ...topicCondition,
    ...searchCondition,
  };

  // For status-based filtering with authenticated users
  let finalWhere = baseWhere;
  if (userId && status && status !== 'all') {
    // First get all problem IDs matching base filters
    const allMatchingProblemIds = await prisma.problem.findMany({
      where: baseWhere,
      select: { id: true },
    });

    let filteredIds = [];

    if (status === 'solved') {
      // Problems where user has at least one ACCEPTED submission
      const acceptedProblemIds = await prisma.submission.findMany({
        where: {
          userId,
          status: 'ACCEPTED',
          problemId: { in: allMatchingProblemIds.map(p => p.id) },
        },
        select: { problemId: true },
      });

      filteredIds = acceptedProblemIds.map(s => s.problemId);
    } else if (status === 'attempted') {
      // Problems where user has submissions but no ACCEPTED submissions
      const [allSubmittedIds, acceptedIds] = await Promise.all([
        prisma.submission.findMany({
          where: {
            userId,
            problemId: { in: allMatchingProblemIds.map(p => p.id) },
          },
          select: { problemId: true },
        }),
        prisma.submission.findMany({
          where: {
            userId,
            status: 'ACCEPTED',
            problemId: { in: allMatchingProblemIds.map(p => p.id) },
          },
          select: { problemId: true },
        }),
      ]);

      const allIds = new Set(allSubmittedIds.map(s => s.problemId));
      const acceptedIdsSet = new Set(acceptedIds.map(s => s.problemId));
      filteredIds = [...allIds].filter(id => !acceptedIdsSet.has(id));
    } else if (status === 'unsolved') {
      // Problems where user has no submissions
      // Get all problems user has submitted (across all problems)
      const submittedIds = await prisma.submission.findMany({
        where: { userId },
        select: { problemId: true },
      });

      const submittedIdsSet = new Set(submittedIds.map(s => s.problemId));
      filteredIds = allMatchingProblemIds
        .filter(p => !submittedIdsSet.has(p.id))
        .map(p => p.id);
    }

    // Apply the filtered IDs to the base where clause
    finalWhere = {
      ...baseWhere,
      id: { in: filteredIds },
    };
  }

  // Get total count with same filters
  const total = await prisma.problem.count({
    where: finalWhere,
  });

  // Fetch problems with pagination and relations
  const problems = await prisma.problem.findMany({
    where: finalWhere,
    skip,
    take: limit,
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
    include: {
      topics: {
        orderBy: {
          topic: { name: 'asc' },
        },
        select: {
          topic: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      ...(userId && {
        bookmarks: {
          where: { userId },
          select: { userId: true },
        },
      }),
    },
  });

  // Fetch user submissions for status determination (single query per problem ID set)
  let userSubmissions = [];
  if (userId && problems.length > 0) {
    const problemIds = problems.map(p => p.id);
    userSubmissions = await prisma.submission.findMany({
      where: {
        userId,
        problemId: { in: problemIds },
      },
      select: {
        problemId: true,
        status: true,
      },
    });
  }

  // Get all topics sorted by name
  const topics = await prisma.topic.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  // Build problem responses
  const acceptedProblemIds = new Set(
    userSubmissions.filter(s => s.status === 'ACCEPTED').map(s => s.problemId)
  );
  const attemptedProblemIds = new Set(
    userSubmissions.map(s => s.problemId)
  );

  const problemsResponse = problems.map(p => {
    const problemId = p.id;
    const isBookmarked = userId
      ? p.bookmarks?.some(b => b.userId === userId) || false
      : false;

    let userStatus = 'UNSOLVED';
    if (userId) {
      if (acceptedProblemIds.has(problemId)) {
        userStatus = 'SOLVED';
      } else if (attemptedProblemIds.has(problemId)) {
        userStatus = 'ATTEMPTED';
      }
    }

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      difficulty: p.difficulty,
      acceptanceRate: p.acceptanceRate,
      topics: p.topics.map(t => ({
        id: t.topic.id,
        name: t.topic.name,
        slug: t.topic.slug,
      })),
      isBookmarked,
      userStatus,
    };
  });

  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    problems: problemsResponse,
    topics,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Toggle bookmark for a problem
 * @param {string} userId - User ID
 * @param {string} slug - Problem slug
 * @returns {Promise<{slug: string, isBookmarked: boolean}>}
 */
export async function toggleBookmark(userId, slug) {
  // Find the problem
  const problem = await prisma.problem.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!problem) {
    return null;
  }

  // Use transaction for atomic toggle
  let isBookmarked = true;

  await prisma.$transaction(async (tx) => {
    // Check if bookmark exists
    const existingBookmark = await tx.bookmark.findUnique({
      where: {
        userId_problemId: {
          userId,
          problemId: problem.id,
        },
      },
    });

    if (existingBookmark) {
      // Delete if exists
      await tx.bookmark.delete({
        where: {
          userId_problemId: {
            userId,
            problemId: problem.id,
          },
        },
      });
      isBookmarked = false;
    } else {
      // Create if not exists
      await tx.bookmark.create({
        data: {
          userId,
          problemId: problem.id,
        },
      });
      isBookmarked = true;
    }
  });

  return { slug, isBookmarked };
}