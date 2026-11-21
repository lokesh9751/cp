'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { categories, difficulties, topics, statuses } from '@/lib/mockData';
import { getBookmark, toggleBookmark } from '@/data/mockState';

const FILTERS_STORAGE_KEY = 'competitive-pirates-problem-filters-v1';
const BOOKMARKS_KEY = 'competitive-pirates-bookmarks-v1';

/**
 * Parse URL search params into filter object
 */
function parseFiltersFromUrl(searchParams) {
  const typeParam = searchParams.get('type');
  return {
    search: searchParams.get('search') || '',
    difficulty: searchParams.get('difficulty') || 'All',
    topic: searchParams.get('topic') || 'All',
    status: searchParams.get('status') || 'All',
    type: typeParam || null, // 'dsa', 'cp', or null (for default "All")
  };
}

/**
 * Build URL search params from filter object and category
 */
function buildUrlFromFilters(filters, category) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.difficulty && filters.difficulty !== 'All') params.set('difficulty', filters.difficulty);
  if (filters.topic && filters.topic !== 'All') params.set('topic', filters.topic);
  if (filters.status && filters.status !== 'All') params.set('status', filters.status);
  if (category && category !== 'All') params.set('type', category === 'Competitive Programming' ? 'cp' : 'dsa');
  return params.toString();
}

/**
 * Get filters from localStorage
 */
function getFiltersFromStorage() {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        search: parsed.search || '',
        difficulty: parsed.difficulty || 'All',
        topic: parsed.topic || 'All',
        status: parsed.status || 'All',
      };
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Save filters to localStorage
 */
function saveFiltersToStorage(filters) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch (e) {
    // ignore
  }
}

/**
 * Map URL type param to category label
 */
function typeToCategory(typeParam) {
  if (!typeParam) return 'All';
  if (typeParam === 'dsa') return 'DSA';
  if (typeParam === 'cp') return 'Competitive Programming';
  return 'All';
}

function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-badge-default-bg text-badge-default-text',
    easy: 'bg-easy-bg text-easy',
    medium: 'bg-medium-bg text-medium',
    hard: 'bg-hard-bg text-hard',
    solved: 'bg-success-bg text-success',
    attempted: 'bg-warning-bg text-warning',
    unsolved: 'bg-bg-section text-text-muted',
    dsa: 'bg-info-bg text-info',
    cp: 'bg-warning-bg text-warning',
    gold: 'bg-gold/10 text-gold-text border border-gold/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

