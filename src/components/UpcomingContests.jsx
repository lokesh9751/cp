'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getContestLifecycle, getDemoNow, formatCountdown } from '@/data/contests';
import { getRegistration } from '@/data/mockState';

function ContestCard({ contest }) {
  const [mounted, setMounted] = useState(false);
  const [lifecycle, setLifecycle] = useState('upcoming');
  const [timeDisplay, setTimeDisplay] = useState('');
  const [isRegistered, setIsRegistered] = useState(Boolean(contest.defaultRegistered));

  useEffect(() => {
    setMounted(true);

    const syncRegistration = () => {
      setIsRegistered(Boolean(getRegistration(contest.slug, contest.defaultRegistered)));
    };

    const updateTimer = () => {
      const now = getDemoNow();
      const life = getContestLifecycle(contest.startsAt, contest.endsAt, now);
      setLifecycle(life);

      if (life === 'upcoming') {
        setTimeDisplay(`Starts in: ${formatCountdown(contest.startsAt, now)}`);
      } else if (life === 'ongoing') {
        setTimeDisplay(`Ends in: ${formatCountdown(contest.endsAt, now)}`);
      } else {
        setTimeDisplay('Ended');
      }
    };

    syncRegistration();
    updateTimer();

    const interval = setInterval(updateTimer, 1000);
    window.addEventListener('focus', syncRegistration);
    window.addEventListener('storage', syncRegistration);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncRegistration);
      window.removeEventListener('storage', syncRegistration);
    };
  }, [contest.slug, contest.defaultRegistered, contest.startsAt, contest.endsAt]);

  if (!mounted) {
    return (
      <article className="bg-bg-card border border-border rounded-lg p-5 flex flex-col animate-pulse">
        <div className="h-6 bg-border-strong rounded w-3/4 mb-3" />
        <div className="h-4 bg-border-strong rounded w-2/3 mb-2" />
        <div className="h-4 bg-border-strong rounded w-1/2 mb-5" />
        <div className="h-9 bg-border-strong rounded w-full mt-auto" />
      </article>
    );
  }

  return (
    <article className="bg-bg-card border border-border rounded-lg p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-card-title text-text-primary line-clamp-1 flex-1 pr-2">
          <Link
            href={`/contest/${contest.slug}`}
            className="text-text-primary hover:text-navy transition-colors no-underline"
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
            Starts:{' '}
            {contest.startsAt
              ? new Date(contest.startsAt).toLocaleString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZoneName: 'short',
              })
              : 'TBD'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-small-lg font-medium text-text-primary">
            {timeDisplay}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        <Link
          href={`/contest/${contest.slug}`}
          className={`inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors no-underline ${isRegistered
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

export default function UpcomingContests({ contests }) {
  const upcomingContests = useMemo(() => {
    return (
      contests
        ?.filter((c) => getContestLifecycle(c.startsAt, c.endsAt) === 'upcoming')
        .slice(0, 3) || []
    );
  }, [contests]);

  if (upcomingContests.length === 0) {
    return (
      <section className="mb-12" aria-labelledby="contests-heading">
        <h2 id="contests-heading" className="text-section-title text-text-primary mb-5">
          Upcoming contests
        </h2>
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-border-strong mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-body text-text-secondary">No upcoming contests right now.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12" aria-labelledby="contests-heading">
      <h2 id="contests-heading" className="text-section-title text-text-primary mb-5">
        Upcoming contests
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {upcomingContests.map((contest) => (
          <ContestCard key={contest.slug} contest={contest} />
        ))}
      </div>
    </section>
  );
}