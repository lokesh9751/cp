import { Country, State } from 'country-state-city';
import { prisma } from '../lib/prisma.js';
import { deleteLocalAvatar } from '../lib/avatarStorage.js';

const EMPTY_SOCIAL_LINKS = {
    github: '',
    linkedin: '',
    codeforces: '',
    leetcode: '',
    instagram: '',
    twitter: '',
    website: '',
};

function normalizeSocialLinks(raw) {
    const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return {
        github: typeof obj.github === 'string' ? obj.github : '',
        linkedin: typeof obj.linkedin === 'string' ? obj.linkedin : '',
        codeforces: typeof obj.codeforces === 'string' ? obj.codeforces : '',
        leetcode: typeof obj.leetcode === 'string' ? obj.leetcode : '',
        instagram: typeof obj.instagram === 'string' ? obj.instagram : '',
        twitter: typeof obj.twitter === 'string' ? obj.twitter : '',
        website: typeof obj.website === 'string' ? obj.website : '',
    };
}

function formatProfileResponse(user, solvedData = null) {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl || null,
        hobby: user.hobby || '',
        institution: user.institution || '',
        countryCode: user.countryCode || '',
        countryName: user.countryName || '',
        stateCode: user.stateCode || '',
        stateName: user.stateName || '',
        socialLinks: normalizeSocialLinks(user.socialLinks),
        showSolvedQuestions: Boolean(user.showSolvedQuestions),
        createdAt: user.createdAt,
        ...(solvedData ? { solved: solvedData } : {}),
    };
}

async function getSolvedProblemsData(userId) {
    const acceptedSubmissions = await prisma.submission.findMany({
        where: {
            userId,
            status: 'ACCEPTED',
        },
        orderBy: { createdAt: 'desc' },
        select: {
            createdAt: true,
            problem: {
                select: {
                    id: true,
                    slug: true,
                    title: true,
                    type: true,
                    difficulty: true,
                },
            },
        },
    });

    // Deduplicate by problemId (keep most recent accepted timestamp)
    const seen = new Map();
    for (const sub of acceptedSubmissions) {
        if (!seen.has(sub.problem.id)) {
            seen.set(sub.problem.id, {
                id: sub.problem.id,
                slug: sub.problem.slug,
                title: sub.problem.title,
                type: sub.problem.type,
                difficulty: sub.problem.difficulty,
                solvedAt: sub.createdAt,
            });
        }
    }

    const problems = Array.from(seen.values());
    const counts = {
        total: problems.length,
        easy: problems.filter((p) => p.difficulty === 'EASY').length,
        medium: problems.filter((p) => p.difficulty === 'MEDIUM').length,
        hard: problems.filter((p) => p.difficulty === 'HARD').length,
    };

    return { counts, problems };
}

export async function getUserProfile(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            hobby: true,
            institution: true,
            countryCode: true,
            countryName: true,
            stateCode: true,
            stateName: true,
            socialLinks: true,
            showSolvedQuestions: true,
            createdAt: true,
        },
    });

    if (!user) return null;

    const solvedData = await getSolvedProblemsData(userId);
    return formatProfileResponse(user, solvedData);
}

export async function updateUserProfile(userId, payload) {
    const updateData = {};

    // Username update + case-insensitive uniqueness check
    if (payload.username !== undefined) {
        const trimmed = payload.username.trim();
        const existing = await prisma.user.findFirst({
            where: {
                username: { equals: trimmed, mode: 'insensitive' },
                NOT: { id: userId },
            },
            select: { id: true },
        });

        if (existing) {
            const err = new Error('Username is already taken');
            err.status = 409;
            err.code = 'CONFLICT';
            err.fieldErrors = { username: ['Username is already taken'] };
            throw err;
        }

        updateData.username = trimmed;
    }

    if (payload.hobby !== undefined) {
        updateData.hobby = payload.hobby.trim() || null;
    }

    if (payload.institution !== undefined) {
        updateData.institution = payload.institution.trim() || null;
    }

    if (payload.showSolvedQuestions !== undefined) {
        updateData.showSolvedQuestions = Boolean(payload.showSolvedQuestions);
    }

    // Country & State validation against country-state-city
    if (payload.countryCode !== undefined || payload.stateCode !== undefined) {
        const countryCode = (payload.countryCode || '').trim().toUpperCase();
        const stateCode = (payload.stateCode || '').trim().toUpperCase();

        if (!countryCode) {
            updateData.countryCode = null;
            updateData.countryName = null;
            updateData.stateCode = null;
            updateData.stateName = null;
        } else {
            const countryObj = Country.getCountryByCode(countryCode);
            if (!countryObj) {
                const err = new Error('Invalid country selected');
                err.status = 400;
                err.fieldErrors = { countryCode: ['Please select a valid country'] };
                throw err;
            }

            updateData.countryCode = countryObj.isoCode;
            updateData.countryName = countryObj.name;

            if (stateCode) {
                const stateObj = State.getStateByCodeAndCountry(stateCode, countryObj.isoCode);
                if (!stateObj) {
                    const err = new Error('Invalid state for the selected country');
                    err.status = 400;
                    err.fieldErrors = { stateCode: ['Please select a valid state'] };
                    throw err;
                }
                updateData.stateCode = stateObj.isoCode;
                updateData.stateName = stateObj.name;
            } else {
                updateData.stateCode = null;
                updateData.stateName = null;
            }
        }
    }

    if (payload.socialLinks !== undefined) {
        updateData.socialLinks = {
            ...EMPTY_SOCIAL_LINKS,
            ...normalizeSocialLinks(payload.socialLinks),
        };
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            hobby: true,
            institution: true,
            countryCode: true,
            countryName: true,
            stateCode: true,
            stateName: true,
            socialLinks: true,
            showSolvedQuestions: true,
            createdAt: true,
        },
    });

    const solvedData = await getSolvedProblemsData(userId);
    return formatProfileResponse(updatedUser, solvedData);
}

export async function setUserAvatar(userId, newAvatarUrl) {
    const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
    });

    const updated = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: newAvatarUrl },
        select: { id: true, avatarUrl: true },
    });

    if (existing?.avatarUrl && existing.avatarUrl !== newAvatarUrl) {
        await deleteLocalAvatar(existing.avatarUrl);
    }

    return updated.avatarUrl;
}