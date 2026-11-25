'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { getProblems, toggleProblemBookmark } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const FILTERS_STORAGE_KEY = 'competitive-pirates-problem-filters-v2';
const PAGE_LIMIT = 10;

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'dsa', label: 'DSA' },
  { value: 'cp', label: 'Competitive Programming' },
];

const DIFFICULTIES = [
  { value: 'all', label: 'Difficulty: All' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const STATUSES = [
  { value: 'all', label: 'Status: All' },
  { value: 'solved', label: 'Solved' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'unsolved', label: 'Unsolved' },
];

const VALID_TYPES = new Set(['all', 'dsa', 'cp']);
const VALID_DIFFICULTIES = new Set(['all', 'easy', 'medium', 'hard']);
const VALID_STATUSES = new Set(['all', 'solved', 'attempted', 'unsolved']);

function normalizeFilterState(raw = {}) {
  const type = VALID_TYPES.has(String(raw.type || '').toLowerCase())
    ? String(raw.type).toLowerCase()
    : 'all';
  const difficulty = VALID_DIFFICULTIES.has(String(raw.difficulty || '').toLowerCase())
    ? String(raw.difficulty).toLowerCase()
    : 'all';
  const status = VALID_STATUSES.has(String(raw.status || '').toLowerCase())
    ? String(raw.status).toLowerCase()
    : 'all';
  const topic = raw.topic && raw.topic !== 'All' ? String(raw.topic) : 'all';
  const search = typeof raw.search === 'string' ? raw.search : '';
  const parsedPage = Number.parseInt(raw.page, 10);
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  return { type, search, difficulty, topic, status, page };
}

function readFiltersFromUrl(searchParams) {
  const keys = ['type', 'search', 'difficulty', 'topic', 'status', 'page'];
  const hasAny = keys.some((k) => searchParams.has(k));
  if (!hasAny) return null;

  return normalizeFilterState({
    type: searchParams.get('type'),
    search: searchParams.get('search') || '',
    difficulty: searchParams.get('difficulty'),
    topic: searchParams.get('topic'),
    status: searchParams.get('status'),
    page: searchParams.get('page'),
  });
}

function readFiltersFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return normalizeFilterState({ ...parsed, page: 1 });
    }
  } catch {
    // ignore
  }
  return null;
}

function saveFiltersToStorage(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      FILTERS_STORAGE_KEY,
      JSON.stringify({
        type: state.type,
        search: state.search,
        difficulty: state.difficulty,
        topic: state.topic,
        status: state.status,
      })
    );
  } catch {
    // ignore
  }
}

function buildQueryString(state) {
  const params = new URLSearchParams();
  if (state.type !== 'all') params.set('type', state.type);
  if (state.search.trim()) params.set('search', state.search.trim());
  if (state.difficulty !== 'all') params.set('difficulty', state.difficulty);
  if (state.topic !== 'all') params.set('topic', state.topic);
  if (state.status !== 'all') params.set('status', state.status);
  if (state.page > 1) params.set('page', String(state.page));
  return params.toString();
}

