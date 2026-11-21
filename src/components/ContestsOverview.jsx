'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatIST, formatISTDate, formatISTTime, formatCountdown, getContestLifecycle, getDemoNow } from '@/data/contests';
import { getRegistration } from '@/data/mockState';

function ContestCard({ contest, lifecycle, isUpcoming }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [statusText, setStatusText] = useState('');
  const [registered, setRegistered] = useState(() => getRegistration(contest.slug, contest.defaultRegistered));

  // Update time periodically
  useEffect(() => {
    const update = () => {
      const now = getDemoNow();
      const life = getContestLifecycle(contest.startsAt, contest.endsAt, now);

      if (isUpcoming) {
        setTimeLeft(formatCountdown(contest.startsAt, now));
        setStatusText(life === 'upcoming' ? `Starts in: ${formatCountdown(contest.startsAt, now)}` : 'Started');
      } else {
        setTimeLeft(formatTimeRemaining(contest.endsAt, now));
        setStatusText(life === 'ongoing' ? `Ends in: ${formatTimeRemaining(contest.endsAt, now)}` : 'Ended');
      }

      // Update registration from shared state
      setRegistered(getRegistration(contest.slug, contest.defaultRegistered));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [contest.startsAt, contest.endsAt, isUpcoming]);

  // Listen for shared state changes
  useEffect(() => {
    const handleChange = (e) => {
      if (e.detail.type === 'registration' && e.detail.slug === contest.slug) {
        setRegistered(e.detail.value);
      } else if (e.detail.type === 'registration' && e.detail.source === 'storage') {
        setRegistered(getRegistration(contest.slug, contest.defaultRegistered));
      }
    };
    window.addEventListener('cp-mock-state-change', handleChange);
    return () => window.removeEventListener('cp-mock-state-change', handleChange);
  }, [contest.slug, contest.defaultRegistered]);

  const typeClass = contest.type === 'DSA'
    ? 'bg-info-bg text-info'
    : 'bg-warning-bg text-warning';

  return (
    <article className="bg-bg-card border border-border rounded-lg p-5 flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link href={`/contest/${contest.slug}`} className="flex-1 pr-2 no-underline">
          <h3 className="text-card-title text-text-primary line-clamp-1">{contest.title}</h3>
        </Link>
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge shrink-0 ${typeClass}`}>
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
          <span>{isUpcoming ? `Starts: ${formatIST(contest.startsAt)}` : `Started: ${formatIST(contest.startsAt)}`}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-mono text-small-lg font-medium text-text-primary">{statusText}</span>
        </div>
      </div>

      <div className="mt-auto pt-3 border-t border-border">
        {isUpcoming ? (
          registered ? (
            <Link
              href={`/contest/${contest.slug}`}
              className="inline-flex items-center justify-center w-full px-4 py-2 text-button bg-success-bg text-success rounded-lg cursor-not-allowed"
              aria-disabled="true"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Registered
            </Link>
          ) : (
            <Link
              href={`/contest/${contest.slug}`}
              className="inline-flex items-center justify-center w-full px-4 py-2 text-button border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors"
            >
              Register
            </Link>
          )
        ) : (
          <Link
            href={`/contest/${contest.slug}`}
            className="inline-flex items-center justify-center w-full px-4 py-2 text-button bg-navy text-white rounded-lg hover:bg-navy-hover transition-colors no-underline"
          >
            {registered ? 'Solve' : 'View Contest'}
          </Link>
        )}
      </div>
    </article>
  );
}

function Section({ title, contests, isUpcoming }) {
  if (contests.length === 0) {
    return (
      <section className="mb-12" aria-labelledby={title.toLowerCase().replace(' ', '-')}>
        <h2 id={title.toLowerCase().replace(' ', '-')} className="text-section-title text-text-primary mb-5">{title}</h2>
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-border-strong mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-body text-text-secondary">No {title.toLowerCase()} contests right now.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12" aria-labelledby={title.toLowerCase().replace(' ', '-')}>
      <h2 id={title.toLowerCase().replace(' ', '-')} className="text-section-title text-text-primary mb-5">{title}</h2>
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2 md:pb-0 -mx-4 md:mx-0 px-4 md:px-0">
        {contests.map((contest) => (
          <ContestCard key={contest.slug} contest={contest} lifecycle={getContestLifecycle(contest.startsAt, contest.endsAt)} isUpcoming={isUpcoming} />
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