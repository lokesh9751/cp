'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  getProblemBySlug,
  toggleProblemBookmark,
  runCode,
  submitCode,
  getSubmissionsByProblem,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const Editor = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-bg-input text-text-muted text-sm">
        Loading editor...
      </div>
    ),
  }
);

const LANGUAGES = [
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'python', label: 'Python', monaco: 'python' },
  { value: 'java', label: 'Java', monaco: 'java' },
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
];

const LANGUAGE_LABELS = {
  cpp: 'C++',
  python: 'Python',
  java: 'Java',
  javascript: 'JavaScript',
};

function getVerdictStyle(verdict) {
  switch (verdict) {
    case 'ACCEPTED':
      return { text: 'text-success', badge: 'bg-success-bg text-success', label: 'Accepted' };
    case 'WRONG_ANSWER':
      return { text: 'text-error', badge: 'bg-error-bg text-error', label: 'Wrong Answer' };
    case 'TIME_LIMIT_EXCEEDED':
      return { text: 'text-warning', badge: 'bg-warning-bg text-warning', label: 'Time Limit Exceeded' };
    case 'COMPILATION_ERROR':
      return { text: 'text-error', badge: 'bg-error-bg text-error', label: 'Compilation Error' };
    case 'RUNTIME_ERROR':
      return { text: 'text-error', badge: 'bg-error-bg text-error', label: 'Runtime Error' };
    case 'RUNNING':
    case 'PENDING':
      return { text: 'text-warning', badge: 'bg-warning-bg text-warning', label: verdict };
    case 'EXECUTED':
      return { text: 'text-info', badge: 'bg-info-bg text-info', label: 'Executed' };
    default:
      return { text: 'text-text-secondary', badge: 'bg-bg-section text-text-secondary', label: verdict || 'Unknown' };
  }
}

