import { prisma } from '../lib/prisma.js';

const POINTS = { EASY: 2, MEDIUM: 5, HARD: 12 };

function computeLeague(xp) {
    if (xp < 20) return { key: 'WARRIOR', name: 'Warrior', label: '⚔️ Warrior' };
    if (xp < 50) return { key: 'ELITE', name: 'Elite', label: '🛡️ Elite' };
    if (xp < 100) return { key: 'MASTER', name: 'Master', label: '🔥 Master' };
    if (xp < 180) return { key: 'GRANDMASTER', name: 'Grandmaster', label: '⚡ Grandmaster' };
    if (xp < 300) return { key: 'EPIC', name: 'Epic', label: '💎 Epic' };
    if (xp < 450) return { key: 'LEGEND', name: 'Legend', label: '👑 Legend' };
    if (xp < 650) return { key: 'MYTHIC', name: 'Mythic', label: '🌌 Mythic' };
    if (xp < 900) return { key: 'MYTHICAL_HONOR', name: 'Mythical Honor', label: '🌟 Mythical Honor' };
    if (xp < 1200) return { key: 'MYTHICAL_GLORY', name: 'Mythical Glory', label: '🏆 Mythical Glory' };
    const tier = Math.floor((xp - 1200) / 200) + 1;
    return {
        key: 'MYTHICAL_IMMORTAL',
        name: `Mythical Immortal ${tier}`,
        label: `☄️ Mythical Immortal ${tier}`,
    };
}

function toDateKey(date) {
    return new Date(date).toISOString().slice(0, 10);
}

export async function getUserAnalytics(userId) {
    const [acceptedSubs, ratingRows] = await Promise.all([
        prisma.submission.findMany({
            where: { userId, status: 'ACCEPTED' },
            orderBy: { createdAt: 'asc' },
            select: {
                problemId: true,
                createdAt: true,
                problem: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        difficulty: true,
                    },
                },
            },
        }),
        prisma.ratingHistory.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            include: {
                contest: {
                    select: {
                        id: true,
                        slug: true,
                        title: true,
                        division: true,
                        startsAt: true,
                    },
                },
            },
        }),
    ]);

    // 1. Distinct solved problems, XP growth by date, and difficulty breakdown
    const seenProblems = new Set();
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    const xpByDate = new Map();
    const solvedList = [];
    let totalXp = 0;

    // 2. Heatmap: count distinct problems solved per date (last 365 days)
    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);
    const heatmapMap = new Map(); // dateKey -> Set(problemId)

    for (const sub of acceptedSubs) {
        const dateKey = toDateKey(sub.createdAt);

        if (sub.createdAt >= oneYearAgo) {
            if (!heatmapMap.has(dateKey)) heatmapMap.set(dateKey, new Set());
            heatmapMap.get(dateKey).add(sub.problemId);
        }

        if (!seenProblems.has(sub.problemId)) {
            seenProblems.add(sub.problemId);
            const diff = sub.problem?.difficulty || 'EASY';
            counts[diff] = (counts[diff] || 0) + 1;
            const pts = POINTS[diff] || 0;
            totalXp += pts;

            const prev = xpByDate.get(dateKey) || { date: dateKey, xp: 0, gained: 0, solved: 0 };
            prev.xp = totalXp;
            prev.gained += pts;
            prev.solved += 1;
            xpByDate.set(dateKey, prev);

            if (sub.problem) {
                solvedList.push({
                    id: sub.problem.id,
                    slug: sub.problem.slug,
                    title: sub.problem.title,
                    difficulty: sub.problem.difficulty,
                    solvedAt: sub.createdAt,
                });
            }
        }
    }

    // Build heatmap array + streaks
    const heatmap = Array.from(heatmapMap.entries())
        .map(([date, set]) => ({ date, count: set.size }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const activeDates = new Set(heatmap.map((h) => h.date));
    let maxStreak = 0;
    let runningStreak = 0;
    const cursor = new Date(oneYearAgo);
    const today = new Date();

    while (cursor <= today) {
        const key = toDateKey(cursor);
        if (activeDates.has(key)) {
            runningStreak += 1;
            if (runningStreak > maxStreak) maxStreak = runningStreak;
        } else {
            runningStreak = 0;
        }
        cursor.setDate(cursor.getDate() + 1);
    }

    // Current streak (today or yesterday counts as active)
    let currentStreak = 0;
    const checkDate = new Date();
    if (!activeDates.has(toDateKey(checkDate))) {
        checkDate.setDate(checkDate.getDate() - 1);
    }
    while (activeDates.has(toDateKey(checkDate))) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    const ratingHistory = ratingRows.map((row) => ({
        contestId: row.contestId,
        contestSlug: row.contest.slug,
        contestTitle: row.contest.title,
        division: row.contest.division,
        date: toDateKey(row.contest.startsAt),
        rank: row.rank,
        oldRating: row.oldRating,
        newRating: row.newRating,
        ratingChange: row.ratingChange,
    }));

    const xpHistory = Array.from(xpByDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
    );

    return {
        stats: {
            totalSolved: seenProblems.size,
            easySolved: counts.EASY,
            mediumSolved: counts.MEDIUM,
            hardSolved: counts.HARD,
            xp: totalXp,
            league: computeLeague(totalXp),
            activeDays: heatmap.length,
            currentStreak,
            maxStreak,
        },
        heatmap,
        ratingHistory,
        xpHistory,
        recentSolved: solvedList.reverse().slice(0, 20),
    };
}

export async function getPublicUserProfile(username) {
    const user = await prisma.user.findFirst({
        where: {
            username: { equals: username, mode: 'insensitive' },
        },
        select: {
            id: true,
            username: true,
            avatarUrl: true,
            hobby: true,
            institution: true,
            countryCode: true,
            countryName: true,
            stateCode: true,
            stateName: true,
            socialLinks: true,
            showSolvedQuestions: true,
            rating: true,
            maxRating: true,
            createdAt: true,
            role: true,
            isProfileHidden: true,
            isBanned: true,
        },
    });

    if (!user) return null;
    if (user.isBanned) return null;
    if (user.role === 'SUPERUSER' && user.isProfileHidden) return null;

    const analytics = await getUserAnalytics(user.id);

    return {
        profile: {
            ...user,
            stats: {
                ...analytics.stats,
                rating: user.rating,
                maxRating: user.maxRating,
            },
        },
        heatmap: analytics.heatmap,
        ratingHistory: analytics.ratingHistory,
        xpHistory: analytics.xpHistory,
        recentSolved: user.showSolvedQuestions ? analytics.recentSolved : [],
    };
}