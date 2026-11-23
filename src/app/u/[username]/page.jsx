'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
    getPublicProfile,
    resolveAssetUrl,
    getSocialOverview,
    sendFriendRequestApi,
    respondFriendRequestApi,
    removeFriendApi,
} from '@/lib/api';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import RatingProgressChart from '@/components/RatingProgressChart';

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
        <span
            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${styles[key] || styles.easy
                }`}
        >
            {label}
        </span>
    );
}

export default function PublicProfilePage() {
    const { username } = useParams();
    const { user, accessToken, refresh } = useAuth();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Relation with viewed user: NONE | FRIENDS | OUTGOING_PENDING | INCOMING_PENDING
    const [relation, setRelation] = useState({ status: 'NONE', friendshipId: null });
    const [friendBusy, setFriendBusy] = useState(false);

    const runAuthed = useCallback(
        async (fn) => {
            try {
                return await fn(accessToken);
            } catch (err) {
                if (err?.status === 401 && refresh) {
                    const newToken = await refresh();
                    if (newToken) return await fn(newToken);
                }
                throw err;
            }
        },
        [accessToken, refresh]
    );

    const loadRelation = useCallback(
        async (targetUserId) => {
            if (!accessToken || !user || !targetUserId || user.id === targetUserId) return;
            try {
                const overview = await runAuthed((token) => getSocialOverview(token));

                const friend = overview.friends?.find((f) => f.user.id === targetUserId);
                if (friend) {
                    setRelation({ status: 'FRIENDS', friendshipId: friend.friendshipId });
                    return;
                }

                const outgoing = overview.outgoingRequests?.find((r) => r.user.id === targetUserId);
                if (outgoing) {
                    setRelation({ status: 'OUTGOING_PENDING', friendshipId: outgoing.friendshipId });
                    return;
                }

                const incoming = overview.incomingRequests?.find((r) => r.user.id === targetUserId);
                if (incoming) {
                    setRelation({ status: 'INCOMING_PENDING', friendshipId: incoming.friendshipId });
                    return;
                }

                setRelation({ status: 'NONE', friendshipId: null });
            } catch {
                // Ignore silently if unauthenticated
            }
        },
        [accessToken, user, runAuthed]
    );

    useEffect(() => {
        if (!username) return;
        let active = true;
        setLoading(true);
        setError('');

        getPublicProfile(username)
            .then((res) => {
                if (active) setData(res);
            })
            .catch((err) => {
                if (active) setError(err?.message || 'User not found');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [username]);

    useEffect(() => {
        if (data?.profile?.id) {
            loadRelation(data.profile.id);
        }
    }, [data?.profile?.id, loadRelation]);

    const handleAddFriend = async () => {
        if (!data?.profile?.id || friendBusy) return;
        setFriendBusy(true);
        try {
            await runAuthed((token) => sendFriendRequestApi(data.profile.id, token));
            await loadRelation(data.profile.id);
        } finally {
            setFriendBusy(false);
        }
    };

    const handleRespondRequest = async (action) => {
        if (!relation.friendshipId || friendBusy) return;
        setFriendBusy(true);
        try {
            await runAuthed((token) =>
                respondFriendRequestApi(relation.friendshipId, action, token)
            );
            await loadRelation(data.profile.id);
        } finally {
            setFriendBusy(false);
        }
    };

    const handleRemoveFriend = async () => {
        if (!data?.profile?.id || friendBusy) return;
        setFriendBusy(true);
        try {
            await runAuthed((token) => removeFriendApi(data.profile.id, token));
            setRelation({ status: 'NONE', friendshipId: null });
        } finally {
            setFriendBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
                <div className="bg-bg-card border border-border rounded-lg p-6 flex items-center gap-5">
                    <div className="w-20 h-20 rounded-full bg-border-strong shrink-0" />
                    <div className="space-y-2 flex-1">
                        <div className="h-6 bg-border-strong rounded w-44" />
                        <div className="h-4 bg-border-strong rounded w-64" />
                    </div>
                </div>
                <div className="bg-bg-card border border-border rounded-lg p-6 h-56" />
            </div>
        );
    }

    if (error || !data?.profile) {
        return (
            <div className="max-w-lg mx-auto my-12 bg-bg-card border border-border rounded-lg p-8 text-center">
                <h1 className="text-section-title text-text-primary mb-2">
                    {error || 'User not found'}
                </h1>
                <p className="text-small text-text-secondary mb-6">
                    This profile does not exist or the username may have changed.
                </p>
                <Link
                    href="/leaderboard"
                    className="inline-flex items-center px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors no-underline"
                >
                    Back to leaderboard
                </Link>
            </div>
        );
    }

    const { profile, heatmap, ratingHistory, xpHistory, recentSolved } = data;
    const stats = profile.stats || {};
    const avatarSrc = resolveAssetUrl(profile.avatarUrl);
    const locationText = [profile.stateName, profile.countryName].filter(Boolean).join(', ');
    const socialEntries = Object.entries(profile.socialLinks || {}).filter(([, url]) => Boolean(url));
    const isOwnProfile = Boolean(user && user.id === profile.id);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {/* Header Card */}
            <section className="bg-bg-card border border-border rounded-lg p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-5 min-w-0">
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
                                <h1 className="text-page-title text-text-primary truncate leading-tight">
                                    @{profile.username}
                                </h1>
                                {profile.role === 'ADMIN' && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-full bg-info-bg text-info ">
                                        Admin
                                    </span>
                                )}
                                {stats.league?.name && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-bg-section text-text-primary border border-border">
                                        {stats.league.name}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5 text-small text-text-secondary">
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

                    {/* Friend / Profile Action Buttons */}
                    {user && !isOwnProfile && (
                        <div className="flex items-center gap-2 shrink-0">
                            {relation.status === 'FRIENDS' ? (
                                <>
                                    <Link
                                        href="/social"
                                        className="px-3.5 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors no-underline"
                                    >
                                        Message
                                    </Link>
                                    <button
                                        type="button"
                                        disabled={friendBusy}
                                        onClick={handleRemoveFriend}
                                        className="px-3.5 py-2 text-small font-medium border border-border text-text-secondary hover:text-error hover:bg-bg-section rounded-lg transition-colors"
                                    >
                                        {friendBusy ? 'Updating...' : 'Remove friend'}
                                    </button>
                                </>
                            ) : relation.status === 'OUTGOING_PENDING' ? (
                                <button
                                    type="button"
                                    disabled={friendBusy}
                                    onClick={() => handleRespondRequest('CANCEL')}
                                    className="px-3.5 py-2 text-small font-medium border border-border text-text-secondary hover:text-error hover:bg-bg-section rounded-lg transition-colors"
                                >
                                    {friendBusy ? 'Updating...' : 'Cancel request'}
                                </button>
                            ) : relation.status === 'INCOMING_PENDING' ? (
                                <>
                                    <button
                                        type="button"
                                        disabled={friendBusy}
                                        onClick={() => handleRespondRequest('ACCEPT')}
                                        className="px-3.5 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
                                    >
                                        Accept
                                    </button>
                                    <button
                                        type="button"
                                        disabled={friendBusy}
                                        onClick={() => handleRespondRequest('REJECT')}
                                        className="px-3.5 py-2 text-small font-medium border border-border text-text-secondary hover:text-error hover:bg-bg-section rounded-lg transition-colors"
                                    >
                                        Decline
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    disabled={friendBusy}
                                    onClick={handleAddFriend}
                                    className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
                                >
                                    {friendBusy ? 'Sending...' : 'Add friend'}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Compact Single-Row Stats Strip */}
                <div className="pt-4 border-t border-border grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    <div className="bg-bg-section border border-border rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] text-text-muted uppercase tracking-wide">Rating</p>
                        <p className="text-card-title font-mono text-text-primary mt-0.5">
                            {stats.rating ?? 1200}
                        </p>
                    </div>
                    <div className="bg-bg-section border border-border rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] text-text-muted uppercase tracking-wide">XP</p>
                        <p className="text-card-title font-mono text-text-primary mt-0.5">
                            {stats.xp ?? 0}
                        </p>
                    </div>
                    <div className="bg-bg-section border border-border rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] text-text-muted uppercase tracking-wide">Solved</p>
                        <p className="text-card-title font-mono text-text-primary mt-0.5">
                            {stats.totalSolved ?? 0}
                        </p>
                    </div>
                    <div className="bg-easy-bg border border-border rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] text-easy uppercase tracking-wide">Easy</p>
                        <p className="text-card-title font-mono text-easy mt-0.5">
                            {stats.easySolved ?? 0}
                        </p>
                    </div>
                    <div className="bg-medium-bg border border-border rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] text-medium uppercase tracking-wide">Medium</p>
                        <p className="text-card-title font-mono text-medium mt-0.5">
                            {stats.mediumSolved ?? 0}
                        </p>
                    </div>
                    <div className="bg-hard-bg border border-border rounded-lg px-3 py-2 text-center">
                        <p className="text-[11px] text-hard uppercase tracking-wide">Hard</p>
                        <p className="text-card-title font-mono text-hard mt-0.5">
                            {stats.hardSolved ?? 0}
                        </p>
                    </div>
                </div>

                {socialEntries.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                        {socialEntries.map(([platform, url]) => (
                            <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium capitalize rounded-badge bg-bg-section text-text-primary hover:text-navy border border-border transition-colors no-underline"
                            >
                                <span>{platform}</span>
                                <svg
                                    className="w-3 h-3 text-text-muted"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>
                        ))}
                    </div>
                )}
            </section>

            {/* Hybrid Rating / XP Graph */}
            <RatingProgressChart
                ratingHistory={ratingHistory}
                xpHistory={xpHistory}
                currentRating={stats.rating ?? 1200}
                maxRating={stats.maxRating ?? 1200}
                currentXp={stats.xp ?? 0}
            />

            {/* Activity Heatmap */}
            <ActivityHeatmap
                heatmap={heatmap}
                activeDays={stats.activeDays ?? 0}
                currentStreak={stats.currentStreak ?? 0}
                maxStreak={stats.maxStreak ?? 0}
            />

            {/* Recently Solved */}
            {profile.showSolvedQuestions && (
                <section className="bg-bg-card border border-border rounded-lg p-6">
                    <h2 className="text-section-title text-text-primary pb-4 border-b border-border">
                        Recently solved
                    </h2>

                    {recentSolved?.length > 0 ? (
                        <div className="mt-4 border border-border rounded-lg overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-bg-section border-b border-border">
                                        <th className="px-4 py-2.5 text-small font-medium text-text-secondary">
                                            Problem
                                        </th>
                                        <th className="px-4 py-2.5 text-small font-medium text-text-secondary">
                                            Difficulty
                                        </th>
                                        <th className="px-4 py-2.5 text-small font-medium text-text-secondary text-right">
                                            Solved
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSolved.map((prob) => (
                                        <tr
                                            key={prob.id}
                                            className="border-t border-border hover:bg-row-hover transition-colors"
                                        >
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
                    ) : (
                        <div className="mt-4 bg-bg-section border border-border rounded-lg p-6 text-center text-small text-text-secondary">
                            No solved problems yet.
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}