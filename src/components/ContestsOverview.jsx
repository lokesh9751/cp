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

function ContestCard({ contest, isUpcoming, serverOffset, onBoundaryCrossed }) {
  const [statusText, setStatusText] = useState('');
  const boundaryTriggeredRef = useRef(false);

  useEffect(() => {
    boundaryTriggeredRef.current = false;

    const update = () => {
      const now = getAlignedNow(serverOffset);
      const life = getLifecycle(contest.startsAt, contest.endsAt, now);

      if (isUpcoming) {
        if (life === 'upcoming') {
          setStatusText(`Starts in: ${formatCountdownMs(contest.startsAt, now)}`);
        } else if (!boundaryTriggeredRef.current) {
          boundaryTriggeredRef.current = true;
          setStatusText('Started');
          onBoundaryCrossed();
        }
      } else {
        if (life === 'ongoing') {
          setStatusText(`Ends in: ${formatCountdownMs(contest.endsAt, now)}`);
        } else if (!boundaryTriggeredRef.current) {
          boundaryTriggeredRef.current = true;
          setStatusText('Ended');
          onBoundaryCrossed();
        }
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [contest.startsAt, contest.endsAt, isUpcoming, serverOffset, onBoundaryCrossed]);

  const isRegistered = Boolean(contest.isRegistered);

  return (
    <article className="bg-bg-card border border-border rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-card-title text-text-primary flex-1 pr-2">
          <Link
            href={`/contest/${contest.slug}`}
            className="text-text-primary hover:text-navy transition-colors no-underline line-clamp-2"
          >
            {contest.title}
          </Link>
        </h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge shrink-0 ${contest.type === 'DSA'
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
          <span>
            {isUpcoming ? 'Starts: ' : 'Started: '}
            {formatISTDateTime(contest.startsAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-small-lg font-medium text-text-primary">
            {statusText || '—'}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        {isUpcoming ? (
          isRegistered ? (
            <Link
              href={`/contest/${contest.slug}`}
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium bg-success-bg text-success hover:text-success rounded-lg transition-colors no-underline"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Registered
            </Link>
          ) : (
            <Link
              href={`/contest/${contest.slug}`}
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover hover:text-white rounded-lg transition-colors no-underline"
            >
              Register
            </Link>
          )
        ) : (
          <Link
            href={`/contest/${contest.slug}`}
            className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover hover:text-white rounded-lg transition-colors no-underline"
          >
            {isRegistered ? 'Solve' : 'View Contest'}
          </Link>
        )}
      </div>
    </article>
  );
}

function ContestSection({ title, contests, isUpcoming, serverOffset, onBoundaryCrossed }) {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');

  return (
    <section className="mb-12" aria-labelledby={sectionId}>
      <h2 id={sectionId} className="text-section-title text-text-primary mb-5">
        {title}
      </h2>

      {contests.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <svg className="w-10 h-10 mx-auto text-border-strong mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-body text-text-secondary">
            No {title.toLowerCase()} right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contests.map((contest) => (
            <ContestCard
              key={contest.slug}
              contest={contest}
              isUpcoming={isUpcoming}
              serverOffset={serverOffset}
              onBoundaryCrossed={onBoundaryCrossed}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ContestsOverview() {
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [ongoing, setOngoing] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [serverOffset, setServerOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  const fetchAllContests = useCallback(
    async ({ silent = false } = {}) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const reqId = ++requestIdRef.current;

      if (!silent) setLoading(true);
      setError(null);

      try {
        const data = await getContests(accessToken, { signal: controller.signal });
        if (reqId !== requestIdRef.current) return;
        setOngoing(data.ongoing || []);
        setUpcoming(data.upcoming || []);
        setServerOffset(computeServerOffset(data.serverTime));
      } catch (err) {
        if (err?.name === 'AbortError' || reqId !== requestIdRef.current) return;
        setError(err?.message || 'Failed to load contests');
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (authLoading) return;
    fetchAllContests();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [authLoading, user?.id, accessToken, fetchAllContests]);

  useEffect(() => {
    if (authLoading) return;
    const unsubscribe = subscribeContestsChanged(() => {
      fetchAllContests({ silent: true });
    });
    const handleFocus = () => fetchAllContests({ silent: true });
    window.addEventListener('focus', handleFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleFocus);
    };
  }, [authLoading, fetchAllContests]);

  const handleBoundaryCrossed = useCallback(() => {
    fetchAllContests({ silent: true });
  }, [fetchAllContests]);

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        {[1, 2].map((section) => (
          <div key={section}>
            <div className="h-7 bg-border-strong rounded w-48 mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="bg-bg-card border border-border rounded-lg p-5 h-44"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-body text-error mb-4">{error}</p>
        <button
          type="button"
          onClick={() => fetchAllContests()}
          className="px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <ContestSection
        title="Ongoing contests"
        contests={ongoing}
        isUpcoming={false}
        serverOffset={serverOffset}
        onBoundaryCrossed={handleBoundaryCrossed}
      />
      <ContestSection
        title="Upcoming contests"
        contests={upcoming}
        isUpcoming={true}
        serverOffset={serverOffset}
        onBoundaryCrossed={handleBoundaryCrossed}
      />
    </>
  );
}