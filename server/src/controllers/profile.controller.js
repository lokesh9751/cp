import { z } from 'zod';
import {
    getUserProfile,
    updateUserProfile,
    setUserAvatar,
} from '../services/profile.service.js';
import { processAndSaveAvatar } from '../lib/avatarStorage.js';
import { getUserAnalytics, getPublicUserProfile } from '../services/analytics.service.js';

const optionalUrlSchema = z
    .string()
    .trim()
    .max(200, 'URL must be under 200 characters')
    .refine(
        (val) => {
            if (!val) return true;
            try {
                const parsed = new URL(val);
                return parsed.protocol === 'https:' || parsed.protocol === 'http:';
            } catch {
                return false;
            }
        },
        { message: 'Must be a valid http:// or https:// URL' }
    )
    .optional()
    .default('');

const updateProfileSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores are allowed')
        .optional(),
    hobby: z.string().trim().max(100, 'Hobby must be at most 100 characters').optional(),
    institution: z
        .string()
        .trim()
        .max(120, 'School / college name must be at most 120 characters')
        .optional(),
    countryCode: z.string().trim().max(3).optional(),
    stateCode: z.string().trim().max(10).optional(),
    showSolvedQuestions: z.boolean().optional(),
    socialLinks: z
        .object({
            github: optionalUrlSchema,
            linkedin: optionalUrlSchema,
            codeforces: optionalUrlSchema,
            leetcode: optionalUrlSchema,
            instagram: optionalUrlSchema,
            twitter: optionalUrlSchema,
            website: optionalUrlSchema,
        })
        .optional(),
});

export async function getProfile(req, res, next) {
    try {
        const profile = await getUserProfile(req.user.id);
        if (!profile) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
        }
        res.json({ profile });
    } catch (error) {
        next(error);
    }
}

export async function patchProfile(req, res, next) {
    try {
        const parsed = updateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            const flat = parsed.error.flatten();
            const fieldErrors = {};

            for (const [k, v] of Object.entries(flat.fieldErrors)) {
                if (v && v.length > 0) fieldErrors[k] = v;
            }

            // Include nested socialLinks field errors clearly (e.g., socialLinks.github)
            for (const issue of parsed.error.issues) {
                if (issue.path.length > 1) {
                    const key = issue.path.join('.');
                    if (!fieldErrors[key]) fieldErrors[key] = [];
                    fieldErrors[key].push(issue.message);
                }
            }

            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Please fix the highlighted profile fields',
                    fieldErrors,
                },
            });
        }

        const profile = await updateUserProfile(req.user.id, parsed.data);
        res.json({ profile });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                error: {
                    code: error.code || 'VALIDATION_ERROR',
                    message: error.message,
                    ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
                },
            });
        }
        next(error);
    }
}

export async function uploadAvatar(req, res, next) {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Please choose an image file' },
            });
        }

        const avatarUrl = await processAndSaveAvatar(req.file.buffer, req.user.id);
        const savedUrl = await setUserAvatar(req.user.id, avatarUrl);

        res.json({ avatarUrl: savedUrl });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                error: { code: 'VALIDATION_ERROR', message: error.message },
            });
        }
        next(error);
    }
}

export async function deleteAvatar(req, res, next) {
    try {
        await setUserAvatar(req.user.id, null);
        res.json({ avatarUrl: null });
    } catch (error) {
        next(error);
    }
}

export async function getMyAnalytics(req, res, next) {
    try {
        const analytics = await getUserAnalytics(req.user.id);
        res.json(analytics);
    } catch (error) {
        next(error);
    }
}

export async function getPublicProfile(req, res, next) {
    try {
        const { username } = req.params;
        const data = await getPublicUserProfile(username);
        if (!data) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'User not found' },
            });
        }
        res.json(data);
    } catch (error) {
        next(error);
    }
}