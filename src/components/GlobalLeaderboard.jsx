'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getGlobalLeaderboard, resolveAssetUrl } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const LEAGUE_STYLES = {
    WARRIOR: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    ELITE: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
    MASTER: 'bg-amber-600/15 text-amber-400 border-amber-500/30',
    GRANDMASTER: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    EPIC: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    LEGEND: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
    MYTHIC: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    MYTHICAL_HONOR: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
    MYTHICAL_GLORY: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    MYTHICAL_IMMORTAL:
        'bg-gradient-to-r from-amber-500/25 via-rose-500/25 to-purple-500/25 text-amber-200 border-amber-400/60 shadow-sm',
};

function LeagueBadge({ league }) {
    if (!league) return null;
    const style = LEAGUE_STYLES[league.key] || LEAGUE_STYLES.WARRIOR;
    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border whitespace-nowrap ${style}`}
        >
            {league.label}
        </span>
    );
}

function Avatar({ username, avatarUrl, size = 'sm' }) {
    const url = resolveAssetUrl(avatarUrl);
    const dims = size === 'lg' ? 'w-12 h-12 text-base' : 'w-8 h-8 text-xs';
    if (url) {
        return (
            <img
                src={url}
                alt={username}
                className={`${dims} rounded-full object-cover border border-border shrink-0`}
            />
        );
    }
    return (
        <div
            className={`${dims} rounded-full bg-navy text-white font-bold flex items-center justify-center uppercase shrink-0`}
        >
            {(username || '?')[0]}
        </div>
    );
}

export default function GlobalLeaderboard() {
    const { user, accessToken, isLoading: authLoading } = useAuth();

    const [rows, setRows] = useState([]);
    const [topThree, setTopThree] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [leagues, setLeagues] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalUsers: 0 });

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [leagueFilter, setLeagueFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('solved');
    const [page, setPage] = useState(1);
    const [showTiers, setShowTiers] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const loadLeaderboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getGlobalLeaderboard(
                { search: debouncedSearch, league: leagueFilter, sortBy, page, limit: 50 },
                accessToken
            );
            setRows(data.leaderboard || []);
            setTopThree(data.topThree || []);
            setMyRank(data.myRank || null);
            setLeagues(data.leagues || []);
            setPagination(data.pagination || { page: 1, totalPages: 1, totalUsers: 0 });
        } catch (err) {
            setError(err?.message || 'Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, leagueFilter, sortBy, page, accessToken]);

    useEffect(() => {
        if (authLoading) return;
        loadLeaderboard();
    }, [authLoading, loadLeaderboard]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Global Leaderboard</h1>
                    <p className="text-sm text-text-secondary">
                        Rankings across all players with CP & DSA breakdown and Competitive Leagues.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowTiers((v) => !v)}
                    className="px-3.5 py-2 text-xs font-semibold bg-bg-card border border-border rounded-lg hover:bg-bg-section text-text-primary"
                >
                    {showTiers ? 'Hide League Guide' : 'View League Tiers'}
                </button>
            </div>

            {/* Collapsible League Guide */}
            {showTiers && leagues.length > 0 && (
                <div className="p-4 bg-bg-card border border-border rounded-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-text-primary">League Progression (XP Points)</span>
                        <span className="text-text-muted">Easy = 2 pts · Medium = 5 pts · Hard = 12 pts</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {leagues.map((t) => (
                            <div key={t.key} className="p-2.5 bg-bg-section border border-border rounded-lg space-y-1">
                                <LeagueBadge
                                    league={{
                                        key: t.key,
                                        label: t.key === 'MYTHICAL_IMMORTAL' ? 'Mythical Immortal 1+' : t.name,
                                    }}
                                />
                                <p className="text-[11px] font-mono text-text-muted">
                                    {t.maxPoints != null ? `${t.minPoints} – ${t.maxPoints} pts` : `${t.minPoints}+ (+200 / lvl)`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top 3 Podium */}
            {topThree.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {topThree.map((p) => {
                        const rankColor =
                            p.rank === 1
                                ? 'text-amber-400'
                                : p.rank === 2
                                    ? 'text-slate-300'
                                    : 'text-amber-600';
                        return (
                            <div
                                key={p.userId}
                                className={`p-5 bg-bg-card border rounded-lg space-y-3 ${p.rank === 1 ? 'border-amber-400/60' : 'border-border'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-lg font-bold font-mono ${rankColor}`}>
                                        #{p.rank}
                                    </span>
                                    <LeagueBadge league={p.league} />
                                </div>
                                <Link
                                    href={`/u/${p.username}`}
                                    className="flex items-center gap-3 group no-underline"
                                >
                                    <Avatar username={p.username} avatarUrl={p.avatarUrl} size="lg" />
                                    <div className="min-w-0">
                                        <p className="text-base font-bold text-text-primary group-hover:text-navy transition-colors truncate">
                                            @{p.username}
                                        </p>
                                        {p.institution && (
                                            <p className="text-xs text-text-muted truncate">
                                                {p.institution}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center text-xs">
                                    <div>
                                        <p className="font-mono font-bold text-text-primary text-sm">{p.totalSolved}</p>
                                        <p className="text-text-muted">Solved</p>
                                    </div>
                                    <div>
                                        <p className="font-mono font-semibold text-warning">{p.cpSolved}</p>
                                        <p className="text-text-muted">CP</p>
                                    </div>
                                    <div>
                                        <p className="font-mono font-semibold text-info">{p.dsaSolved}</p>
                                        <p className="text-text-muted">DSA</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Logged-in User Pinned Card */}
            {myRank && (
                <div className="p-4 bg-info-bg/50 border border-info/30 rounded-lg flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="text-base font-mono font-bold text-info">#{myRank.rank}</span>
                        <Link href={`/u/${myRank.username}`} className="no-underline">
                            <Avatar username={myRank.username} avatarUrl={myRank.avatarUrl} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Link
                                    href={`/u/${myRank.username}`}
                                    className="text-sm font-bold text-text-primary hover:text-navy transition-colors no-underline"
                                >
                                    @{myRank.username} (You)
                                </Link>
                                <LeagueBadge league={myRank.league} />
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Solved: <strong>{myRank.totalSolved}</strong> (CP: {myRank.cpSolved} · DSA: {myRank.dsaSolved}) ·{' '}
                                <span className="font-mono">{myRank.points} pts</span>
                            </p>
                        </div>
                    </div>
                    <div className="w-full sm:w-56 space-y-1">
                        <div className="flex justify-between text-[11px] text-text-secondary">
                            <span>Next: {myRank.league.nextLabel}</span>
                            <span className="font-mono">{myRank.league.pointsToNext} pts left</span>
                        </div>
                        <div className="h-2 bg-bg-card rounded-full overflow-hidden border border-border">
                            <div
                                className="h-full bg-info transition-all"
                                style={{ width: `${myRank.league.progressPct}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters & Sort */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-card border border-border rounded-lg p-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search @username or college..."
                        className="w-full sm:w-64 px-3 py-1.5 text-sm bg-bg-input text-text-primary border border-border rounded-lg"
                    />
                    <select
                        value={leagueFilter}
                        onChange={(e) => {
                            setLeagueFilter(e.target.value);
                            setPage(1);
                        }}
                        className="px-3 py-1.5 text-sm bg-bg-input text-text-primary border border-border rounded-lg"
                    >
                        <option value="ALL">All Leagues</option>
                        {leagues.map((t) => (
                            <option key={t.key} value={t.key}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
                    {[
                        { key: 'solved', label: 'Most Solved' },
                        { key: 'points', label: 'League XP' },
                        { key: 'cp', label: 'Top CP' },
                        { key: 'dsa', label: 'Top DSA' },
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                                setSortBy(tab.key);
                                setPage(1);
                            }}
                            className={`px-3 py-1.5 font-medium ${sortBy === tab.key
                                    ? 'bg-navy text-white'
                                    : 'bg-bg-section text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Table */}
            {error ? (
                <div className="p-8 text-center bg-bg-card border border-border rounded-lg text-sm text-error">
                    {error}
                </div>
            ) : loading ? (
                <div className="p-8 text-center bg-bg-card border border-border rounded-lg text-sm text-text-muted">
                    Loading global rankings...
                </div>
            ) : rows.length === 0 ? (
                <div className="p-8 text-center bg-bg-card border border-border rounded-lg text-sm text-text-muted">
                    No players match this filter.
                </div>
            ) : (
                <div className="overflow-x-auto bg-bg-card border border-border rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-bg-section border-b border-border text-xs text-text-muted uppercase">
                            <tr>
                                <th className="px-4 py-3">Rank</th>
                                <th className="px-4 py-3">Player</th>
                                <th className="px-4 py-3">League</th>
                                <th className="px-4 py-3 text-center">Solved</th>
                                <th className="px-4 py-3 text-center">CP / DSA</th>
                                <th className="px-4 py-3 text-center">E / M / H</th>
                                <th className="px-4 py-3 text-right">XP</th>
                                <th className="px-4 py-3 text-right">AC %</th>
                                <th className="px-4 py-3 text-right">Contests</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map((row) => {
                                const isMe = user && row.userId === user.id;
                                return (
                                    <tr key={row.userId} className={isMe ? 'bg-info-bg/40' : 'hover:bg-row-hover'}>
                                        <td className="px-4 py-3 font-mono font-bold text-text-primary">
                                            #{row.displayRank}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/u/${row.username}`}
                                                className="flex items-center gap-2.5 group no-underline"
                                            >
                                                <Avatar username={row.username} avatarUrl={row.avatarUrl} />
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-text-primary group-hover:text-navy transition-colors truncate">
                                                        @{row.username}{' '}
                                                        {isMe && <span className="text-[11px] text-info font-medium">(You)</span>}
                                                    </p>
                                                    {row.institution && (
                                                        <p className="text-xs text-text-muted truncate">{row.institution}</p>
                                                    )}
                                                </div>
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                                            <LeagueBadge league={row.league} />
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono font-bold text-text-primary">
                                            {row.totalSolved}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="inline-flex items-center gap-1.5 text-xs font-mono">
                                                <span className="px-2 py-0.5 rounded bg-warning-bg text-warning font-semibold">
                                                    CP: {row.cpSolved}
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-info-bg text-info font-semibold">
                                                    DSA: {row.dsaSolved}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-xs">
                                            <span className="text-success">{row.easySolved}</span>
                                            <span className="text-text-muted"> / </span>
                                            <span className="text-warning">{row.mediumSolved}</span>
                                            <span className="text-text-muted"> / </span>
                                            <span className="text-error">{row.hardSolved}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-semibold text-text-primary">
                                            {row.points}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary">
                                            {row.acceptanceRate}%
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-xs text-text-secondary">
                                            {row.contestsJoined}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-text-secondary">
                    <span>
                        Page {pagination.page} of {pagination.totalPages} ({pagination.totalUsers} players)
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                            className="px-3 py-1.5 bg-bg-card border border-border rounded disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="px-3 py-1.5 bg-bg-card border border-border rounded disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}