function CategorySelector({ activeCategory, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2 -mx-4 px-4 mt-4" role="tablist" aria-label="Problem category">
      {categories.map((category) => (
        <button
          key={category}
          role="tab"
          aria-selected={activeCategory === category}
          onClick={() => onChange(category)}
          className={`flex-shrink-0 px-4 py-2 text-small-lg font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeCategory === category
              ? 'bg-navy text-white shadow-subtle'
              : 'bg-bg-section text-text-primary hover:bg-navy hover:text-white'
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

function FilterBar({ filters, onFilterChange, onClearFilters, hasActiveFilters }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-border" role="search" aria-label="Problem filters">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          placeholder="Search by problem title"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-shadow"
          aria-label="Search problems"
        />
      </div>

      {/* Difficulty */}
      <select
        value={filters.difficulty}
        onChange={(e) => onFilterChange('difficulty', e.target.value)}
        className="px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-shadow appearance-none bg-no-repeat bg-right pr-8"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236B7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center' }}
        aria-label="Filter by difficulty"
      >
        {difficulties.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {/* Topic */}
      <select
        value={filters.topic}
        onChange={(e) => onFilterChange('topic', e.target.value)}
        className="px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-shadow appearance-none bg-no-repeat bg-right pr-8 max-w-[180px]"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236B7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center' }}
        aria-label="Filter by topic"
      >
        {topics.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={filters.status}
        onChange={(e) => onFilterChange('status', e.target.value)}
        className="px-4 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-shadow appearance-none bg-no-repeat bg-right pr-8"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236B7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center' }}
        aria-label="Filter by status"
      >
        {statuses.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="px-3 py-2 text-small text-text-secondary hover:text-text-primary hover:bg-bg-section rounded-lg transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function QuestionRow({ question, isBookmarked, onToggleBookmark }) {
  const statusVariants = {
    Solved: 'solved',
    Attempted: 'attempted',
    Unsolved: 'unsolved',
  };

  const typeVariants = {
    DSA: 'dsa',
    CP: 'cp',
  };

  const handleBookmarkClick = useCallback((e) => {
    e.preventDefault();
    onToggleBookmark(question.id);
  }, [question.id, onToggleBookmark]);

  return (
    <tr className="border-t border-border hover:bg-row-hover transition-colors">
      <td className="px-4 py-3">
        <a href={`/problem/${question.id}`} className="text-body font-medium text-text-primary hover:text-navy transition-colors no-underline">
          {question.title}
        </a>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <Badge variant={typeVariants[question.type]}>{question.type}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant={question.difficulty.toLowerCase()}>{question.difficulty}</Badge>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="flex flex-wrap gap-1.5">
          {question.topics.slice(0, 2).map((topic) => (
            <Badge key={topic} variant="default" className="text-xs">{topic}</Badge>
          ))}
          {question.topics.length > 2 && (
            <Badge variant="default" className="text-xs text-text-muted">+{question.topics.length - 2}</Badge>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right hidden md:table-cell">
        {question.acceptanceRate !== null && question.acceptanceRate !== undefined ? (
          <span className="text-small text-text-secondary font-mono">{question.acceptanceRate}%</span>
        ) : (
          <span className="text-small text-text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusVariants[question.status]}>{question.status}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          className={`p-1.5 rounded transition-colors ${
            isBookmarked
              ? 'text-gold hover:bg-gold/10'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-section'
          }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          aria-pressed={isBookmarked}
          onClick={handleBookmarkClick}
        >
          <svg className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function QuestionSkeleton() {
  return (
    <tr className="border-t border-border animate-pulse-slow">
      <td className="px-4 py-3"><div className="h-5 w-3/4 bg-border-strong rounded" /></td>
      <td className="px-4 py-3 hidden md:table-cell"><div className="h-5 w-16 bg-border-strong rounded-badge" /></td>
      <td className="px-4 py-3"><div className="h-5 w-20 bg-border-strong rounded-badge" /></td>
      <td className="px-4 py-3 hidden lg:table-cell"><div className="h-5 w-32 bg-border-strong rounded-badge" /></td>
      <td className="px-4 py-3 text-right hidden md:table-cell"><div className="h-5 w-16 bg-border-strong rounded" /></td>
      <td className="px-4 py-3"><div className="h-5 w-24 bg-border-strong rounded-badge" /></td>
      <td className="px-4 py-3 text-right"><div className="h-5 w-5 bg-border-strong rounded" /></td>
    </tr>
  );
}

function QuestionCard({ question, isBookmarked, onToggleBookmark }) {
  const statusVariants = {
    Solved: 'solved',
    Attempted: 'attempted',
    Unsolved: 'unsolved',
  };

  const typeVariants = {
    DSA: 'dsa',
    CP: 'cp',
  };

  const handleBookmarkClick = useCallback((e) => {
    e.preventDefault();
    onToggleBookmark(question.id);
  }, [question.id, onToggleBookmark]);

  return (
    <article className="bg-bg-card border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <a href={`/problem/${question.id}`} className="text-card-title text-text-primary hover:text-navy transition-colors line-clamp-1 flex-1 pr-2 no-underline">
          {question.title}
        </a>
        <Badge variant={typeVariants[question.type]} className="shrink-0">{question.type}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-small text-text-secondary mb-2">
        <Badge variant={question.difficulty.toLowerCase()}>{question.difficulty}</Badge>
        <span className="text-text-muted">·</span>
        {question.topics.slice(0, 2).map((topic) => (
          <Badge key={topic} variant="default" className="text-xs">{topic}</Badge>
        ))}
        {question.topics.length > 2 && (
          <Badge variant="default" className="text-xs text-text-muted">+{question.topics.length - 2}</Badge>
        )}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          {question.acceptanceRate !== null && question.acceptanceRate !== undefined && (
            <span className="text-small text-text-secondary font-mono">{question.acceptanceRate}% acceptance</span>
          )}
          <Badge variant={statusVariants[question.status]}>{question.status}</Badge>
        </div>
        <button
          type="button"
          className={`p-1.5 rounded transition-colors ${
            isBookmarked
              ? 'text-gold hover:bg-gold/10'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-section'
          }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          aria-pressed={isBookmarked}
          onClick={handleBookmarkClick}
        >
          <svg className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>
    </article>
  );
}

function EmptyState({ onClearFilters }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-12 text-center">
      <svg className="w-16 h-16 mx-auto text-border-strong mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="3" y1="21" x2="9" y2="15" />
        <line x1="9" y1="3" x2="15" y2="9" />
      </svg>
      <h3 className="text-card-title text-text-primary mb-1">No questions match your filters</h3>
      <p className="text-body text-text-secondary mb-4">Try adjusting your filters or search terms.</p>
      <button
        onClick={onClearFilters}
        className="inline-flex items-center gap-2 px-4 py-2 text-button border border-navy text-navy rounded-lg hover:bg-navy hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        Clear filters
      </button>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Pagination">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 text-small text-text-secondary border border-border rounded-lg hover:bg-bg-section hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Previous page"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div className="flex items-center gap-1" role="navigation" aria-label="Page numbers">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const showPage =
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1);

          if (!showPage) {
            return page === currentPage - 2 || page === currentPage + 2 ? (
              <span key={`ellipsis-${page}`} className="px-2 text-text-muted" aria-hidden="true">…</span>
            ) : null;
          }

          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 text-small font-medium rounded-lg transition-colors ${
                page === currentPage
                  ? 'bg-navy text-white'
                  : 'text-text-secondary hover:bg-bg-section hover:text-text-primary'
              }`}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 text-small text-text-secondary border border-border rounded-lg hover:bg-bg-section hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Next page"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </nav>
  );
}

export default function PracticeQuestions({ questions: allQuestions }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Initialize category from URL type param first
  const [activeCategory, setActiveCategory] = useState(() => {
    if (!searchParams) return 'All';
    return typeToCategory(searchParams.get('type'));
  });

  // Initialize filters: URL takes precedence, then localStorage, then defaults
  const [filters, setFilters] = useState(() => {
    // First check URL params
    const urlFilters = searchParams ? parseFiltersFromUrl(searchParams) : { search: '', difficulty: 'All', topic: 'All', status: 'All' };
    const hasUrlFilters = urlFilters.search || urlFilters.difficulty !== 'All' || urlFilters.topic !== 'All' || urlFilters.status !== 'All';
    if (hasUrlFilters) {
      return {
        search: urlFilters.search,
        difficulty: urlFilters.difficulty,
        topic: urlFilters.topic,
        status: urlFilters.status,
      };
    }
    // Then check localStorage
    const storedFilters = getFiltersFromStorage();
    if (storedFilters) {
      return storedFilters;
    }
    // Finally defaults
    return {
      search: '',
      difficulty: 'All',
      topic: 'All',
      status: 'All',
    };
  });

  // Sync category from URL when it changes externally
  useEffect(() => {
    if (!searchParams) return;
    const typeParam = searchParams.get('type');
    setActiveCategory(typeToCategory(typeParam));
  }, [searchParams]);

  // Sync filters when URL params change externally
  useEffect(() => {
    if (!searchParams) return;
    const urlFilters = parseFiltersFromUrl(searchParams);
    const hasUrlFilters = urlFilters.search || urlFilters.difficulty !== 'All' || urlFilters.topic !== 'All' || urlFilters.status !== 'All';
    if (hasUrlFilters) {
      setFilters({
        search: urlFilters.search,
        difficulty: urlFilters.difficulty,
        topic: urlFilters.topic,
        status: urlFilters.status,
      });
    }
  }, [searchParams]);

  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarks, setBookmarks] = useState([]);

  const questionsPerPage = 15;

  // Initialize bookmarks state
  useEffect(() => {
    if (typeof window === 'undefined' || !allQuestions || !Array.isArray(allQuestions)) return;
    const loadBookmarks = () => {
      const bookmarkedIds = new Set();
      allQuestions.forEach(q => {
        if (q && q.id !== undefined && getBookmark(q.id)) {
            bookmarkedIds.add(String(q.id));
        }
      });
      setBookmarks(Array.from(bookmarkedIds));
    };
    loadBookmarks();
  }, [allQuestions]);

  // Listen for cross-tab bookmark changes
  useEffect(() => {
    if (typeof window === 'undefined' || !allQuestions || !Array.isArray(allQuestions)) return;

    const handleStorageChange = (e) => {
      if (e.key === BOOKMARKS_KEY || (e.key && e.key.startsWith('competitive-pirates'))) {
        // Re-check all bookmarks
        const bookmarkedIds = new Set();
        allQuestions.forEach(q => {
          if (q && q.id !== undefined && getBookmark(q.id)) {
            bookmarkedIds.add(String(q.id));
          }
        });
        setBookmarks(Array.from(bookmarkedIds));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [allQuestions]);

  // Filter questions based on category and filters
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      // Category filter
      if (activeCategory !== 'All' && q.type !== (activeCategory === 'Competitive Programming' ? 'CP' : 'DSA')) {
        return false;
      }
      // Search filter
      if (filters.search && !q.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      // Difficulty filter
      if (filters.difficulty !== 'All' && q.difficulty !== filters.difficulty) {
        return false;
      }
      // Topic filter
      if (filters.topic !== 'All' && !q.topics.includes(filters.topic)) {
        return false;
      }
      // Status filter
      if (filters.status !== 'All' && q.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [allQuestions, activeCategory, filters]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, filters]);

  // Sync filters to URL and localStorage
  useEffect(() => {
    const queryString = buildUrlFromFilters(filters, activeCategory);
    router.replace(`${pathname}?${queryString}`, { scroll: false });
    saveFiltersToStorage(filters);
  }, [filters, activeCategory, pathname, router]);

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  const hasActiveFilters =
    filters.search ||
    filters.difficulty !== 'All' ||
    filters.topic !== 'All' ||
    filters.status !== 'All' ||
    activeCategory !== 'All';

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      difficulty: 'All',
      topic: 'All',
      status: 'All',
    });
    setActiveCategory('All');
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
  };

  const handleToggleBookmark = useCallback((questionId) => {
    const newBookmarks = toggleBookmark(questionId);
    setBookmarks(prev => {
      const set = new Set(prev);
      if (newBookmarks) {
        set.add(questionId);
      } else {
        set.delete(questionId);
      }
      return Array.from(set);
    });
  }, []);

  return (
    <section aria-labelledby="questions-heading">
      <header className="mb-6">
        <h2 id="questions-heading" className="text-section-title text-text-primary">Practice questions</h2>
        <CategorySelector activeCategory={activeCategory} onChange={handleCategoryChange} />
      </header>

      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {paginatedQuestions.length === 0 ? (
        <EmptyState onClearFilters={handleClearFilters} />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left" role="table">
              <thead>
                <tr className="bg-bg-section border-b border-border">
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Title</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Type</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Difficulty</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Topics</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary text-right">Acceptance</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-small font-medium text-text-secondary text-right w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuestions.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    isBookmarked={bookmarks.includes(question.id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {paginatedQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                isBookmarked={bookmarks.includes(question.id)}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </section>
  );
}