function renderInlineMarkdown(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-bg-section border border-border font-mono text-xs text-text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function MarkdownBlock({ content }) {
  if (!content) return null;
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-semibold text-text-primary pt-1">
              {renderInlineMarkdown(trimmed.slice(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-semibold text-text-primary pt-1">
              {renderInlineMarkdown(trimmed.slice(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={i} className="text-xl font-bold text-text-primary pt-1">
              {renderInlineMarkdown(trimmed.slice(2))}
            </h1>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {renderInlineMarkdown(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function ProblemDetailPage({ slug }) {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading, refresh } = useAuth();
  const searchParams = useSearchParams();
  const contestIdParam = searchParams?.get('contestId');
  const contestId = contestIdParam ? Number(contestIdParam) : undefined;

  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const syncTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);

  const [leftTab, setLeftTab] = useState('description');
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const [language, setLanguage] = useState('cpp');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const saveTimerRef = useRef(null);

  const [rightTab, setRightTab] = useState('testcase');
  const [activeCaseTab, setActiveCaseTab] = useState(0);
  const [customInput, setCustomInput] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [execError, setExecError] = useState(null);
  const [selectedResultCase, setSelectedResultCase] = useState(0);
  const [authNotice, setAuthNotice] = useState(null);

  const problemAbortRef = useRef(null);
  const subAbortRef = useRef(null);

  const containerRef = useRef(null);
  const [leftPct, setLeftPct] = useState(28);
  const [rightPct, setRightPct] = useState(28);

  const fetchProblem = useCallback(async () => {
    if (!slug) return;
    if (problemAbortRef.current) problemAbortRef.current.abort();
    const controller = new AbortController();
    problemAbortRef.current = controller;

    setLoading(true);
    setNotFound(false);
    setError(null);

    try {
      const data = await getProblemBySlug(slug, accessToken, { signal: controller.signal });
      if (!data) {
        setNotFound(true);
        return;
      }
      setProblem(data);
      setIsBookmarked(Boolean(data.isBookmarked));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      if (err?.status === 404) {
        setNotFound(true);
      } else {
        setError(err?.message || 'Failed to load problem');
      }
    } finally {
      if (problemAbortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [slug, accessToken]);

  const fetchSubmissions = useCallback(async () => {
    if (!slug || !user || !accessToken) return;
    if (subAbortRef.current) subAbortRef.current.abort();
    const controller = new AbortController();
    subAbortRef.current = controller;

    setSubmissionsLoading(true);
    setSubmissionsError(null);

    try {
      const subs = await getSubmissionsByProblem(slug, accessToken, { signal: controller.signal });
      setSubmissions(subs);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setSubmissionsError(err?.message || 'Failed to load submissions');
    } finally {
      if (subAbortRef.current === controller) {
        setSubmissionsLoading(false);
      }
    }
  }, [slug, user, accessToken]);

  useEffect(() => {
    if (authLoading) return;
    fetchProblem();
    return () => problemAbortRef.current?.abort();
  }, [authLoading, fetchProblem]);

  useEffect(() => {
    if (leftTab === 'submissions' && user && accessToken) {
      fetchSubmissions();
    }
    return () => subAbortRef.current?.abort();
  }, [leftTab, user, accessToken, fetchSubmissions]);

  useEffect(() => {
    if (!problem) return;
    const draftKey = `cp_draft_${slug}_${language}`;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved !== null && saved.trim().length > 0) {
        setCode(saved);
        return;
      }
    } catch {
      // ignore storage access issues
    }
    const starter = problem.starterCode?.[language] ?? '';
    setCode(starter);
  }, [problem, language, slug]);

  useEffect(() => {
    setActiveCaseTab(0);
    setResultData(null);
    setExecError(null);
    setSelectedSubmission(null);
  }, [slug]);

  const handleCodeChange = (value) => {
    const nextVal = value ?? '';
    setCode(nextVal);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`cp_draft_${slug}_${language}`, nextVal);
      } catch {
        // ignore storage errors
      }
    }, 400);
  };

  const handleResetCode = () => {
    const starter = problem?.starterCode?.[language] ?? '';
    setCode(starter);
    try {
      localStorage.removeItem(`cp_draft_${slug}_${language}`);
    } catch {
      // ignore
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleToggleBookmark = async () => {
    if (!user || !accessToken) {
      setAuthNotice('Please sign in to bookmark problems.');
      return;
    }
    if (bookmarkPending) return;
    setBookmarkPending(true);
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    try {
      const res = await toggleProblemBookmark(slug, accessToken);
      setIsBookmarked(Boolean(res.isBookmarked));
    } catch (err) {
      setIsBookmarked(prev);
      if (err?.status === 401 && refresh) {
        const newToken = await refresh();
        if (newToken) {
          try {
            const res = await toggleProblemBookmark(slug, newToken);
            setIsBookmarked(Boolean(res.isBookmarked));
          } catch {
            setIsBookmarked(prev);
          }
        }
      }
    } finally {
      setBookmarkPending(false);
    }
  };

  const handleRun = useCallback(async () => {
    if (isRunning || isSubmitting) return;
    if (!user || !accessToken) {
      setAuthNotice('Please sign in to run code.');
      return;
    }
    if (!code.trim()) return;

    setAuthNotice(null);
    setIsRunning(true);
    setExecError(null);
    setRightTab('result');
    setSelectedResultCase(0);

    try {
      const payload = { slug, language, code };
      if (activeCaseTab === 'custom' && customInput.length > 0) {
        payload.customInput = customInput;
      }
      const data = await runCode(payload, accessToken);
      setResultData({ type: 'run', data });
    } catch (err) {
      setExecError(err?.message || 'Failed to run code');
      setResultData(null);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, isSubmitting, user, accessToken, code, slug, language, activeCaseTab, customInput]);

  const handleSubmit = useCallback(async () => {
    if (isRunning || isSubmitting) return;
    if (!user || !accessToken) {
      setAuthNotice('Please sign in to submit your solution.');
      return;
    }
    if (!code.trim()) return;

    setAuthNotice(null);
    setIsSubmitting(true);
    setExecError(null);
    setRightTab('result');

    try {
      const data = await submitCode(
        { slug, language, code, ...(contestId ? { contestId } : {}) },
        accessToken
      );
      setResultData({ type: 'submit', data });
      fetchSubmissions();
    } catch (err) {
      setExecError(err?.message || 'Submission failed');
      setResultData(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [isRunning, isSubmitting, user, accessToken, code, slug, language, contestId, fetchSubmissions]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSubmit();
        } else {
          handleRun();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleRun, handleSubmit]);

  const startLeftResize = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (moveEvent) => {
      const pct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const maxAllowed = 100 - rightPct - 25;
      setLeftPct(Math.max(18, Math.min(maxAllowed, pct)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startRightResize = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (moveEvent) => {
      const pct = ((rect.right - moveEvent.clientX) / rect.width) * 100;
      const maxAllowed = 100 - leftPct - 25;
      setRightPct(Math.max(20, Math.min(maxAllowed, pct)));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  if (loading || (!problem && !notFound && !error)) {
    return (
      <div className="h-full w-full p-6 bg-bg-page">
        <div className="h-full bg-bg-card border border-border rounded-lg p-6 animate-pulse space-y-4">
          <div className="h-7 bg-border-strong rounded w-1/4" />
          <div className="h-4 bg-border-strong rounded w-1/6" />
          <div className="h-48 bg-border-strong rounded" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center max-w-md w-full">
          <h1 className="text-xl font-semibold text-text-primary mb-2">Problem not found</h1>
          <p className="text-sm text-text-secondary mb-5">
            This problem does not exist or may have been removed.
          </p>
          <button
            type="button"
            onClick={() => router.push('/problems')}
            className="px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg"
          >
            Back to Problems
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center max-w-md w-full">
          <p className="text-sm text-error mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchProblem}
            className="px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sampleCases = problem?.sampleTestCases || [];
  const difficultyBadge =
    problem?.difficulty === 'EASY'
      ? 'bg-easy-bg text-easy'
      : problem?.difficulty === 'MEDIUM'
        ? 'bg-medium-bg text-medium'
        : problem?.difficulty === 'HARD'
          ? 'bg-hard-bg text-hard'
          : 'bg-bg-section text-text-secondary';

  const middlePct = 100 - leftPct - rightPct;

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-bg-page">
      {authNotice && (
        <div className="flex items-center justify-between px-4 py-2 bg-warning-bg border-b border-border text-xs text-warning flex-shrink-0">
          <span>
            {authNotice}{' '}
            <Link href="/login" className="underline font-semibold ml-1">
              Sign In
            </Link>
          </span>
          <button
            type="button"
            onClick={() => setAuthNotice(null)}
            className="text-warning hover:opacity-80 px-1"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden"
      >
        <section
          className="flex flex-col min-h-[380px] lg:min-h-0 lg:h-full bg-bg-card border-b lg:border-b-0 lg:border-r border-border overflow-hidden"
          style={{ flexBasis: `${leftPct}%`, flexGrow: 0, flexShrink: 0 }}
        >
          <div className="flex items-center justify-between border-b border-border bg-bg-section px-2 flex-shrink-0">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setLeftTab('description')}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${leftTab === 'description'
                    ? 'border-navy text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
              >
                Description
              </button>
              <button
                type="button"
                onClick={() => setLeftTab('submissions')}
                className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${leftTab === 'submissions'
                    ? 'border-navy text-text-primary'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
              >
                Submissions
              </button>
            </div>

            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={bookmarkPending}
              className={`p-1.5 rounded transition-colors ${isBookmarked
                  ? 'text-gold hover:bg-bg-card'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
                }`}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill={isBookmarked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
            {leftTab === 'description' ? (
              <div className="space-y-5">
                <div className="space-y-2.5 pb-4 border-b border-border">
                  <h1 className="text-lg font-bold text-text-primary leading-snug">
                    {problem.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-2 py-0.5 rounded font-medium ${difficultyBadge}`}>
                      {problem.difficulty}
                    </span>
                    {problem.acceptanceRate != null && (
                      <span className="text-text-muted font-mono">
                        {problem.acceptanceRate}% acceptance
                      </span>
                    )}
                    {problem.timeLimitMs != null && (
                      <span className="text-text-muted">Time: {problem.timeLimitMs}ms</span>
                    )}
                    {problem.memoryLimitKb != null && (
                      <span className="text-text-muted">
                        Mem: {Math.round(problem.memoryLimitKb / 1024)}MB
                      </span>
                    )}
                  </div>
                  {problem.topics?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {problem.topics.map((topic) => (
                        <span
                          key={topic.slug || topic.name}
                          className="text-xs px-2 py-0.5 bg-bg-section border border-border text-text-secondary rounded"
                        >
                          {topic.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {problem.statement && <MarkdownRenderer content={problem.statement} />}

                {problem.examples && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Examples
                    </h2>
                    <MarkdownBlock content={problem.examples} />
                  </div>
                )}

                {problem.constraints && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                      Constraints
                    </h2>
                    <pre className="bg-bg-input border border-border rounded-md p-3 text-xs font-mono text-text-primary whitespace-pre-wrap break-words">
                      {problem.constraints}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {!user ? (
                  <div className="bg-bg-section border border-border rounded-lg p-5 text-center space-y-2">
                    <p className="text-sm text-text-secondary">
                      Sign in to view your past submissions for this problem.
                    </p>
                    <Link
                      href="/login"
                      className="inline-block px-3 py-1.5 text-xs font-medium bg-navy text-white rounded hover:bg-navy-hover"
                    >
                      Sign In
                    </Link>
                  </div>
                ) : submissionsLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-14 bg-bg-section rounded-md" />
                    ))}
                  </div>
                ) : submissionsError ? (
                  <div className="p-3 bg-error-bg border border-border rounded-md text-xs text-error">
                    {submissionsError}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="bg-bg-section border border-border rounded-lg p-6 text-center">
                    <p className="text-sm font-medium text-text-primary mb-1">No submissions yet</p>
                    <p className="text-xs text-text-muted">
                      Submit a solution to see your history here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {submissions.map((sub) => {
                        const style = getVerdictStyle(sub.status);
                        const isSelected = selectedSubmission?.id === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() =>
                              setSelectedSubmission(isSelected ? null : sub)
                            }
                            className={`w-full text-left p-3 rounded-md border transition-colors ${isSelected
                                ? 'bg-bg-raised border-navy'
                                : 'bg-bg-section border-border hover:border-border-strong'
                              }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${style.badge}`}>
                                {style.label}
                              </span>
                              <span className="text-xs text-text-muted font-mono">
                                {LANGUAGE_LABELS[sub.language] || sub.language}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-text-muted">
                              <span>
                                {sub.runtimeMs != null ? `${sub.runtimeMs}ms` : '—'}
                                {sub.memoryKb != null ? ` · ${sub.memoryKb}KB` : ''}
                              </span>
                              <span>{new Date(sub.createdAt).toLocaleString()}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedSubmission && (
                      <div className="mt-3 bg-bg-input border border-border rounded-md overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-bg-section border-b border-border">
                          <span className="text-xs font-medium text-text-primary">
                            Submission #{selectedSubmission.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedSubmission.language) {
                                setLanguage(selectedSubmission.language);
                              }
                              setCode(selectedSubmission.code || '');
                            }}
                            className="text-xs px-2 py-1 rounded bg-navy text-white hover:bg-navy-hover"
                          >
                            Load in Editor
                          </button>
                        </div>
                        <pre className="p-3 text-xs font-mono text-text-primary overflow-x-auto whitespace-pre">
                          {selectedSubmission.code}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <div
          onMouseDown={startLeftResize}
          className="hidden lg:block w-1.5 bg-bg-page hover:bg-navy cursor-col-resize flex-shrink-0 transition-colors"
          title="Drag to resize"
        />

        <section
          className="flex flex-col min-h-[460px] lg:min-h-0 lg:h-full bg-bg-card border-b lg:border-b-0 lg:border-r border-border overflow-hidden"
          style={{ flexBasis: `${middlePct}%`, flexGrow: 1, flexShrink: 1 }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-bg-section border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={isRunning || isSubmitting}
                aria-label="Programming language"
                className="px-2.5 py-1 text-xs font-medium bg-bg-input text-text-primary border border-border rounded focus:outline-none focus:border-border-focus"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleResetCode}
                disabled={isRunning || isSubmitting}
                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary bg-bg-input border border-border rounded transition-colors"
                title="Reset to starter code"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary bg-bg-input border border-border rounded transition-colors"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning || isSubmitting || !code.trim()}
                title="Run code (Ctrl+Enter)"
                className="px-3.5 py-1 text-xs font-semibold bg-bg-raised text-text-primary border border-border-strong hover:bg-row-hover rounded transition-colors"
              >
                {isRunning ? 'Running...' : 'Run'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isRunning || isSubmitting || !code.trim()}
                title="Submit solution (Ctrl+Shift+Enter)"
                className="px-3.5 py-1 text-xs font-semibold bg-success text-white hover:opacity-90 rounded transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <Editor
              height="100%"
              language={LANGUAGES.find((l) => l.value === language)?.monaco || 'cpp'}
              value={code}
              onChange={handleCodeChange}
              theme={isDark ? 'vs-dark' : 'vs'}
              options={{
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                tabSize: 4,
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>
        </section>

        <div
          onMouseDown={startRightResize}
          className="hidden lg:block w-1.5 bg-bg-page hover:bg-navy cursor-col-resize flex-shrink-0 transition-colors"
          title="Drag to resize"
        />

        <section
          className="flex flex-col min-h-[340px] lg:min-h-0 lg:h-full bg-bg-card overflow-hidden"
          style={{ flexBasis: `${rightPct}%`, flexGrow: 0, flexShrink: 0 }}
        >
          <div className="flex items-center border-b border-border bg-bg-section px-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setRightTab('testcase')}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${rightTab === 'testcase'
                  ? 'border-navy text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
            >
              Testcase
            </button>
            <button
              type="button"
              onClick={() => setRightTab('result')}
              className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${rightTab === 'result'
                  ? 'border-navy text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
            >
              <span>Test Result</span>
              {(isRunning || isSubmitting) && (
                <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              )}
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-thin">
            {rightTab === 'testcase' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {sampleCases.map((tc, idx) => (
                    <button
                      key={tc.id || idx}
                      type="button"
                      onClick={() => setActiveCaseTab(idx)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeCaseTab === idx
                          ? 'bg-navy text-white'
                          : 'bg-bg-section text-text-secondary hover:text-text-primary border border-border'
                        }`}
                    >
                      Case {tc.order ?? idx + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setActiveCaseTab('custom')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${activeCaseTab === 'custom'
                        ? 'bg-navy text-white'
                        : 'bg-bg-section text-text-secondary hover:text-text-primary border border-border'
                      }`}
                  >
                    + Custom
                  </button>
                </div>

                {activeCaseTab === 'custom' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-text-muted">
                      Custom Input (stdin)
                    </label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      rows={6}
                      placeholder="Enter custom input here, then click Run..."
                      className="w-full p-3 text-xs font-mono bg-bg-input text-text-primary border border-border rounded-md focus:outline-none focus:border-border-focus resize-y"
                    />
                    <p className="text-xs text-text-muted">
                      When Custom tab is active and non-empty, clicking <strong>Run</strong> tests your code against this input.
                    </p>
                  </div>
                ) : sampleCases[activeCaseTab] ? (
                  <div className="space-y-3">
                    <div>
                      <span className="block text-xs font-medium text-text-muted mb-1">
                        Input
                      </span>
                      <pre className="p-3 text-xs font-mono bg-bg-input text-text-primary border border-border rounded-md whitespace-pre-wrap break-words">
                        {sampleCases[activeCaseTab].input}
                      </pre>
                    </div>
                    <div>
                      <span className="block text-xs font-medium text-text-muted mb-1">
                        Expected Output
                      </span>
                      <pre className="p-3 text-xs font-mono bg-bg-input text-text-primary border border-border rounded-md whitespace-pre-wrap break-words">
                        {sampleCases[activeCaseTab].expectedOutput}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">
                    No sample test cases available. Use the <strong>+ Custom</strong> tab to run custom input.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {(isRunning || isSubmitting) && (
                  <div className="p-4 bg-bg-section border border-border rounded-md text-xs text-text-secondary">
                    {isSubmitting ? 'Judging against all test cases...' : 'Running code...'}
                  </div>
                )}

                {execError && !isRunning && !isSubmitting && (
                  <div className="p-3 bg-error-bg border border-border rounded-md text-xs text-error">
                    {execError}
                  </div>
                )}

                {!isRunning && !isSubmitting && !execError && !resultData && (
                  <div className="p-6 text-center text-xs text-text-muted border border-dashed border-border rounded-md">
                    Click <strong>Run</strong> or <strong>Submit</strong> to see execution results here.
                  </div>
                )}

                {!isRunning && !isSubmitting && resultData?.type === 'submit' && (() => {
                  const sub = resultData.data.submission;
                  const style = getVerdictStyle(sub?.status);
                  return (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-bg-section border border-border rounded-md space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-bold ${style.text}`}>
                            {style.label}
                          </span>
                          {resultData.data.totalCount != null && (
                            <span className="text-xs font-mono text-text-secondary">
                              {resultData.data.passedCount ?? 0} / {resultData.data.totalCount} passed
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-text-muted font-mono">
                          {sub?.runtimeMs != null && <span>Runtime: {sub.runtimeMs}ms</span>}
                          {sub?.memoryKb != null && <span>Memory: {sub.memoryKb}KB</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {!isRunning && !isSubmitting && resultData?.type === 'run' && resultData.data.mode === 'sample' && (() => {
                  const res = resultData.data;
                  const overall = getVerdictStyle(res.verdict);
                  const cases = res.results || [];
                  const activeCase = cases[selectedResultCase] || cases[0];

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-sm font-bold ${overall.text}`}>
                          {overall.label}
                        </span>
                        <div className="flex gap-2 text-xs text-text-muted font-mono">
                          {res.runtimeMs != null && <span>{res.runtimeMs}ms</span>}
                          {res.memoryKb != null && <span>{res.memoryKb}KB</span>}
                        </div>
                      </div>

                      {cases.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cases.map((c, idx) => {
                            const passed = c.verdict === 'ACCEPTED';
                            return (
                              <button
                                key={c.index ?? idx}
                                type="button"
                                onClick={() => setSelectedResultCase(idx)}
                                className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 border transition-colors ${selectedResultCase === idx
                                    ? 'bg-bg-raised border-navy text-text-primary'
                                    : 'bg-bg-section border-border text-text-secondary'
                                  }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${passed ? 'bg-success' : 'bg-error'
                                    }`}
                                />
                                Case {c.index ?? idx + 1}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {activeCase && (
                        <div className="space-y-3">
                          <div>
                            <span className="block text-xs text-text-muted mb-1">Input</span>
                            <pre className="p-2.5 text-xs font-mono bg-bg-input border border-border rounded whitespace-pre-wrap break-words">
                              {activeCase.input}
                            </pre>
                          </div>
                          <div>
                            <span className="block text-xs text-text-muted mb-1">Output</span>
                            <pre className="p-2.5 text-xs font-mono bg-bg-input border border-border rounded whitespace-pre-wrap break-words">
                              {activeCase.actualOutput || '(empty)'}
                            </pre>
                          </div>
                          <div>
                            <span className="block text-xs text-text-muted mb-1">Expected</span>
                            <pre className="p-2.5 text-xs font-mono bg-bg-input border border-border rounded whitespace-pre-wrap break-words">
                              {activeCase.expectedOutput}
                            </pre>
                          </div>
                          {activeCase.errorOutput && (
                            <div>
                              <span className="block text-xs text-error mb-1">Error</span>
                              <pre className="p-2.5 text-xs font-mono bg-error-bg text-error border border-border rounded whitespace-pre-wrap break-words">
                                {activeCase.errorOutput}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {!isRunning && !isSubmitting && resultData?.type === 'run' && resultData.data.mode === 'custom' && (() => {
                  const res = resultData.data;
                  const style = getVerdictStyle(res.verdict);
                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className={`text-sm font-bold ${style.text}`}>
                          {style.label}
                        </span>
                        <div className="flex gap-2 text-xs text-text-muted font-mono">
                          {res.runtimeMs != null && <span>{res.runtimeMs}ms</span>}
                          {res.memoryKb != null && <span>{res.memoryKb}KB</span>}
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs text-text-muted mb-1">Your Output</span>
                        <pre className="p-2.5 text-xs font-mono bg-bg-input border border-border rounded whitespace-pre-wrap break-words">
                          {res.stdout || '(empty)'}
                        </pre>
                      </div>
                      {res.expectedOutput != null && (
                        <div>
                          <span className="block text-xs text-text-muted mb-1">Expected Output</span>
                          <pre className="p-2.5 text-xs font-mono bg-bg-input border border-border rounded whitespace-pre-wrap break-words">
                            {res.expectedOutput}
                          </pre>
                        </div>
                      )}
                      {res.errorOutput && (
                        <div>
                          <span className="block text-xs text-error mb-1">Error</span>
                          <pre className="p-2.5 text-xs font-mono bg-error-bg text-error border border-border rounded whitespace-pre-wrap break-words">
                            {res.errorOutput}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}