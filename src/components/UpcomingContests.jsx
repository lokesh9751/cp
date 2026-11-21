'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

function formatCountdown(ms) {
  if (ms <= 0) return 'Started';
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

function ContestCard({ contest }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const startTime = new Date(contest.startTime).getTime();
    const now = Date.now();
    setTimeLeft(startTime - now);

    const interval = setInterval(() => {
      const remaining = startTime - Date.now();
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [contest.startTime]);

  const hasStarted = timeLeft <= 0;
  const isRegistered = contest.registered;

  return (
    <article className="flex-shrink-0 w-80 md:w-88 bg-bg-card border border-border rounded-lg p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-card-title text-text-primary line-clamp-1 flex-1 pr-2">{contest.title}</h3>
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge shrink-0 ${
          contest.type === 'DSA'
            ? 'bg-info-bg text-info'
            : 'bg-warning-bg text-warning'
        }`}>
          {contest.type}
        </span>
      </div>

      <div className="text-small text-text-secondary space-y-1 mb-4">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Starts: {formatDateTime(contest.startTime)}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-small-lg font-medium text-text-primary">
            {hasStarted ? 'Started' : `Starts in: ${formatCountdown(timeLeft)}`}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        {contest.ended ? (
          <span className="inline-flex items-center justify-center w-full px-4 py-2 text-button text-text-muted bg-bg-section rounded-lg cursor-not-allowed">
            Ended
          </span>
        ) : hasStarted ? (
          <Link
            href={`/contest/${contest.slug}`}
            className="inline-flex items-center justify-center w-full px-4 py-2 text-button bg-navy text-white rounded-lg hover:bg-navy-hover transition-colors no-underline"
          >
            Join Contest
          </Link>
        ) : (
          <Link
            href={`/contest/${contest.slug}`}
            className="inline-flex items-center justify-center w-full px-4 py-2 text-button border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors no-underline"
          >
            Register
          </Link>
        )}
      </div>
    </article>
  );
}

export default function UpcomingContests({ contests }) {
  if (!contests || contests.length === 0) {
    return (
      <section className="mb-12" aria-labelledby="contests-heading">
        <h2 id="contests-heading" className="text-section-title text-text-primary mb-5">Upcoming contests</h2>
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

  const upcomingContests = contests.filter(c => !c.ended).slice(0, 3);

  return (
    <section className="mb-12" aria-labelledby="contests-heading">
      <h2 id="contests-heading" className="text-section-title text-text-primary mb-5">Upcoming contests</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2 md:pb-0 -mx-4 md:mx-0 px-4 md:px-0">
        {upcomingContests.map((contest) => (
          <ContestCard key={contest.slug} contest={contest} />
        ))}
      </div>
    </section>
  );
}