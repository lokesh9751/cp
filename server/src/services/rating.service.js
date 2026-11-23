import { prisma } from '../lib/prisma.js';

let schedulerRunning = false;

/**
 * Recomputes a user's current rating and maxRating from their remaining RatingHistory.
 */
async function recomputeUserRatingTx(tx, userId) {
    const history = await tx.ratingHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { newRating: true },
    });

    if (history.length === 0) {
        return tx.user.update({
            where: { id: userId },
            data: { rating: 1200, maxRating: 1200 },
        });
    }

    const currentRating = history[history.length - 1].newRating;
    const maxRating = Math.max(1200, ...history.map((h) => h.newRating));

    return tx.user.update({
        where: { id: userId },
        data: { rating: currentRating, maxRating },
    });
}

/**
 * Calculates standings and applies multi-player Elo rating changes for a finished contest.
 */
export async function finalizeContestRatings(contestId) {
    const contest = await prisma.contest.findUnique({
        where: { id: Number(contestId) },
        include: {
            contestProblems: { select: { problemId: true } },
            registrations: {
                where: { isDisqualified: false },
                include: {
                    user: { select: { id: true, rating: true, maxRating: true, isBanned: true } },
                },
            },
        },
    });

    if (!contest) {
        const err = new Error('Contest not found');
        err.status = 404;
        throw err;
    }

    if (!contest.isRated || contest.ratingsFinalizedAt) {
        return { skipped: true, reason: 'Already finalized or unrated' };
    }

    const eligibleRegs = contest.registrations.filter((r) => !r.user.isBanned);
    const problemIds = contest.contestProblems.map((p) => p.problemId);

    if (eligibleRegs.length === 0) {
        await prisma.contest.update({
            where: { id: contest.id },
            data: { ratingsFinalizedAt: new Date() },
        });
        return { finalized: true, participants: 0 };
    }

    const userIds = eligibleRegs.map((r) => r.userId);
    const submissions = await prisma.submission.findMany({
        where: {
            contestId: contest.id,
            userId: { in: userIds },
            problemId: { in: problemIds },
            createdAt: { gte: contest.startsAt, lte: contest.endsAt },
        },
        orderBy: { createdAt: 'asc' },
        select: { userId: true, problemId: true, status: true, createdAt: true },
    });

    // Build standings: solved count DESC, penalty (minutes + 20m per wrong attempt) ASC
    const statsMap = new Map();
    for (const reg of eligibleRegs) {
        statsMap.set(reg.userId, {
            userId: reg.userId,
            oldRating: reg.user.rating ?? 1200,
            maxRating: reg.user.maxRating ?? 1200,
            solved: new Set(),
            wrongAttempts: new Map(),
            penalty: 0,
        });
    }

    for (const sub of submissions) {
        const st = statsMap.get(sub.userId);
        if (!st || st.solved.has(sub.problemId)) continue;

        if (sub.status === 'ACCEPTED') {
            st.solved.add(sub.problemId);
            const mins = Math.max(
                0,
                Math.floor((sub.createdAt.getTime() - contest.startsAt.getTime()) / 60000)
            );
            const wrongs = st.wrongAttempts.get(sub.problemId) || 0;
            st.penalty += mins + wrongs * 20;
        } else if (sub.status !== 'PENDING' && sub.status !== 'RUNNING') {
            st.wrongAttempts.set(
                sub.problemId,
                (st.wrongAttempts.get(sub.problemId) || 0) + 1
            );
        }
    }

    const standings = Array.from(statsMap.values())
        .map((s) => ({ ...s, solvedCount: s.solved.size }))
        .sort((a, b) => {
            if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
            return a.penalty - b.penalty;
        });

    // Assign competition ranks (ties share the same rank)
    standings.forEach((entry, idx) => {
        if (
            idx > 0 &&
            entry.solvedCount === standings[idx - 1].solvedCount &&
            entry.penalty === standings[idx - 1].penalty
        ) {
            entry.rank = standings[idx - 1].rank;
        } else {
            entry.rank = idx + 1;
        }
    });

    // Normalized pairwise multi-player Elo (K = 40)
    const N = standings.length;
    const K = 40;
    const updates = standings.map((player) => {
        if (N === 1) {
            return { ...player, delta: 0, newRating: player.oldRating };
        }

        let scoreSum = 0;
        let expectedSum = 0;

        for (const opp of standings) {
            if (opp.userId === player.userId) continue;

            const actual =
                player.rank < opp.rank ? 1 : player.rank === opp.rank ? 0.5 : 0;
            const expected =
                1 / (1 + Math.pow(10, (opp.oldRating - player.oldRating) / 400));

            scoreSum += actual;
            expectedSum += expected;
        }

        const delta = Math.round((K * (scoreSum - expectedSum)) / (N - 1));
        const newRating = Math.max(100, player.oldRating + delta);

        return { ...player, delta, newRating };
    });

    await prisma.$transaction(async (tx) => {
        for (const u of updates) {
            await tx.ratingHistory.upsert({
                where: { userId_contestId: { userId: u.userId, contestId: contest.id } },
                create: {
                    userId: u.userId,
                    contestId: contest.id,
                    rank: u.rank,
                    oldRating: u.oldRating,
                    newRating: u.newRating,
                    ratingChange: u.delta,
                },
                update: {
                    rank: u.rank,
                    oldRating: u.oldRating,
                    newRating: u.newRating,
                    ratingChange: u.delta,
                },
            });

            await tx.user.update({
                where: { id: u.userId },
                data: {
                    rating: u.newRating,
                    maxRating: Math.max(u.maxRating, u.newRating),
                },
            });
        }

        await tx.contest.update({
            where: { id: contest.id },
            data: { ratingsFinalizedAt: new Date() },
        });
    });

    return { finalized: true, participants: updates.length };
}

