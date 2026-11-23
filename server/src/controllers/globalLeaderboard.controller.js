import { prisma } from '../lib/prisma.js';
import { getLeagueInfo, LEAGUE_TIERS } from '../utils/league.js';

let cache = { data: null, expiresAt: 0 };
const CACHE_TTL_MS = 15_000;

export function invalidateGlobalLeaderboardCache() {
  cache = { data: null, expiresAt: 0 };
}

async function fetchGlobalRows() {
  const now = Date.now();
  if (cache.data && now < cache.expiresAt) {
    return cache.data;
  }

  const rawRows = await prisma.$queryRaw`
    WITH accepted_unique AS (
      SELECT DISTINCT
        s."userId",
        s."problemId",
        p."type",
        p."difficulty"
      FROM "Submission" s
      INNER JOIN "Problem" p ON p."id" = s."problemId"
      WHERE s."status" = 'ACCEPTED'
    ),
    user_solved AS (
      SELECT
        "userId",
        COUNT(*)::int AS "totalSolved",
        COUNT(*) FILTER (WHERE "type" = 'CP')::int AS "cpSolved",
        COUNT(*) FILTER (WHERE "type" = 'DSA')::int AS "dsaSolved",
        COUNT(*) FILTER (WHERE "difficulty" = 'EASY')::int AS "easySolved",
        COUNT(*) FILTER (WHERE "difficulty" = 'MEDIUM')::int AS "mediumSolved",
        COUNT(*) FILTER (WHERE "difficulty" = 'HARD')::int AS "hardSolved",
        (
          COUNT(*) FILTER (WHERE "difficulty" = 'EASY') * 2 +
          COUNT(*) FILTER (WHERE "difficulty" = 'MEDIUM') * 5 +
          COUNT(*) FILTER (WHERE "difficulty" = 'HARD') * 12
        )::int AS "points"
      FROM accepted_unique
      GROUP BY "userId"
    ),
    user_subs AS (
      SELECT
        "userId",
        COUNT(*)::int AS "totalSubmissions",
        COUNT(*) FILTER (WHERE "status" = 'ACCEPTED')::int AS "acceptedSubmissions"
      FROM "Submission"
      WHERE "status" NOT IN ('PENDING', 'RUNNING')
      GROUP BY "userId"
    ),
    user_contests AS (
      SELECT
        "userId",
        COUNT(*)::int AS "contestsJoined"
      FROM "ContestRegistration"
      GROUP BY "userId"
    )
    SELECT
      u."id" AS "userId",
      u."username",
      u."avatarUrl",
      u."institution",
      u."countryCode",
      u."createdAt",
      COALESCE(us."totalSolved", 0)::int AS "totalSolved",
      COALESCE(us."cpSolved", 0)::int AS "cpSolved",
      COALESCE(us."dsaSolved", 0)::int AS "dsaSolved",
      COALESCE(us."easySolved", 0)::int AS "easySolved",
      COALESCE(us."mediumSolved", 0)::int AS "mediumSolved",
      COALESCE(us."hardSolved", 0)::int AS "hardSolved",
      COALESCE(us."points", 0)::int AS "points",
      COALESCE(sub."totalSubmissions", 0)::int AS "totalSubmissions",
      COALESCE(sub."acceptedSubmissions", 0)::int AS "acceptedSubmissions",
      COALESCE(uc."contestsJoined", 0)::int AS "contestsJoined"
    FROM "User" u
    LEFT JOIN user_solved us ON us."userId" = u."id"
    LEFT JOIN user_subs sub ON sub."userId" = u."id"
    LEFT JOIN user_contests uc ON uc."userId" = u."id"
    WHERE u."isBanned" = false AND u."isProfileHidden" = false
    ORDER BY
      COALESCE(us."totalSolved", 0) DESC,
      COALESCE(us."points", 0) DESC,
      COALESCE(sub."acceptedSubmissions", 0) DESC,
      u."createdAt" ASC
  `;

  const ranked = rawRows.map((row, idx) => {
    const totalSubmissions = Number(row.totalSubmissions) || 0;
    const acceptedSubmissions = Number(row.acceptedSubmissions) || 0;
    const points = Number(row.points) || 0;

    return {
      rank: idx + 1,
      userId: row.userId,
      username: row.username,
      avatarUrl: row.avatarUrl || null,
      institution: row.institution || null,
      countryCode: row.countryCode || null,
      totalSolved: Number(row.totalSolved) || 0,
      cpSolved: Number(row.cpSolved) || 0,
      dsaSolved: Number(row.dsaSolved) || 0,
      easySolved: Number(row.easySolved) || 0,
      mediumSolved: Number(row.mediumSolved) || 0,
      hardSolved: Number(row.hardSolved) || 0,
      points,
      totalSubmissions,
      acceptanceRate: totalSubmissions > 0 ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0,
      contestsJoined: Number(row.contestsJoined) || 0,
      league: getLeagueInfo(points),
    };
  });

  cache = { data: ranked, expiresAt: now + CACHE_TTL_MS };
  return ranked;
}

export async function getGlobalLeaderboard(req, res, next) {
  try {
    const {
      search = '',
      league = 'ALL',
      sortBy = 'solved', // 'solved' | 'points' | 'cp' | 'dsa'
      page = '1',
      limit = '50',
    } = req.query;

    const allRanked = await fetchGlobalRows();
    const myRank = req.user?.id ? allRanked.find((u) => u.userId === req.user.id) || null : null;

    let list = [...allRanked];

    if (sortBy === 'points') {
      list.sort((a, b) => b.points - a.points || b.totalSolved - a.totalSolved);
    } else if (sortBy === 'cp') {
      list.sort((a, b) => b.cpSolved - a.cpSolved || b.points - a.points);
    } else if (sortBy === 'dsa') {
      list.sort((a, b) => b.dsaSolved - a.dsaSolved || b.points - a.points);
    }

    // Recompute rank for current sort view
    list = list.map((item, idx) => ({ ...item, displayRank: idx + 1 }));

    const q = String(search).trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          (u.institution && u.institution.toLowerCase().includes(q))
      );
    }

    if (league && league !== 'ALL') {
      list = list.filter((u) => u.league.key === league);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(10, parseInt(limit, 10) || 50));
    const start = (pageNum - 1) * limitNum;
    const paginated = list.slice(start, start + limitNum);

    res.json({
      leaderboard: paginated,
      topThree: allRanked.slice(0, 3),
      myRank,
      leagues: LEAGUE_TIERS,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalUsers: list.length,
        totalPages: Math.max(1, Math.ceil(list.length / limitNum)),
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}