function formatEnumLabel(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatAcceptance(rate) {
  if (rate === null || rate === undefined || Number.isNaN(Number(rate))) {
    return '—';
  }
  const num = Number(rate);
  return `${Number.isInteger(num) ? num : num.toFixed(1)}%`;
}

function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-bg-section text-text-secondary border border-border',
    easy: 'bg-easy-bg text-easy',
    medium: 'bg-medium-bg text-medium',
    hard: 'bg-hard-bg text-hard',
    solved: 'bg-success-bg text-success',
    attempted: 'bg-warning-bg text-warning',
    unsolved: 'bg-bg-section text-text-muted',
    dsa: 'bg-info-bg text-info',
    cp: 'bg-warning-bg text-warning',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${variants[variant] || variants.default
        } ${className}`}
    >
      {children}
    </span>
  );
}

function BookmarkButton({ slug, isBookmarked, isPending, onToggle }) {
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(slug);
      }}
      className={`w-8 h-8 inline-flex items-center justify-center rounded-md bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy ${isBookmarked
          ? 'text-gold hover:bg-bg-section'
          : 'text-text-muted hover:text-text-primary hover:bg-bg-section'
        }`}
      aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      aria-pressed={isBookmarked}
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill={isBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}

const SELECT_CHEVRON_STYLE = {
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236B7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")',
  backgroundPosition: 'right 0.75rem center',
};

export default function PracticeQuestions() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, accessToken, isLoading: authLoading, refresh } = useAuth();

  // SSR-safe initial state (never read localStorage during initial render)
  const [filters, setFilters] = useState(() => {
    const fromUrl = searchParams ? readFiltersFromUrl(searchParams) : null;
    return fromUrl || normalizeFilterState();
  });

  const [searchInput, setSearchInput] = useState(filters.search);
  const [filtersReady, setFiltersReady] = useState(false);

  const [problems, setProblems] = useState([]);
  const [topics, setTopics] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookmarkError, setBookmarkError] = useState(null);
  const [pendingBookmarks, setPendingBookmarks] = useState(() => new Set());

  const filtersRef = useRef(filters);
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const userIdRef = useRef(user?.id || null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  // Restore saved localStorage filters AFTER hydration
  useEffect(() => {
    const fromUrl = searchParams ? readFiltersFromUrl(searchParams) : null;
    if (!fromUrl) {
      const fromStorage = readFiltersFromStorage();
      if (fromStorage) {
        filtersRef.current = fromStorage;
        setFilters(fromStorage);
        setSearchInput(fromStorage.search);
        const qs = buildQueryString(fromStorage);
        if (qs) {
          router.replace(`${pathname}?${qs}`, { scroll: false });
        }
      }
    }
    setFiltersReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL to state on browser Back/Forward
  useEffect(() => {
    if (!filtersReady || !searchParams) return;
    const fromUrl = readFiltersFromUrl(searchParams);
    if (!fromUrl) return;

    const prev = filtersRef.current;
    if (
      prev.type === fromUrl.type &&
      prev.search === fromUrl.search &&
      prev.difficulty === fromUrl.difficulty &&
      prev.topic === fromUrl.topic &&
      prev.status === fromUrl.status &&
      prev.page === fromUrl.page
    ) {
      return;
    }
    filtersRef.current = fromUrl;
    setFilters(fromUrl);
    setSearchInput(fromUrl.search);
  }, [searchParams, filtersReady]);

  const syncUrlAndStorage = useCallback(
    (nextState) => {
      saveFiltersToStorage(nextState);
      const qs = buildQueryString(nextState);
      const nextUrl = qs ? `${pathname}?${qs}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router]
  );

  const updateFilter = useCallback(
    (key, value) => {
      const next = normalizeFilterState({
        ...filtersRef.current,
        [key]: value,
        page: key === 'page' ? value : 1,
      });
      filtersRef.current = next;
      setFilters(next);
      syncUrlAndStorage(next);
    },
    [syncUrlAndStorage]
  );

  const handleSearchChange = (value) => {
    setSearchInput(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const next = normalizeFilterState({
        ...filtersRef.current,
        search: value,
        page: 1,
      });
      filtersRef.current = next;
      setFilters(next);
      syncUrlAndStorage(next);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleClearFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInput('');
    const reset = normalizeFilterState();
    filtersRef.current = reset;
    setFilters(reset);
    syncUrlAndStorage(reset);
  };

  const fetchProblems = useCallback(
    async (activeFilters = filters) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const reqId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const data = await getProblems(
          {
            type: activeFilters.type,
            search: activeFilters.search,
            difficulty: activeFilters.difficulty,
            topic: activeFilters.topic,
            status: activeFilters.status,
            page: activeFilters.page,
            limit: PAGE_LIMIT,
          },
          accessToken,
          { signal: controller.signal }
        );

        if (reqId !== requestIdRef.current) return;

        const nextPagination = data.pagination || {
          page: activeFilters.page,
          limit: PAGE_LIMIT,
          total: 0,
          totalPages: 0,
        };

        if (nextPagination.totalPages > 0 && activeFilters.page > nextPagination.totalPages) {
          const clamped = { ...activeFilters, page: nextPagination.totalPages };
          filtersRef.current = clamped;
          setFilters(clamped);
          syncUrlAndStorage(clamped);
          return;
        }

        setProblems(data.problems || []);
        if (Array.isArray(data.topics) && data.topics.length > 0) {
          setTopics(data.topics);
        }
        setPagination(nextPagination);
      } catch (err) {
        if (err?.name === 'AbortError' || reqId !== requestIdRef.current) return;
        setError(err?.message || 'Failed to load problems');
        setProblems([]);
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [accessToken, filters, syncUrlAndStorage]
  );

  // Wait for auth & filter restoration, then fetch
  useEffect(() => {
    if (authLoading || !filtersReady) return;
    fetchProblems(filters);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [authLoading, filtersReady, user?.id, accessToken, filters, fetchProblems]);

  // Clear inline bookmark error on auth change
  useEffect(() => {
    setBookmarkError(null);
    setPendingBookmarks(new Set());
  }, [user?.id]);

  const handleToggleBookmark = useCallback(
    async (slug) => {
      if (authLoading) return;
      if (!user || !accessToken) {
        router.push('/login');
        return;
      }

      if (pendingBookmarks.has(slug)) return;

      const currentUserId = user.id;
      const target = problems.find((p) => p.slug === slug);
      if (!target) return;

      const previousValue = Boolean(target.isBookmarked);
      setBookmarkError(null);

      setPendingBookmarks((prev) => {
        const next = new Set(prev);
        next.add(slug);
        return next;
      });
      setProblems((prev) =>
        prev.map((p) => (p.slug === slug ? { ...p, isBookmarked: !previousValue } : p))
      );

      try {
        let result;
        try {
          result = await toggleProblemBookmark(slug, accessToken);
        } catch (err) {
          if (err?.status === 401 && refresh) {
            const newToken = await refresh();
            if (newToken) {
              result = await toggleProblemBookmark(slug, newToken);
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }

        if (userIdRef.current !== currentUserId) return;

        setProblems((prev) =>
          prev.map((p) =>
            p.slug === slug ? { ...p, isBookmarked: Boolean(result.isBookmarked) } : p
          )
        );
      } catch (err) {
        if (userIdRef.current !== currentUserId) return;

        if (err?.status === 401) {
          router.push('/login');
          return;
        }

        if (err?.isNetworkError) {
          setBookmarkError('Network error while updating bookmark. Refreshing state...');
          fetchProblems(filters);
        } else {
          setProblems((prev) =>
            prev.map((p) =>
              p.slug === slug ? { ...p, isBookmarked: previousValue } : p
            )
          );
          setBookmarkError(err?.message || 'Could not update bookmark.');
        }
      } finally {
        setPendingBookmarks((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      }
    },
    [authLoading, user, accessToken, pendingBookmarks, problems, refresh, router, fetchProblems, filters]
  );

  const hasActiveFilters =
    filters.type !== 'all' ||
    Boolean(filters.search.trim()) ||
    filters.difficulty !== 'all' ||
    filters.topic !== 'all' ||
    filters.status !== 'all';

  return (
    <section aria-labelledby="questions-heading">
      <header className="mb-6">
        <h2 id="questions-heading" className="text-section-title text-text-primary">
          Problems
        </h2>

        {/* Category Tabs */}
        <div
          className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 -mx-4 px-4 mt-4"
          role="tablist"
          aria-label="Problem category"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              role="tab"
              aria-selected={filters.type === cat.value}
              onClick={() => updateFilter('type', cat.value)}
              className={`flex-shrink-0 px-4 py-2 text-small-lg font-medium rounded-lg transition-colors whitespace-nowrap ${filters.type === cat.value
                  ? 'bg-navy text-white'
                  : 'bg-bg-section text-text-primary hover:bg-navy hover:text-white'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Filter Bar */}
      <div
        className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-border"
        role="search"
        aria-label="Problem filters"
      >
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search by problem title"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy"
            aria-label="Search problems"
          />
        </div>

        <select
          value={filters.difficulty}
          onChange={(e) => updateFilter('difficulty', e.target.value)}
          className="px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy appearance-none bg-no-repeat pr-8"
          style={SELECT_CHEVRON_STYLE}
          aria-label="Filter by difficulty"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          value={filters.topic}
          onChange={(e) => updateFilter('topic', e.target.value)}
          className="px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy appearance-none bg-no-repeat pr-8 max-w-[190px]"
          style={SELECT_CHEVRON_STYLE}
          aria-label="Filter by topic"
        >
          <option value="all">Topic: All</option>
          {topics.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => updateFilter('status', e.target.value)}
          className="px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy appearance-none bg-no-repeat pr-8"
          style={SELECT_CHEVRON_STYLE}
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-3 py-2 text-small text-text-secondary hover:text-text-primary hover:bg-bg-section rounded-lg transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {bookmarkError && (
        <div
          className="mb-4 p-3 bg-error-bg border border-border rounded-lg text-small text-error"
          role="alert"
        >
          {bookmarkError}
        </div>
      )}

      {/* Loading / Error / Empty / Results */}
      {loading ? (
        <div className="bg-bg-card border border-border rounded-lg overflow-hidden animate-pulse">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="px-4 py-4 border-b border-border last:border-b-0 flex items-center justify-between gap-4"
            >
              <div className="h-4 bg-border-strong rounded w-1/3" />
              <div className="h-4 bg-border-strong rounded w-16" />
              <div className="h-4 bg-border-strong rounded w-24 hidden md:block" />
              <div className="h-4 bg-border-strong rounded w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-body text-error mb-4">{error}</p>
          <button
            type="button"
            onClick={() => fetchProblems(filters)}
            className="px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : problems.length === 0 ? (
        <div className="bg-bg-card border border-border rounded-lg p-12 text-center">
          <h3 className="text-card-title text-text-primary mb-1">
            No questions match your filters
          </h3>
          <p className="text-body text-text-secondary mb-4">
            Try adjusting your filters or search terms.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto bg-bg-card border border-border rounded-lg">
            <table className="w-full text-left" role="table">
              <thead>
                <tr className="bg-bg-section border-b border-border">
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Title</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Type</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Difficulty</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Topics</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary text-right">Acceptance</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary text-right w-14">
                    <span className="sr-only">Bookmark</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {problems.map((q) => {
                  const statusKey = (q.userStatus || 'UNSOLVED').toLowerCase();
                  const diffKey = (q.difficulty || 'EASY').toLowerCase();
                  const typeKey = (q.type || 'DSA').toLowerCase();

                  return (
                    <tr
                      key={q.slug}
                      className="border-t border-border hover:bg-row-hover transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/problem/${q.slug}`}
                          prefetch={false}
                          className="text-body font-medium text-text-primary hover:text-navy transition-colors no-underline"
                        >
                          {q.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={typeKey}>{q.type}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={diffKey}>{formatEnumLabel(q.difficulty)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {(q.topics || []).slice(0, 2).map((t) => (
                            <Badge key={t.slug} variant="default">
                              {t.name}
                            </Badge>
                          ))}
                          {(q.topics || []).length > 2 && (
                            <Badge variant="default">+{q.topics.length - 2}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-small text-text-secondary font-mono">
                          {formatAcceptance(q.acceptanceRate)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusKey}>
                          {formatEnumLabel(q.userStatus || 'UNSOLVED')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <BookmarkButton
                          slug={q.slug}
                          isBookmarked={Boolean(q.isBookmarked)}
                          isPending={pendingBookmarks.has(q.slug)}
                          onToggle={handleToggleBookmark}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {problems.map((q) => {
              const statusKey = (q.userStatus || 'UNSOLVED').toLowerCase();
              const diffKey = (q.difficulty || 'EASY').toLowerCase();
              const typeKey = (q.type || 'DSA').toLowerCase();

              return (
                <article
                  key={q.slug}
                  className="bg-bg-card border border-border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      href={`/problem/${q.slug}`}
                      prefetch={false}
                      className="text-card-title text-text-primary hover:text-navy transition-colors line-clamp-1 flex-1 pr-2 no-underline"
                    >
                      {q.title}
                    </Link>
                    <Badge variant={typeKey} className="shrink-0">
                      {q.type}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <Badge variant={diffKey}>{formatEnumLabel(q.difficulty)}</Badge>
                    {(q.topics || []).slice(0, 2).map((t) => (
                      <Badge key={t.slug} variant="default">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-small text-text-secondary font-mono">
                        {formatAcceptance(q.acceptanceRate)}
                      </span>
                      <Badge variant={statusKey}>
                        {formatEnumLabel(q.userStatus || 'UNSOLVED')}
                      </Badge>
                    </div>
                    <BookmarkButton
                      slug={q.slug}
                      isBookmarked={Boolean(q.isBookmarked)}
                      isPending={pendingBookmarks.has(q.slug)}
                      onToggle={handleToggleBookmark}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <nav
              className="flex flex-wrap items-center justify-center gap-2 mt-8"
              aria-label="Pagination"
            >
              <span className="text-small text-text-secondary px-2">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} problems)
              </span>
              <button
                type="button"
                onClick={() => updateFilter('page', pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-small text-text-secondary border border-border rounded-lg hover:bg-bg-section hover:text-text-primary transition-colors"
                aria-label="Previous page"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const show =
                    pageNum === 1 ||
                    pageNum === pagination.totalPages ||
                    (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1);
                  if (!show) {
                    return pageNum === pagination.page - 2 || pageNum === pagination.page + 2 ? (
                      <span key={`e-${pageNum}`} className="px-2 text-text-muted">
                        …
                      </span>
                    ) : null;
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => updateFilter('page', pageNum)}
                      className={`w-9 h-9 text-small font-medium rounded-lg transition-colors ${pageNum === pagination.page
                          ? 'bg-navy text-white'
                          : 'text-text-secondary hover:bg-bg-section hover:text-text-primary'
                        }`}
                      aria-current={pageNum === pagination.page ? 'page' : undefined}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => updateFilter('page', pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 text-small text-text-secondary border border-border rounded-lg hover:bg-bg-section hover:text-text-primary transition-colors"
                aria-label="Next page"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}