/**
 * Admin: Disqualify a user from a contest AND revert their rating for that contest.
 */
export async function disqualifyContestParticipant(contestId, userId, reason = '') {
    const cId = Number(contestId);
    return prisma.$transaction(async (tx) => {
        await tx.contestRegistration.updateMany({
            where: { contestId: cId, userId },
            data: {
                isDisqualified: true,
                disqualifiedReason: String(reason || 'Disqualified by admin').slice(0, 250),
            },
        });

        await tx.ratingHistory.deleteMany({
            where: { contestId: cId, userId },
        });

        await recomputeUserRatingTx(tx, userId);
        return { disqualified: true, contestId: cId, userId };
    });
}

/**
 * Admin: Remove only a user's rating entry for a contest and recompute their rating.
 */
export async function removeUserContestRating(contestId, userId) {
    const cId = Number(contestId);
    return prisma.$transaction(async (tx) => {
        await tx.ratingHistory.deleteMany({
            where: { contestId: cId, userId },
        });

        await recomputeUserRatingTx(tx, userId);
        return { ratingRemoved: true, contestId: cId, userId };
    });
}

/**
 * Background scheduler: checks every 60s for finished rated contests and finalizes ratings.
 */
export function startRatingScheduler() {
    const runTick = async () => {
        if (schedulerRunning) return;
        schedulerRunning = true;
        try {
            const dueContests = await prisma.contest.findMany({
                where: {
                    isRated: true,
                    ratingsFinalizedAt: null,
                    endsAt: { lte: new Date() },
                },
                select: { id: true, slug: true },
            });

            for (const c of dueContests) {
                await finalizeContestRatings(c.id);
                console.log(`[RatingScheduler] Auto-finalized ratings for contest: ${c.slug}`);
            }
        } catch (err) {
            if (err?.code === 'P1001') {
                console.warn('[RatingScheduler] Database unreachable (Neon waking up or offline). Will retry.');
            } else {
                console.error('[RatingScheduler] Error:', err?.message || err);
            }
        } finally {
            schedulerRunning = false;
        }
    };

    // Run once 15s after boot, then every 5 minutes
    setTimeout(runTick, 15000);
    setInterval(runTick, 5 * 60 * 1000);
}