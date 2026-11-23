import { prisma } from '../lib/prisma.js';
import {
    finalizeContestRatings,
    disqualifyContestParticipant,
    removeUserContestRating,
} from '../services/rating.service.js';
import { invalidateGlobalLeaderboardCache } from './globalLeaderboard.controller.js';

// --- Admin & Superuser: Contest Moderation ---

export async function triggerContestFinalize(req, res, next) {
    try {
        const result = await finalizeContestRatings(req.params.contestId);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function disqualifyParticipant(req, res, next) {
    try {
        const { userId, reason } = req.body || {};
        if (!userId) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'userId is required' },
            });
        }
        const result = await disqualifyContestParticipant(
            req.params.contestId,
            userId,
            reason
        );
        res.json(result);
    } catch (err) {
        next(err);
    }
}

export async function removeContestRating(req, res, next) {
    try {
        const { contestId, userId } = req.params;
        const result = await removeUserContestRating(contestId, userId);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

// --- Superuser Only: Account Ban / Temp Ban / Delete / Stealth Mode ---

export async function updateUserBan(req, res, next) {
    try {
        const { userId } = req.params;
        const { action, durationHours, reason } = req.body || {};
        // action: 'PERMANENT' | 'TEMP' | 'UNBAN'

        if (userId === req.user.id) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'You cannot ban your own account' },
            });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });
        if (!target) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
        }
        if (target.role === 'SUPERUSER') {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Cannot ban a superuser' },
            });
        }

        let data;
        if (action === 'UNBAN') {
            data = { isBanned: false, bannedUntil: null, banReason: null };
        } else if (action === 'PERMANENT') {
            data = {
                isBanned: true,
                bannedUntil: null,
                banReason: String(reason || 'Permanently banned by superuser').slice(0, 250),
            };
        } else if (action === 'TEMP') {
            const hours = Number(durationHours);
            if (!Number.isFinite(hours) || hours <= 0 || hours > 8760) {
                return res.status(400).json({
                    error: { code: 'VALIDATION_ERROR', message: 'Valid durationHours (1–8760) is required' },
                });
            }
            data = {
                isBanned: true,
                bannedUntil: new Date(Date.now() + hours * 3600 * 1000),
                banReason: String(reason || 'Temporarily banned by superuser').slice(0, 250),
            };
        } else {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'action must be PERMANENT, TEMP, or UNBAN' },
            });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                username: true,
                isBanned: true,
                bannedUntil: true,
                banReason: true,
            },
        });

        // Revoke active sessions immediately on ban
        if (action !== 'UNBAN') {
            await prisma.authSession.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }

        invalidateGlobalLeaderboardCache();
        res.json({ user: updated });
    } catch (err) {
        next(err);
    }
}

export async function deleteUserAccount(req, res, next) {
    try {
        const { userId } = req.params;

        if (userId === req.user.id) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'You cannot delete your own account' },
            });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true },
        });
        if (!target) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
        }
        if (target.role === 'SUPERUSER') {
            return res.status(403).json({
                error: { code: 'FORBIDDEN', message: 'Cannot delete a superuser account' },
            });
        }

        await prisma.user.delete({ where: { id: userId } });
        invalidateGlobalLeaderboardCache();
        res.json({ deleted: true, userId });
    } catch (err) {
        next(err);
    }
}

export async function toggleSuperuserStealth(req, res, next) {
    try {
        const isProfileHidden = Boolean(req.body?.isProfileHidden);
        const updated = await prisma.user.update({
            where: { id: req.user.id },
            data: { isProfileHidden },
            select: { id: true, username: true, isProfileHidden: true },
        });
        invalidateGlobalLeaderboardCache();
        res.json({ user: updated });
    } catch (err) {
        next(err);
    }
}