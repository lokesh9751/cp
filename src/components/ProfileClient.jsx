'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    getProfile,
    getMyAnalytics,
    updateProfile,
    uploadProfileAvatar,
    deleteProfileAvatar,
    getCountries,
    getStatesByCountry,
    resolveAssetUrl,
    superuserToggleStealth,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import RatingProgressChart from '@/components/RatingProgressChart';

const SOCIAL_FIELDS = [
    { key: 'github', label: 'GitHub', placeholder: 'https://github.com/username' },
    { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/username' },
    { key: 'codeforces', label: 'Codeforces', placeholder: 'https://codeforces.com/profile/handle' },
    { key: 'leetcode', label: 'LeetCode', placeholder: 'https://leetcode.com/u/username' },
    { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/username' },
    { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/username' },
    { key: 'website', label: 'Portfolio / Website', placeholder: 'https://yourdomain.com' },
];

const SELECT_CHEVRON_STYLE = {
    backgroundImage:
        'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236B7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")',
    backgroundPosition: 'right 0.75rem center',
};

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0]?.toUpperCase() || 'U';
}

function formatDate(dateValue) {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function DifficultyBadge({ difficulty }) {
    const key = (difficulty || 'EASY').toLowerCase();
    const styles = {
        easy: 'bg-easy-bg text-easy',
        medium: 'bg-medium-bg text-medium',
        hard: 'bg-hard-bg text-hard',
    };
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${styles[key] || styles.easy}`}>
            {label}
        </span>
    );
}

export default function ProfileClient() {
    const router = useRouter();
    const { user, accessToken, isLoading: authLoading, refresh, updateUser } = useAuth();

    const [profile, setProfile] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [form, setForm] = useState({
        username: '',
        hobby: '',
        institution: '',
        countryCode: '',
        stateCode: '',
        socialLinks: {
            github: '',
            linkedin: '',
            codeforces: '',
            leetcode: '',
            instagram: '',
            twitter: '',
            website: '',
        },
    });

    const [countries, setCountries] = useState([]);
    const [states, setStates] = useState([]);
    const [statesLoading, setStatesLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(null);

    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    const [avatarBusy, setAvatarBusy] = useState(false);
    const [avatarError, setAvatarError] = useState(null);
    const fileInputRef = useRef(null);

    const [togglePending, setTogglePending] = useState(false);
    const [toggleError, setToggleError] = useState(null);
    const [stealthBusy, setStealthBusy] = useState(false);

    // Execute authenticated API call with automatic 1-time refresh on 401
    const runAuthed = useCallback(
        async (fn) => {
            try {
                return await fn(accessToken);
            } catch (err) {
                if (err?.status === 401 && refresh) {
                    const newToken = await refresh();
                    if (newToken) {
                        return await fn(newToken);
                    }
                }
                throw err;
            }
        },
        [accessToken, refresh]
    );

    // Hydrate form from fetched profile
    const applyProfileData = useCallback((data) => {
        setProfile(data);
        setForm({
            username: data.username || '',
            hobby: data.hobby || '',
            institution: data.institution || '',
            countryCode: data.countryCode || '',
            stateCode: data.stateCode || '',
            socialLinks: {
                github: data.socialLinks?.github || '',
                linkedin: data.socialLinks?.linkedin || '',
                codeforces: data.socialLinks?.codeforces || '',
                leetcode: data.socialLinks?.leetcode || '',
                instagram: data.socialLinks?.instagram || '',
                twitter: data.socialLinks?.twitter || '',
                website: data.socialLinks?.website || '',
            },
        });
    }, []);

    // Load profile + countries once auth finishes  
    const loadInitialData = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        setPageError(null);

        try {
            const [profileData, countriesList, analyticsData] = await Promise.all([
                runAuthed((token) => getProfile(token)),
                getCountries(),
                runAuthed((token) => getMyAnalytics(token)).catch(() => null),
            ]);

            setCountries(countriesList);
            applyProfileData(profileData);
            setAnalytics(analyticsData);

            if (profileData.countryCode) {
                setStatesLoading(true);
                try {
                    const stList = await getStatesByCountry(profileData.countryCode);
                    setStates(stList);
                } finally {
                    setStatesLoading(false);
                }
            } else {
                setStates([]);
            }
        } catch (err) {
            if (err?.status === 401) {
                router.push('/login');
                return;
            }
            setPageError(err?.message || 'Unable to load your profile.');
        } finally {
            setLoading(false);
        }
    }, [accessToken, runAuthed, applyProfileData, router]);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !accessToken) {
            setLoading(false);
            return;
        }
        loadInitialData();
    }, [authLoading, user?.id, accessToken, loadInitialData]);

    // Handle country dropdown change -> load states for that country
    const handleCountryChange = async (nextCountryCode) => {
        setForm((prev) => ({
            ...prev,
            countryCode: nextCountryCode,
            stateCode: '',
        }));
        setFieldErrors((prev) => ({ ...prev, countryCode: undefined, stateCode: undefined }));

        if (!nextCountryCode) {
            setStates([]);
            return;
        }

        setStatesLoading(true);
        try {
            const nextStates = await getStatesByCountry(nextCountryCode);
            setStates(nextStates);
        } catch {
            setStates([]);
        } finally {
            setStatesLoading(false);
        }
    };

    const handleFieldChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSaveMessage(null);
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const handleSocialChange = (key, value) => {
        setForm((prev) => ({
            ...prev,
            socialLinks: { ...prev.socialLinks, [key]: value },
        }));
        setSaveMessage(null);
        setFieldErrors((prev) => ({ ...prev, [`socialLinks.${key}`]: undefined }));
    };

    // Save profile changes
    const handleSave = async (e) => {
        e.preventDefault();
        if (saving) return;

        setSaving(true);
        setSaveMessage(null);
        setSaveError(null);
        setFieldErrors({});

        try {
            const updated = await runAuthed((token) =>
                updateProfile(
                    {
                        username: form.username,
                        hobby: form.hobby,
                        institution: form.institution,
                        countryCode: form.countryCode,
                        stateCode: form.stateCode,
                        socialLinks: form.socialLinks,
                    },
                    token
                )
            );

            applyProfileData(updated);
            updateUser?.({
                username: updated.username,
                avatarUrl: updated.avatarUrl,
            });
            setSaveMessage('Profile saved successfully.');
        } catch (err) {
            if (err?.status === 401) {
                router.push('/login');
                return;
            }
            if (err?.fieldErrors) {
                setFieldErrors(err.fieldErrors);
            }
            setSaveError(err?.message || 'Could not save profile changes.');
        } finally {
            setSaving(false);
        }
    };

    // Upload avatar image
    const handleAvatarFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setAvatarError(null);

        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            setAvatarError('Please select a JPG, PNG, WebP, or GIF image.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setAvatarError('Image must be 2 MB or smaller.');
            return;
        }

        setAvatarBusy(true);
        try {
            const { avatarUrl } = await runAuthed((token) => uploadProfileAvatar(file, token));
            setProfile((prev) => (prev ? { ...prev, avatarUrl } : prev));
            updateUser?.({ avatarUrl });
        } catch (err) {
            if (err?.status === 401) {
                router.push('/login');
                return;
            }
            setAvatarError(err?.message || 'Failed to upload profile photo.');
        } finally {
            setAvatarBusy(false);
        }
    };

    // Remove avatar image
    const handleRemoveAvatar = async () => {
        if (avatarBusy || !profile?.avatarUrl) return;
        setAvatarError(null);
        setAvatarBusy(true);

        try {
            await runAuthed((token) => deleteProfileAvatar(token));
            setProfile((prev) => (prev ? { ...prev, avatarUrl: null } : prev));
            updateUser?.({ avatarUrl: null });
        } catch (err) {
            if (err?.status === 401) {
                router.push('/login');
                return;
            }
            setAvatarError(err?.message || 'Failed to remove profile photo.');
        } finally {
            setAvatarBusy(false);
        }
    };

    // Instant toggle for showing solved questions on profile
    const handleToggleSolvedVisibility = async () => {

        const handleToggleStealth = async () => {
            if (stealthBusy || !profile) return;
            const previous = Boolean(profile.isProfileHidden);
            const nextValue = !previous;

            setStealthBusy(true);
            setProfile((prev) => (prev ? { ...prev, isProfileHidden: nextValue } : prev));
            try {
                await runAuthed((token) => superuserToggleStealth(nextValue, token));
            } catch {
                setProfile((prev) => (prev ? { ...prev, isProfileHidden: previous } : prev));
            } finally {
                setStealthBusy(false);
            }
        };
        if (togglePending || !profile) return;

        const previous = Boolean(profile.showSolvedQuestions);
        const nextValue = !previous;

        setToggleError(null);
        setTogglePending(true);
        setProfile((prev) => (prev ? { ...prev, showSolvedQuestions: nextValue } : prev));

        try {
            const updated = await runAuthed((token) =>
                updateProfile({ showSolvedQuestions: nextValue }, token)
            );
            setProfile((prev) =>
                prev
                    ? {
                        ...prev,
                        showSolvedQuestions: Boolean(updated.showSolvedQuestions),
                        solved: updated.solved || prev.solved,
                    }
                    : prev
            );
        } catch (err) {
            setProfile((prev) => (prev ? { ...prev, showSolvedQuestions: previous } : prev));
            setToggleError(err?.message || 'Could not update solved questions visibility.');
        } finally {
            setTogglePending(false);
        }
    };

    const handleToggleStealth = async () => {
        if (stealthBusy || !profile) return;
        const previous = Boolean(profile.isProfileHidden);
        const nextValue = !previous;

        setStealthBusy(true);
        setProfile((prev) => (prev ? { ...prev, isProfileHidden: nextValue } : prev));
        try {
            await runAuthed((token) => superuserToggleStealth(nextValue, token));
        } catch (err) {
            console.error('Stealth toggle failed:', err);
            setProfile((prev) => (prev ? { ...prev, isProfileHidden: previous } : prev));
        } finally {
            setStealthBusy(false);
        }
    };

    // Guest gate
    if (!authLoading && !user) {
        return (
            <div className="max-w-lg mx-auto bg-bg-card border border-border rounded-lg p-8 text-center">
                <h1 className="text-section-title text-text-primary mb-2">Log in to view your profile</h1>
                <p className="text-body text-text-secondary mb-6">
                    Customize your username, photo, location, social links, and solved questions display.
                </p>
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium bg-navy text-white hover:bg-navy-hover hover:text-white rounded-lg transition-colors no-underline"
                >
                    Log in
                </Link>
            </div>
        );
    }

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
                <div className="bg-bg-card border border-border rounded-lg p-6 flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-border-strong shrink-0" />
                    <div className="space-y-2 flex-1">
                        <div className="h-6 bg-border-strong rounded w-44" />
                        <div className="h-4 bg-border-strong rounded w-64" />
                    </div>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-6 h-80" />
                <div className="bg-bg-card border border-border rounded-lg p-6 h-48" />
            </div>
        );
    }

    // Fatal fetch error
    if (pageError || !profile) {
        return (
            <div className="max-w-xl mx-auto bg-bg-card border border-border rounded-lg p-8 text-center">
                <p className="text-body text-error mb-4">{pageError || 'Profile unavailable.'}</p>
                <button
                    type="button"
                    onClick={loadInitialData}
                    className="px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    const avatarSrc = resolveAssetUrl(profile.avatarUrl);
    const locationText = [profile.stateName, profile.countryName].filter(Boolean).join(', ');
    const activeSocials = SOCIAL_FIELDS.filter((f) => Boolean(profile.socialLinks?.[f.key]));
    const solvedCounts = profile.solved?.counts || { total: 0, easy: 0, medium: 0, hard: 0 };
    const solvedProblems = profile.solved?.problems || [];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header / Profile Summary & Avatar Card */}
            <section className="bg-bg-card border border-border rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex items-center gap-5">
                        {avatarSrc ? (
                            <img
                                src={avatarSrc}
                                alt={`${profile.username} avatar`}
                                className="w-20 h-20 rounded-full object-cover border border-border shrink-0"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-navy text-white flex items-center justify-center text-2xl font-semibold shrink-0">
                                {getInitials(profile.username)}
                            </div>
                        )}

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-page-title text-text-primary truncate">@{profile.username}</h1>
                                {user?.role === 'ADMIN' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-badge bg-info-bg text-info border border-border">
                                        Admin
                                    </span>
                                )}
                            </div>
                            <p className="text-small text-text-muted truncate">{profile.email}</p>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-small text-text-secondary">
                                {profile.institution && <span>{profile.institution}</span>}
                                {profile.institution && locationText && <span aria-hidden="true">·</span>}
                                {locationText && <span>{locationText}</span>}
                                {(profile.institution || locationText) && profile.createdAt && (
                                    <span aria-hidden="true">·</span>
                                )}
                                {profile.createdAt && <span>Joined {formatDate(profile.createdAt)}</span>}
                            </div>

                            {profile.hobby && (
                                <p className="text-small text-text-secondary mt-1.5">
                                    <span className="text-text-muted">Hobby:</span> {profile.hobby}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="sm:ml-auto flex flex-wrap items-center gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                        />
                        <button
                            type="button"
                            disabled={avatarBusy}
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
                        >
                            {avatarBusy ? 'Uploading...' : avatarSrc ? 'Change photo' : 'Upload photo'}
                        </button>
                        <Link
                            href={`/u/${profile.username}`}
                            className="px-3 py-2 text-small font-medium border border-border text-text-secondary hover:text-text-primary hover:bg-bg-section rounded-lg transition-colors no-underline"
                        >
                            Public profile
                        </Link>
                        {avatarSrc && (
                            <button
                                type="button"
                                disabled={avatarBusy}
                                onClick={handleRemoveAvatar}
                                className="px-3 py-2 text-small font-medium border border-border text-text-secondary hover:text-error hover:bg-bg-section rounded-lg transition-colors"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                </div>

                {avatarError && (
                    <p className="mt-3 text-small text-error" role="alert">
                        {avatarError}
                    </p>
                )}

                {activeSocials.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border">
                        {activeSocials.map((item) => (
                            <a
                                key={item.key}
                                href={profile.socialLinks[item.key]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-badge bg-bg-section text-text-primary hover:text-navy border border-border transition-colors no-underline"
                            >
                                <span>{item.label}</span>
                                <svg className="w-3 h-3 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        ))}
                    </div>
                )}
            </section>

            {user?.role === 'SUPERUSER' && (
                <section className="bg-bg-card border border-border rounded-lg p-5 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-card-title text-text-primary">Hide profile (Stealth mode)</h2>
                        <p className="text-small text-text-secondary mt-0.5">
                            When enabled, your profile is hidden from public URLs, leaderboards, and friend search.
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(profile.isProfileHidden)}
                        disabled={stealthBusy}
                        onClick={handleToggleStealth}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${profile.isProfileHidden ? 'bg-navy' : 'bg-border-strong'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.isProfileHidden ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </section>
            )}

            {analytics && (
                <>
                    <RatingProgressChart
                        ratingHistory={analytics.ratingHistory || []}
                        xpHistory={analytics.xpHistory || []}
                        currentRating={profile.rating ?? 1200}
                        maxRating={profile.maxRating ?? 1200}
                        currentXp={analytics.stats?.xp ?? 0}
                    />
                    <ActivityHeatmap
                        heatmap={analytics.heatmap || []}
                        activeDays={analytics.stats?.activeDays ?? 0}
                        currentStreak={analytics.stats?.currentStreak ?? 0}
                        maxStreak={analytics.stats?.maxStreak ?? 0}
                    />
                </>
            )}

            {/* Edit Profile Form */}
            <form onSubmit={handleSave} className="bg-bg-card border border-border rounded-lg p-6 space-y-6">
                <div className="border-b border-border pb-3">
                    <h2 className="text-section-title text-text-primary">Profile details</h2>
                    <p className="text-small text-text-secondary mt-0.5">
                        Update your public username, hobby, institution, location, and social links.
                    </p>
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="profile-username" className="block text-small font-medium text-text-primary mb-1.5">
                            Username
                        </label>
                        <input
                            id="profile-username"
                            type="text"
                            required
                            minLength={3}
                            maxLength={20}
                            value={form.username}
                            onChange={(e) => handleFieldChange('username', e.target.value)}
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy"
                            placeholder="your_username"
                        />
                        {fieldErrors.username?.[0] && (
                            <p className="mt-1 text-xs text-error">{fieldErrors.username[0]}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="profile-hobby" className="block text-small font-medium text-text-primary mb-1.5">
                            Hobby
                        </label>
                        <input
                            id="profile-hobby"
                            type="text"
                            maxLength={100}
                            value={form.hobby}
                            onChange={(e) => handleFieldChange('hobby', e.target.value)}
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy"
                            placeholder="e.g., Competitive programming, Chess, Gaming"
                        />
                        {fieldErrors.hobby?.[0] && (
                            <p className="mt-1 text-xs text-error">{fieldErrors.hobby[0]}</p>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        <label htmlFor="profile-institution" className="block text-small font-medium text-text-primary mb-1.5">
                            College or School Name
                        </label>
                        <input
                            id="profile-institution"
                            type="text"
                            maxLength={120}
                            value={form.institution}
                            onChange={(e) => handleFieldChange('institution', e.target.value)}
                            className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy"
                            placeholder="Enter your college or school name"
                        />
                        {fieldErrors.institution?.[0] && (
                            <p className="mt-1 text-xs text-error">{fieldErrors.institution[0]}</p>
                        )}
                    </div>
                </div>

                {/* Location (Country & State only) */}
                <div className="pt-2 border-t border-border">
                    <h3 className="text-card-title text-text-primary mb-3">Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="profile-country" className="block text-small font-medium text-text-primary mb-1.5">
                                Country
                            </label>
                            <select
                                id="profile-country"
                                value={form.countryCode}
                                onChange={(e) => handleCountryChange(e.target.value)}
                                className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy appearance-none bg-no-repeat pr-8"
                                style={SELECT_CHEVRON_STYLE}
                            >
                                <option value="">Select country</option>
                                {countries.map((c) => (
                                    <option key={c.code} value={c.code}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.countryCode?.[0] && (
                                <p className="mt-1 text-xs text-error">{fieldErrors.countryCode[0]}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="profile-state" className="block text-small font-medium text-text-primary mb-1.5">
                                State
                            </label>
                            <select
                                id="profile-state"
                                value={form.stateCode}
                                disabled={!form.countryCode || statesLoading || states.length === 0}
                                onChange={(e) => handleFieldChange('stateCode', e.target.value)}
                                className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy appearance-none bg-no-repeat pr-8 disabled:opacity-60"
                                style={SELECT_CHEVRON_STYLE}
                            >
                                <option value="">
                                    {!form.countryCode
                                        ? 'Select a country first'
                                        : statesLoading
                                            ? 'Loading states...'
                                            : states.length === 0
                                                ? 'No states available'
                                                : 'Select state'}
                                </option>
                                {states.map((s) => (
                                    <option key={s.code} value={s.code}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.stateCode?.[0] && (
                                <p className="mt-1 text-xs text-error">{fieldErrors.stateCode[0]}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Social Media Links */}
                <div className="pt-2 border-t border-border">
                    <h3 className="text-card-title text-text-primary mb-3">Social links</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SOCIAL_FIELDS.map(({ key, label, placeholder }) => {
                            const errMsg = fieldErrors[`socialLinks.${key}`]?.[0];
                            return (
                                <div key={key}>
                                    <label htmlFor={`social-${key}`} className="block text-small font-medium text-text-primary mb-1.5">
                                        {label}
                                    </label>
                                    <input
                                        id={`social-${key}`}
                                        type="url"
                                        value={form.socialLinks[key]}
                                        onChange={(e) => handleSocialChange(key, e.target.value)}
                                        placeholder={placeholder}
                                        className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy"
                                    />
                                    {errMsg && <p className="mt-1 text-xs text-error">{errMsg}</p>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Save Bar */}
                <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-small">
                        {saveMessage && <span className="text-success font-medium">{saveMessage}</span>}
                        {saveError && Object.keys(fieldErrors).length === 0 && (
                            <span className="text-error">{saveError}</span>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-5 py-2.5 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors self-start sm:self-auto"
                    >
                        {saving ? 'Saving...' : 'Save changes'}
                    </button>
                </div>
            </form>

            {/* Solved Questions Section with Toggle */}
            <section className="bg-bg-card border border-border rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                    <div>
                        <h2 className="text-section-title text-text-primary">Solved questions</h2>
                        <p className="text-small text-text-secondary mt-0.5">
                            Choose whether to display your solved problems and difficulty breakdown on your profile.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <span className="text-small font-medium text-text-secondary">
                            {profile.showSolvedQuestions ? 'Visible' : 'Hidden'}
                        </span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(profile.showSolvedQuestions)}
                            aria-label="Toggle solved questions visibility on profile"
                            disabled={togglePending}
                            onClick={handleToggleSolvedVisibility}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${profile.showSolvedQuestions ? 'bg-navy' : 'bg-border-strong'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${profile.showSolvedQuestions ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {toggleError && (
                    <p className="mt-3 text-small text-error" role="alert">
                        {toggleError}
                    </p>
                )}

                {!profile.showSolvedQuestions ? (
                    <div className="py-8 text-center">
                        <p className="text-body text-text-secondary">
                            Solved questions are currently hidden on your profile. Toggle the switch above anytime to show them.
                        </p>
                    </div>
                ) : (
                    <div className="pt-5 space-y-5">
                        {/* Difficulty Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-bg-section border border-border rounded-lg p-3.5 text-center">
                                <p className="text-xs text-text-muted uppercase tracking-wide">Total Solved</p>
                                <p className="text-page-title font-mono text-text-primary mt-1">{solvedCounts.total}</p>
                            </div>
                            <div className="bg-easy-bg border border-border rounded-lg p-3.5 text-center">
                                <p className="text-xs text-easy uppercase tracking-wide">Easy</p>
                                <p className="text-page-title font-mono text-easy mt-1">{solvedCounts.easy}</p>
                            </div>
                            <div className="bg-medium-bg border border-border rounded-lg p-3.5 text-center">
                                <p className="text-xs text-medium uppercase tracking-wide">Medium</p>
                                <p className="text-page-title font-mono text-medium mt-1">{solvedCounts.medium}</p>
                            </div>
                            <div className="bg-hard-bg border border-border rounded-lg p-3.5 text-center">
                                <p className="text-xs text-hard uppercase tracking-wide">Hard</p>
                                <p className="text-page-title font-mono text-hard mt-1">{solvedCounts.hard}</p>
                            </div>
                        </div>

                        {/* Solved List */}
                        {solvedProblems.length === 0 ? (
                            <div className="bg-bg-section border border-border rounded-lg p-6 text-center">
                                <p className="text-body text-text-secondary mb-3">
                                    You haven&apos;t solved any problems yet.
                                </p>
                                <Link
                                    href="/problems"
                                    className="inline-flex items-center px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover hover:text-white rounded-lg transition-colors no-underline"
                                >
                                    Browse problems
                                </Link>
                            </div>
                        ) : (
                            <div className="border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-bg-section border-b border-border">
                                            <th className="px-4 py-2.5 text-small font-medium text-text-secondary">Problem</th>
                                            <th className="px-4 py-2.5 text-small font-medium text-text-secondary">Type</th>
                                            <th className="px-4 py-2.5 text-small font-medium text-text-secondary">Difficulty</th>
                                            <th className="px-4 py-2.5 text-small font-medium text-text-secondary text-right">Solved</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {solvedProblems.map((prob) => (
                                            <tr key={prob.id} className="border-t border-border hover:bg-row-hover transition-colors">
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/problem/${prob.slug}`}
                                                        prefetch={false}
                                                        className="text-small-lg font-medium text-text-primary hover:text-navy no-underline"
                                                    >
                                                        {prob.title}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${prob.type === 'DSA' ? 'bg-info-bg text-info' : 'bg-warning-bg text-warning'
                                                        }`}>
                                                        {prob.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <DifficultyBadge difficulty={prob.difficulty} />
                                                </td>
                                                <td className="px-4 py-3 text-right text-small text-text-muted font-mono">
                                                    {formatDate(prob.solvedAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}