'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getContests } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  computeServerOffset,
  getAlignedNow,
  getLifecycle,
  formatCountdownMs,
  formatISTDateTime,
  subscribeContestsChanged,
} from '@/lib/contestTime';

function UpcomingCard({ contest, serverOffset, onBoundaryCrossed }) {
  const [timeText, setTimeText] = useState('');
  const boundaryTriggeredRef = useRef(false);

  useEffect(() => {
    boundaryTriggeredRef.current = false;

    const update = () => {
      const now = getAlignedNow(serverOffset);
      const life = getLifecycle(contest.startsAt, contest.endsAt, now);

      if (life === 'upcoming') {
        setTimeText(`Starts in: ${formatCountdownMs(contest.startsAt, now)}`);
      } else if (!boundaryTriggeredRef.current) {
        boundaryTriggeredRef.current = true;
        setTimeText('Started');
        onBoundaryCrossed();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [contest.startsAt, contest.endsAt, serverOffset, onBoundaryCrossed]);

  const isRegistered = Boolean(contest.isRegistered);

  return (
    <article className="bg-bg-card border border-border rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-card-title text-text-primary flex-1 pr-2">
          <Link
            href={`/contest/${contest.slug}`}
            className="text-text-primary hover:text-navy transition-colors no-underline line-clamp-1"
          >
            {contest.title}
          </Link>
        </h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge shrink-0 ${
            contest.type === 'DSA'
              ? 'bg-info-bg text-info'
              : 'bg-warning-bg text-warning'
          }`}
        >
          {contest.type}
        </span>
      </div>

      <div className="text-small text-text-secondary space-y-1.5 mb-4">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Starts: {formatISTDateTime(contest.startsAt)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-small-lg font-medium text-text-primary">
            {timeText || '—'}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <Link
          href={`/contest/${contest.slug}`}
          className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline ${
            isRegistered
              ? 'bg-success-bg text-success hover:text-success'
              : 'bg-navy text-white hover:bg-navy-hover hover:text-white'
          }`}
        >
          {isRegistered ? (
            <>
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Registered
            </>
          ) : (
            'Register'
          )}
        </Link>
      </div>
    </article>
  );
}

export default function UpcomingContests() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [upcoming, setUpcoming] = useState([]);
  const [serverOffset, setServerOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  const fetchUpcoming = useCallback(async ({ silent = false } = {}) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++requestIdRef.current;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getContests(accessToken, { signal: controller.signal });
      if (reqId !== requestIdRef.current) return;
      setUpcoming((data.upcoming || []).slice(0, 3));
      setServerOffset(computeServerOffset(data.serverTime));
    } catch (err) {
      if (err?.name === 'AbortError' || reqId !== requestIdRef.current) return;
      setError(err?.message || 'Failed to load upcoming contests');
    } finally {
      if (reqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [accessToken]);

  // Wait for auth readiness, re-fetch on identity/token change
  useEffect(() => {
    if (authLoading) return;
    fetchUpcoming();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [authLoading, user?.id, accessToken, fetchUpcoming]);

  // Revalidate on cross-page registration or window focus
  useEffect(() => {
    if (authLoading) return;
    const unsubscribe = subscribeContestsChanged(() => {
      fetchUpcoming({ silent: true });
    });
    const handleFocus = () => {
      fetchUpcoming({ silent: true });
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [authLoading, fetchUpcoming]);

  const handleBoundaryCrossed = useCallback(() => {
    fetchUpcoming({ silent: true });
  }, [fetchUpcoming]);

  return (
    <section className="mb-12" aria-labelledby="contests-heading">
      <h2 id="contests-heading" className="text-section-title text-text-primary mb-5">
        Upcoming contests
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-bg-card border border-border rounded-lg p-5 h-44 animate-pulse"
            >
              <div className="h-5 bg-border-strong rounded w-3/4 mb-4" />
              <div className="h-4 bg-border-strong rounded w-2/3 mb-2" />
              <div className="h-4 bg-border-strong rounded w-1/2 mb-6" />
              <div className="h-9 bg-border-strong rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-bg-card border border-border rounded-lg p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-small text-error">{error}</p>
          <button
            type="button"
            onClick={() => fetchUpcoming()}
            className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : upcoming.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <svg className="w-10 h-10 mx-auto text-border-strong mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-body text-text-secondary">No upcoming contests right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcoming.map((contest) => (
            <UpcomingCard
              key={contest.slug}
              contest={contest}
              serverOffset={serverOffset}
              onBoundaryCrossed={handleBoundaryCrossed}
            />
          ))}
        </div>
      )}
    </section>
  );
}