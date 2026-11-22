'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatIST, formatCountdown, getContestLifecycle, getDemoNow } from '@/data/contests';
import { getRegistration } from '@/data/mockState';

function ContestCard({ contest, isUpcoming }) {
  const [statusText, setStatusText] = useState('');
  const [registered, setRegistered] = useState(Boolean(contest.defaultRegistered));

  // Sync timer and shared registration state on mount
  useEffect(() => {
    const update = () => {
      const now = getDemoNow();
      const life = getContestLifecycle(contest.startsAt, contest.endsAt, now);

      if (isUpcoming) {
        setStatusText(
          life === 'upcoming' ? `Starts in: ${formatCountdown(contest.startsAt, now)}` : 'Started'
        );
      } else {
        setStatusText(
          life === 'ongoing' ? `Ends in: ${formatCountdown(contest.endsAt, now)}` : 'Ended'
        );
      }

      setRegistered(Boolean(getRegistration(contest.slug, contest.defaultRegistered)));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [contest.slug, contest.defaultRegistered, contest.startsAt, contest.endsAt, isUpcoming]);

  // Listen for shared mock state changes across components/tabs
  useEffect(() => {
    const handleChange = (e) => {
      if (e.detail?.type === 'registration' && e.detail?.slug === contest.slug) {
        setRegistered(Boolean(e.detail.value));
      } else if (e.detail?.type === 'registration' && e.detail?.source === 'storage') {
        setRegistered(Boolean(getRegistration(contest.slug, contest.defaultRegistered)));
      }
    };
    window.addEventListener('cp-mock-state-change', handleChange);
    return () => window.removeEventListener('cp-mock-state-change', handleChange);
  }, [contest.slug, contest.defaultRegistered]);

  const typeClass =
    contest.type === 'DSA'
      ? 'bg-info-bg text-info'
      : 'bg-warning-bg text-warning';

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
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge shrink-0 ${typeClass}`}
        >
          {contest.type}
        </span>
      </div>

      <div className="text-small text-text-secondary space-y-1.5 mb-4">
        <div className="flex items-center gap-1.5">
          <svg
            className="w-4 h-4 text-text-muted flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>
            {isUpcoming
              ? `Starts: ${formatIST(contest.startsAt)}`
              : `Started: ${formatIST(contest.startsAt)}`}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            className="w-4 h-4 text-text-muted flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-small-lg font-medium text-text-primary">
            {statusText || 'Loading...'}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        {isUpcoming ? (
          registered ? (
            <Link
              href={`/contest/${contest.slug}`}
              className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-medium bg-success-bg text-success hover:text-success rounded-lg transition-colors no-underline"
            >
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
            {registered ? 'Solve' : 'View Contest'}
          </Link>
        )}
      </div>
    </article>
  );
}

function Section({ title, contests, isUpcoming }) {
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');

  if (!contests || contests.length === 0) {
    return (
      <section className="mb-12" aria-labelledby={sectionId}>
        <h2 id={sectionId} className="text-section-title text-text-primary mb-5">
          {title}
        </h2>
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-border-strong mb-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-body text-text-secondary">
            No {title.toLowerCase()} right now.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12" aria-labelledby={sectionId}>
      <h2 id={sectionId} className="text-section-title text-text-primary mb-5">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contests.map((contest) => (
          <ContestCard
            key={contest.slug}
            contest={contest}
            isUpcoming={isUpcoming}
          />
        ))}
      </div>
    </section>
  );
}

export default function ContestsOverview({ upcoming, ongoing }) {
  return (
    <>
      <Section title="Ongoing contests" contests={ongoing} isUpcoming={false} />
      <Section title="Upcoming contests" contests={upcoming} isUpcoming={true} />
    </>
  );
}