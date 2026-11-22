'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getContestBySlug, registerForContest, reactToContest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import ContestLeaderboard from '@/components/ContestLeaderboard';
import {
  computeServerOffset,
  getAlignedNow,
  getLifecycle,
  formatCountdownMs,
  formatISTDateTime,
  formatRelativePosted,
  notifyContestsChanged,
} from '@/lib/contestTime';

const DIVISION_LABELS = { OPEN: 'Open', DIV1: 'Div 1', DIV2: 'Div 2', DIV3: 'Div 3' };

function formatSolveTime(seconds) {
  if (seconds == null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function BackLink() {
  return (
    <Link
      href="/contest"
      className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text-primary transition-colors mb-6 no-underline"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to Contests
    </Link>
  );
}

function ContestDescription({ description }) {
  if (!description) return null;

  if (typeof description === 'string') {
    return (
      <div className="mb-8">
        <MarkdownRenderer content={description} />
      </div>
    );
  }

  const sections = [
    { key: 'overview', label: 'Overview' },
    { key: 'format', label: 'Format' },
    { key: 'scoring', label: 'Scoring' },
    { key: 'rules', label: 'Rules', isList: true },
    { key: 'setterNotes', label: "Setter's Notes" },
  ];

  return (
    <div className="space-y-4 text-text-secondary mb-8">
      {sections.map(({ key, label, isList }) => {
        const content = description[key];
        if (!content) return null;

        if (isList && Array.isArray(content)) {
          return (
            <div key={key}>
              <h3 className="text-body font-medium text-text-primary mb-2">{label}</h3>
              <ul className="list-disc list-inside space-y-1 text-small">
                {content.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }

        if (typeof content === 'string') {
          return (
            <div key={key}>
              <h3 className="text-body font-medium text-text-primary mb-2">{label}</h3>
              <p className="text-small leading-relaxed">{content}</p>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function ContestDetail({ slug }) {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading, refresh } = useAuth();

  const [contest, setContest] = useState(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [lifecycle, setLifecycle] = useState('upcoming');
  const [timeDisplay, setTimeDisplay] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);
  const [error, setError] = useState(null);

  const [registerPending, setRegisterPending] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [showSolveNotice, setShowSolveNotice] = useState(false);

  const [reactionPending, setReactionPending] = useState(false);
  const [reactionError, setReactionError] = useState(null);

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const userIdRef = useRef(user?.id || null);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  const fetchContest = useCallback(
    async ({ silent = false } = {}) => {
      if (!slug) return;
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const reqId = ++requestIdRef.current;

      if (!silent) {
        setLoading(true);
        setContest(null);
      }
      setNotFoundError(false);
      setError(null);

      try {
        const data = await getContestBySlug(slug, accessToken, {
          signal: controller.signal,
        });
        if (reqId !== requestIdRef.current) return;

        const offset = computeServerOffset(data.serverTime);
        setContest(data);
        setServerOffset(offset);
        setLifecycle(getLifecycle(data.startsAt, data.endsAt, getAlignedNow(offset)));
      } catch (err) {
        if (err?.name === 'AbortError' || reqId !== requestIdRef.current) return;
        if (err?.status === 404) {
          setNotFoundError(true);
        } else {
          setError(err?.message || 'Failed to load contest details');
        }
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [slug, accessToken]
  );

  useEffect(() => {
    if (authLoading) return;
    setRegisterError(null);
    setReactionError(null);
    setShowSolveNotice(false);
    fetchContest();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [authLoading, slug, user?.id, accessToken, fetchContest]);

  useEffect(() => {
    if (!contest) return;

    let prevLife = getLifecycle(contest.startsAt, contest.endsAt, getAlignedNow(serverOffset));

    const tick = () => {
      const now = getAlignedNow(serverOffset);
      const nextLife = getLifecycle(contest.startsAt, contest.endsAt, now);
      setLifecycle(nextLife);

      if (nextLife === 'upcoming') {
        setTimeDisplay(`Starts in ${formatCountdownMs(contest.startsAt, now)}`);
      } else if (nextLife === 'ongoing') {
        setTimeDisplay(`Ends in ${formatCountdownMs(contest.endsAt, now)}`);
      } else {
        setTimeDisplay('Ended');
      }

      if (nextLife !== prevLife) {
        prevLife = nextLife;
        fetchContest({ silent: true });
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    const handleVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [contest?.slug, contest?.startsAt, contest?.endsAt, serverOffset, fetchContest]);

  const handleRegister = async () => {
    if (authLoading || registerPending || !contest) return;
    if (!user || !accessToken) {
      router.push('/login');
      return;
    }

    const activeUserId = user.id;
    const activeSlug = contest.slug;
    setRegisterPending(true);
    setRegisterError(null);

    try {
      let result;
      try {
        result = await registerForContest(activeSlug, accessToken);
      } catch (err) {
        if (err?.status === 401 && refresh) {
          const newToken = await refresh();
          if (newToken) {
            result = await registerForContest(activeSlug, newToken);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      if (userIdRef.current !== activeUserId) return;

      setContest((prev) =>
        prev && prev.slug === activeSlug
          ? { ...prev, isRegistered: Boolean(result.isRegistered) }
          : prev
      );
      notifyContestsChanged(activeSlug);
    } catch (err) {
      if (userIdRef.current !== activeUserId) return;
      if (err?.status === 401) {
        router.push('/login');
        return;
      }
      setRegisterError(err?.message || 'Unable to register for this contest.');
      if (err?.status === 400) {
        fetchContest({ silent: true });
      }
    } finally {
      setRegisterPending(false);
    }
  };

  const handleReaction = async (reactionType) => {
    if (authLoading || reactionPending || !contest) return;
    if (!user || !accessToken) {
      router.push('/login');
      return;
    }

    const activeUserId = user.id;
    const activeSlug = contest.slug;
    setReactionPending(true);
    setReactionError(null);

    try {
      let result;
      try {
        result = await reactToContest(activeSlug, reactionType, accessToken);
      } catch (err) {
        if (err?.status === 401 && refresh) {
          const newToken = await refresh();
          if (newToken) {
            result = await reactToContest(activeSlug, reactionType, newToken);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }

      if (userIdRef.current !== activeUserId) return;

      setContest((prev) =>
        prev && prev.slug === activeSlug
          ? {
            ...prev,
            likesCount: result.likesCount,
            dislikesCount: result.dislikesCount,
            userReaction: result.userReaction,
          }
          : prev
      );
      notifyContestsChanged(activeSlug);
    } catch (err) {
      if (userIdRef.current !== activeUserId) return;
      if (err?.status === 401) {
        router.push('/login');
        return;
      }
      if (err?.isNetworkError) {
        setReactionError('Connection lost. Refreshing reaction counts...');
        fetchContest({ silent: true });
      } else {
        setReactionError(err?.message || 'Could not update reaction.');
      }
    } finally {
      setReactionPending(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-5 bg-border-strong rounded w-32" />
        <div className="h-8 bg-border-strong rounded w-1/2" />
        <div className="h-4 bg-border-strong rounded w-2/3" />
        <div className="h-32 bg-border-strong rounded" />
        <div className="h-11 bg-border-strong rounded w-36" />
      </div>
    );
  }

  if (notFoundError) {
    return (
      <div>
        <BackLink />
        <div className="bg-bg-card border border-border rounded-lg p-10 text-center">
          <h1 className="text-section-title text-text-primary mb-2">Contest not found</h1>
          <p className="text-body text-text-secondary mb-6">
            The contest you are looking for does not exist or may have been removed.
          </p>
          <Link
            href="/contest"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover hover:text-white rounded-lg no-underline"
          >
            Back to Contests
          </Link>
        </div>
      </div>
    );
  }

  if (error || !contest) {
    return (
      <div>
        <BackLink />
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-body text-error mb-4">{error || 'Unable to load contest.'}</p>
          <button
            type="button"
            onClick={() => fetchContest()}
            className="px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isRegistered = Boolean(contest.isRegistered);
  const postedLabel = formatRelativePosted(contest.uploadedAt, getAlignedNow(serverOffset));

  return (
    <article className="bg-bg-card border border-border rounded-lg p-6 md:p-8">
      <BackLink />

      <header className="mb-6 pb-6 border-b border-border">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h1 className="text-section-title text-text-primary">{contest.title}</h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-badge ${contest.type === 'DSA'
              ? 'bg-info-bg text-info'
              : 'bg-warning-bg text-warning'
              }`}
          >
            {contest.type}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-badge bg-bg-section border border-border text-text-primary">
            {DIVISION_LABELS[contest.division] || 'Open'}
          </span>
          <span className="text-xs text-text-muted">
            {contest.participantCount ?? 0} participants
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-secondary">
          {postedLabel && (
            <>
              <span>{postedLabel}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>Starts: {formatISTDateTime(contest.startsAt)}</span>
          <span aria-hidden="true">·</span>
          <span>Duration: {contest.durationMinutes} minutes</span>
        </div>

        <div className="mt-4">
          <span
            className={`inline-flex items-center px-3 py-1 text-small font-medium rounded-lg font-mono ${lifecycle === 'upcoming'
              ? 'bg-info-bg text-info'
              : lifecycle === 'ongoing'
                ? 'bg-warning-bg text-warning'
                : 'bg-bg-section text-text-muted'
              }`}
          >
            {lifecycle === 'upcoming' && `Upcoming · ${timeDisplay}`}
            {lifecycle === 'ongoing' && `Live · ${timeDisplay}`}
            {lifecycle === 'ended' && 'Ended'}
          </span>
        </div>
      </header>

      <ContestDescription description={contest.description} />

      {/* Action Area */}
      <div className="mb-6">
        {lifecycle === 'upcoming' && !isRegistered && (
          <button
            type="button"
            disabled={registerPending || authLoading}
            onClick={handleRegister}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
          >
            {registerPending ? 'Registering...' : 'Register'}
          </button>
        )}

        {lifecycle === 'upcoming' && isRegistered && (
          <span className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium bg-success-bg text-success rounded-lg">
            <svg
              className="w-4 h-4 mr-1.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Registered
          </span>
        )}

        {lifecycle === 'ongoing' && isRegistered && (
          <button
            type="button"
            onClick={() => setShowSolveNotice(true)}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
          >
            Solve
          </button>
        )}

        {lifecycle === 'ongoing' && !isRegistered && (
          <button
            type="button"
            disabled={registerPending || authLoading}
            onClick={handleRegister}
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold bg-success text-white hover:opacity-90 rounded-lg transition-colors"
          >
            {registerPending ? 'Joining...' : 'Join Live Contest'}
          </button>
        )}

        {lifecycle === 'ended' && (
          <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-bg-section border border-border text-text-secondary rounded-lg">
            Contest Ended · Practice / Upsolve Mode
          </span>
        )}

        {registerError && (
          <p className="mt-3 text-small text-error" role="alert">
            {registerError}
          </p>
        )}

        {showSolveNotice && (
          <div
            className="mt-3 p-3 bg-info-bg border border-border rounded-lg text-small text-info"
            role="status"
          >
            Select a problem from the list below to open it in the IDE.
          </div>
        )}
      </div>

      {/* Contest Problems List */}
      <div className="mb-8 space-y-3">
        <h2 className="text-base font-semibold text-text-primary">Contest Problems</h2>

        {contest.problems && contest.problems.length > 0 ? (
          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {contest.problems.map((prob) => (
              <div
                key={prob.id}
                className="p-3.5 bg-bg-section flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded bg-navy text-white text-xs font-bold flex items-center justify-center">
                    {prob.label}
                  </span>
                  <div>
                    <Link
                      href={`/problem/${prob.slug}?contestId=${contest.id}`}
                      className="text-sm font-semibold text-text-primary hover:text-navy"
                    >
                      {prob.title}
                    </Link>
                    <p className="text-xs text-text-muted">
                      {prob.difficulty} · {prob.points} pts
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {prob.solved ? (
                    <span className="px-2 py-0.5 text-xs font-mono font-medium bg-success-bg text-success rounded">
                      Solved · {formatSolveTime(prob.solveTimeSeconds)}
                    </span>
                  ) : prob.wrongAttempts > 0 ? (
                    <span className="px-2 py-0.5 text-xs font-mono font-medium bg-error-bg text-error rounded">
                      -{prob.wrongAttempts} attempts
                    </span>
                  ) : null}
                  <Link
                    href={`/problem/${prob.slug}?contestId=${contest.id}`}
                    className="px-3 py-1.5 text-xs font-semibold bg-navy text-white rounded-md hover:bg-navy-hover no-underline"
                  >
                    {prob.solved ? 'View / Retry' : 'Solve'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-bg-section border border-border rounded-lg text-sm text-text-secondary">
            {lifecycle === 'upcoming'
              ? 'Problems are locked until the contest starts.'
              : lifecycle === 'ongoing' && !isRegistered
                ? 'Register / Join Live Contest above to unlock the problems.'
                : 'No problems attached to this contest yet.'}
          </div>
        )}
      </div>

      {/* Reactions */}
      <div className="pt-5 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="text-small text-text-secondary">Reactions</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={reactionPending || authLoading}
              onClick={() => handleReaction('LIKE')}
              aria-label="Like contest"
              aria-pressed={contest.userReaction === 'LIKE'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-small transition-colors ${contest.userReaction === 'LIKE'
                ? 'border-info bg-info-bg text-info font-medium'
                : 'border-border bg-transparent text-text-secondary hover:bg-bg-section hover:text-text-primary'
                }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill={contest.userReaction === 'LIKE' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span className="font-mono">{contest.likesCount ?? 0}</span>
            </button>

            <button
              type="button"
              disabled={reactionPending || authLoading}
              onClick={() => handleReaction('DISLIKE')}
              aria-label="Dislike contest"
              aria-pressed={contest.userReaction === 'DISLIKE'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-small transition-colors ${contest.userReaction === 'DISLIKE'
                ? 'border-error bg-error-bg text-error font-medium'
                : 'border-border bg-transparent text-text-secondary hover:bg-bg-section hover:text-text-primary'
                }`}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill={contest.userReaction === 'DISLIKE' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
              <span className="font-mono">{contest.dislikesCount ?? 0}</span>
            </button>
          </div>
        </div>

        {reactionError && (
          <p className="mt-2 text-small text-error" role="alert">
            {reactionError}
          </p>
        )}
      </div>

      {/* Live Contest Leaderboard */}
      <div className="mt-8 pt-6 border-t border-border">
        {lifecycle === 'upcoming' ? (
          <div className="p-6 text-center bg-bg-section border border-border rounded-lg text-sm text-text-secondary">
            Live standings and solve speed metrics will unlock once the contest begins.
          </div>
        ) : (
          <ContestLeaderboard slug={contest.slug} />
        )}
      </div>
    </article>
  );
}