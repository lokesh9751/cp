'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  formatIST,
  formatRelativePostedTime,
  formatCountdown,
  formatTimeRemaining,
  getContestLifecycle,
  getDemoNow
} from '@/data/contests';
import {
  getRegistration,
  setRegistration,
  getReaction,
  setReaction,
  getReactionCounts,
  toggleLike,
  toggleDislike
} from '@/data/mockState';

function BackLink() {
  return (
    <Link href="/contest" className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text-primary transition-colors mb-6 no-underline">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      Back to Contests
    </Link>
  );
}

function ContestHeader({ contest, lifecycle, timeDisplay }) {
  const typeClass = contest.type === 'DSA'
    ? 'bg-info-bg text-info'
    : 'bg-warning-bg text-warning';

  return (
    <header className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-section-title text-text-primary">{contest.title}</h1>
        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${typeClass}`}>
          {contest.type}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-small text-text-secondary">
        <span>{formatRelativePostedTime(contest.uploadedAt)}</span>
        <span aria-hidden="true">·</span>
        <span>Starts: {formatIST(contest.startsAt)}</span>
        <span aria-hidden="true">·</span>
        <span>Duration: {contest.durationMinutes} minutes</span>
      </div>
      <div className="mt-3">
        <span className={`inline-flex items-center px-3 py-1 text-small font-medium rounded-lg ${
          lifecycle === 'upcoming' ? 'bg-info-bg text-info' :
          lifecycle === 'ongoing' ? 'bg-warning-bg text-warning' :
          'bg-bg-section text-text-muted'
        }`}>
          {lifecycle === 'upcoming' && `Upcoming — ${timeDisplay}`}
          {lifecycle === 'ongoing' && `Live — ${timeDisplay}`}
          {lifecycle === 'ended' && 'Ended'}
        </span>
      </div>
    </header>
  );
}

function Description({ description }) {
  if (!description) return null;

  const sections = [
    { key: 'overview', label: 'Overview' },
    { key: 'format', label: 'Format' },
    { key: 'scoring', label: 'Scoring' },
    { key: 'rules', label: 'Rules', isList: true },
    { key: 'setterNotes', label: "Setter's Notes" },
  ];

  return (
    <div className="prose prose-sm max-w-none text-text-secondary mb-8">
      {sections.map(({ key, label, isList }) => {
        const content = description[key];
        if (!content) return null;

        if (isList && Array.isArray(content)) {
          return (
            <div key={key} className="mb-4">
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
            <div key={key} className="mb-4">
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

function ActionArea({ contest, lifecycle, registered, onRegister, onSolveClick }) {
  // Upcoming + unregistered
  if (lifecycle === 'upcoming' && !registered) {
    return (
      <div className="mb-6">
        <button
          onClick={onRegister}
          className="inline-flex items-center justify-center px-6 py-3 text-button-lg bg-navy text-white rounded-lg hover:bg-navy-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
        >
          Register
        </button>
      </div>
    );
  }

  // Upcoming + registered
  if (lifecycle === 'upcoming' && registered) {
    return (
      <div className="mb-6">
        <span className="inline-flex items-center justify-center px-6 py-3 text-button-lg bg-success-bg text-success rounded-lg">
          <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Registered
        </span>
      </div>
    );
  }

  // Ongoing + registered
  if (lifecycle === 'ongoing' && registered) {
    return (
      <div className="mb-6">
        <button
          onClick={onSolveClick}
          className="inline-flex items-center justify-center px-6 py-3 text-button-lg bg-navy text-white rounded-lg hover:bg-navy-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card"
        >
          Solve
        </button>
      </div>
    );
  }

  // Ongoing + unregistered
  if (lifecycle === 'ongoing' && !registered) {
    return (
      <div className="mb-6">
        <button
          disabled
          className="inline-flex items-center justify-center px-6 py-3 text-button-lg bg-bg-section text-text-muted rounded-lg cursor-not-allowed"
        >
          Too late
        </button>
      </div>
    );
  }

  // Ended
  return (
    <div className="mb-6">
      <span className="inline-flex items-center justify-center px-6 py-3 text-button-lg bg-bg-section text-text-muted rounded-lg">
        Contest ended
      </span>
    </div>
  );
}

function Reactions({ contest, lifecycle }) {
  const [likeCount, setLikeCount] = useState(contest.initialLikes);
  const [dislikeCount, setDislikeCount] = useState(contest.initialDislikes);
  const [userReaction, setUserReaction] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Initialize from shared state
  useEffect(() => {
    setMounted(true);
    const reaction = getReaction(contest.slug);
    setUserReaction(reaction);
    const counts = getReactionCounts(contest.slug, contest.initialLikes, contest.initialDislikes);
    setLikeCount(counts.likes);
    setDislikeCount(counts.dislikes);
  }, [contest.slug, contest.initialLikes, contest.initialDislikes]);

  // Listen for changes from other tabs/components
  useEffect(() => {
    if (!mounted) return;
    const handleChange = (e) => {
      if (e.detail.type === 'reaction' && (e.detail.slug === contest.slug || e.detail.source === 'storage')) {
        const reaction = getReaction(contest.slug);
        setUserReaction(reaction);
        const counts = getReactionCounts(contest.slug, contest.initialLikes, contest.initialDislikes);
        setLikeCount(counts.likes);
        setDislikeCount(counts.dislikes);
      }
    };
    window.addEventListener('cp-mock-state-change', handleChange);
    return () => window.removeEventListener('cp-mock-state-change', handleChange);
  }, [contest.slug, contest.initialLikes, contest.initialDislikes, mounted]);

  const handleLike = useCallback(() => {
    const newReaction = toggleLike(contest.slug);
    setUserReaction(newReaction);
    const counts = getReactionCounts(contest.slug, contest.initialLikes, contest.initialDislikes);
    setLikeCount(counts.likes);
    setDislikeCount(counts.dislikes);
  }, [contest.slug, contest.initialLikes, contest.initialDislikes]);

  const handleDislike = useCallback(() => {
    const newReaction = toggleDislike(contest.slug);
    setUserReaction(newReaction);
    const counts = getReactionCounts(contest.slug, contest.initialLikes, contest.initialDislikes);
    setLikeCount(counts.likes);
    setDislikeCount(counts.dislikes);
  }, [contest.slug, contest.initialLikes, contest.initialDislikes]);

  return (
    <div className="flex items-center gap-4 pt-4 border-t border-border">
      <div className="flex items-center gap-2">
        <span className="text-small text-text-secondary">Reactions</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              userReaction === 'like'
                ? 'bg-navy/10 text-navy'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-section'
            }`}
            aria-label="Like"
            aria-pressed={userReaction === 'like'}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={userReaction === 'like' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-small font-mono">{likeCount}</span>
          </button>
          <button
            onClick={handleDislike}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 ${
              userReaction === 'dislike'
                ? 'bg-navy/10 text-navy'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-section'
            }`}
            aria-label="Dislike"
            aria-pressed={userReaction === 'dislike'}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill={userReaction === 'dislike' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-small font-mono">{dislikeCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function DemoNote() {
  return (
    <p className="text-xs text-text-muted mt-4" role="note">
      Demo: registration and reactions are saved in this browser.
    </p>
  );
}

export default function ContestDetail({ contest }) {
  const [lifecycle, setLifecycle] = useState('upcoming');
  const [timeDisplay, setTimeDisplay] = useState('');
  const [registered, setRegistered] = useState(() => getRegistration(contest.slug, contest.defaultRegistered));
  const [showSolveNotice, setShowSolveNotice] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Update lifecycle and time display
  useEffect(() => {
    setMounted(true);
    const update = () => {
      const now = getDemoNow();
      const life = getContestLifecycle(contest.startsAt, contest.endsAt, now);
      setLifecycle(life);

      if (life === 'upcoming') {
        setTimeDisplay(formatCountdown(contest.startsAt, now));
      } else if (life === 'ongoing') {
        setTimeDisplay(formatTimeRemaining(contest.endsAt, now));
      } else {
        setTimeDisplay('Ended');
      }

      // Update registration from shared state
      setRegistered(getRegistration(contest.slug, contest.defaultRegistered));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [contest.startsAt, contest.endsAt, contest.slug, contest.defaultRegistered]);

  // Listen for shared state changes
  useEffect(() => {
    if (!mounted) return;
    const handleChange = (e) => {
      if (e.detail.type === 'registration' && e.detail.slug === contest.slug) {
        setRegistered(e.detail.value);
      } else if (e.detail.type === 'registration' && e.detail.source === 'storage') {
        setRegistered(getRegistration(contest.slug, contest.defaultRegistered));
      }
    };
    window.addEventListener('cp-mock-state-change', handleChange);
    return () => window.removeEventListener('cp-mock-state-change', handleChange);
  }, [contest.slug, contest.defaultRegistered, mounted]);

  // Re-evaluate on visibility change
  useEffect(() => {
    if (!mounted) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Force update when tab becomes visible
        const now = getDemoNow();
        const life = getContestLifecycle(contest.startsAt, contest.endsAt, now);
        setLifecycle(life);
        setRegistered(getRegistration(contest.slug, contest.defaultRegistered));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [contest.startsAt, contest.endsAt, contest.slug, contest.defaultRegistered, mounted]);

  const handleRegister = () => {
    // Re-check boundary before saving
    const now = getDemoNow();
    const life = getContestLifecycle(contest.startsAt, contest.endsAt, now);
    if (life !== 'upcoming') return;

    setRegistration(contest.slug, true);
    setRegistered(true);
  };

  const handleSolveClick = () => {
    // Re-check boundary
    const now = getDemoNow();
    const life = getContestLifecycle(contest.startsAt, contest.endsAt, now);
    if (life !== 'ongoing' || !registered) return;

    setShowSolveNotice(true);
    // Auto-dismiss after a few seconds
    setTimeout(() => setShowSolveNotice(false), 3000);
  };

  if (!mounted) {
    // Reserved space neutral loading state
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-border-strong rounded w-1/4" />
        <div className="h-4 bg-border-strong rounded w-1/2" />
        <div className="h-4 bg-border-strong rounded w-3/4" />
        <div className="h-32 bg-border-strong rounded" />
        <div className="h-12 bg-border-strong rounded w-1/3" />
        <div className="h-10 bg-border-strong rounded w-1/4" />
      </div>
    );
  }

  return (
    <article>
      <BackLink />
      <ContestHeader contest={contest} lifecycle={lifecycle} timeDisplay={timeDisplay} />
      <Description description={contest.description} />
      <ActionArea
        contest={contest}
        lifecycle={lifecycle}
        registered={registered}
        onRegister={handleRegister}
        onSolveClick={handleSolveClick}
      />
      {showSolveNotice && (
        <div className="mb-4 p-3 bg-info-bg/10 border border-info/20 rounded-lg text-small text-info" role="alert">
          The contest-solving page is not implemented yet.
        </div>
      )}
      <Reactions contest={contest} lifecycle={lifecycle} />
      <DemoNote />
    </article>
  );
}