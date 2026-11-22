'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  getProblems,
  adminListContests,
  adminGetContest,
  adminCreateContest,
  adminUpdateContest,
  adminDeleteContest,
} from '@/lib/api';

const CONTEST_TEMPLATES = [
  {
    id: 'sprint',
    label: 'DSA Coding Sprint',
    description: `Welcome to **DSA Coding Sprint**! Solve algorithmic problems under time pressure.

### Format & Rules
- **Duration:** 90 minutes, **4 problems** of increasing difficulty.
- **Scoring:** Points awarded per problem; wrong submissions add a **5-minute penalty** on accepted solve time.
- Plagiarism or sharing code leads to disqualification.`,
  },
  {
    id: 'cp-rated',
    label: 'CP Arena Round',
    description: `Competitive Pirates **CP Arena Round** is live. Focus on optimal time complexity ($O(N \\log N)$ or better) and edge cases.

### Guidelines
- Standard I/O only (\`cin\` / \`sys.stdin\` / \`BufferedReader\`).
- Leaderboard updates **live** as submissions are judged.`,
  },
];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDatetimeLocalValue(dateObj) {
  const d = new Date(dateObj);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultForm() {
  const start = new Date(Date.now() + 10 * 60 * 1000);
  return {
    title: '',
    slug: '',
    type: 'DSA',
    description: CONTEST_TEMPLATES[0].description,
    startsAtLocal: toDatetimeLocalValue(start),
    durationMinutes: 90,
    problems: [],
  };
}

function extractProblemsList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.problems)) return raw.problems;
  if (Array.isArray(raw?.data?.problems)) return raw.data.problems;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

export default function AdminContestsClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [contests, setContests] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [problemFilter, setProblemFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState(null);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setAccessDenied(false);
    try {
      const cList = await adminListContests(accessToken);
      setContests(Array.isArray(cList) ? cList : []);

      let pRaw = null;
      try {
        pRaw = await getProblems({ limit: 100 }, accessToken);
      } catch {
        pRaw = await getProblems(accessToken, { limit: 100 });
      }
      setAllProblems(extractProblemsList(pRaw));
    } catch (err) {
      if (err?.status === 403 || err?.status === 401) {
        setAccessDenied(true);
      } else {
        toast.error(err?.message || 'Failed to load contest studio');
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [authLoading, loadData]);

  const resetForm = () => {
    setEditingId(null);
    setSlugTouched(false);
    setSavedSlug(null);
    setForm(defaultForm());
  };

  const handleEditContest = async (id) => {
    setSavedSlug(null);
    try {
      const c = await adminGetContest(id, accessToken);
      setEditingId(c.id);
      setSlugTouched(true);
      setForm({
        title: c.title || '',
        slug: c.slug || '',
        type: c.type || 'DSA',
        description: c.description || '',
        startsAtLocal: toDatetimeLocalValue(c.startsAt),
        durationMinutes: c.durationMinutes || 90,
        problems: (c.problems || []).map((p) => ({
          problemId: p.problemId,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          points: p.points ?? 100,
        })),
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to load contest');
    }
  };

  const handleDeleteContest = async (id, title) => {
    if (!window.confirm(`Delete contest "${title}"?`)) return;
    try {
      await adminDeleteContest(id, accessToken);
      setContests((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) resetForm();
      toast.success(`Deleted "${title}"`);
    } catch (err) {
      toast.error(err?.message || 'Failed to delete contest');
    }
  };

  const addProblemToContest = (prob) => {
    if (form.problems.some((item) => item.problemId === prob.id)) {
      toast.info('Problem already added to this contest');
      return;
    }
    const nextPoints = (form.problems.length + 1) * 100;
    setForm((prev) => ({
      ...prev,
      problems: [
        ...prev.problems,
        {
          problemId: prob.id,
          title: prob.title,
          slug: prob.slug,
          difficulty: prob.difficulty,
          points: nextPoints,
        },
      ],
    }));
    toast.success(`Added "${prob.title}" (+${nextPoints} pts)`);
  };

  const moveProblem = (idx, dir) => {
    setForm((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.problems.length) return prev;
      const copy = [...prev.problems];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return { ...prev, problems: copy };
    });
  };

  const removeProblemAt = (idx) => {
    setForm((prev) => ({
      ...prev,
      problems: prev.problems.filter((_, i) => i !== idx),
    }));
  };

  const updateProblemPoints = (idx, pts) => {
    setForm((prev) => {
      const copy = [...prev.problems];
      copy[idx] = { ...copy[idx], points: Number(pts) || 100 };
      return { ...prev, problems: copy };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.problems.length === 0) {
      toast.error('Please attach at least 1 problem to the contest.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: (form.slug || slugify(form.title)).trim(),
        type: form.type,
        description: form.description,
        startsAt: new Date(form.startsAtLocal).toISOString(),
        durationMinutes: Number(form.durationMinutes) || 90,
        problems: form.problems.map((p) => ({
          problemId: p.problemId,
          points: Number(p.points) || 100,
        })),
      };

      const saved = editingId
        ? await adminUpdateContest(editingId, payload, accessToken)
        : await adminCreateContest(payload, accessToken);

      setEditingId(saved.id);
      setSlugTouched(true);
      setSavedSlug(saved.slug);
      toast.success(editingId ? 'Contest updated!' : 'Contest created!');
      loadData();
    } catch (err) {
      toast.error(err?.message || 'Failed to save contest');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-sm text-text-muted">Checking permissions...</div>;
  }

  if (!user) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center max-w-md mx-auto">
        <h1 className="text-lg font-semibold text-text-primary mb-2">Admin Sign In Required</h1>
        <Link href="/login" className="inline-block mt-2 px-4 py-2 text-sm font-medium bg-navy text-white rounded-lg">
          Go to Login
        </Link>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="bg-bg-card border border-border rounded-lg p-8 text-center max-w-md mx-auto">
        <h1 className="text-lg font-semibold text-error mb-2">Access Denied</h1>
        <p className="text-sm text-text-secondary">Admin or Superuser privileges required.</p>
      </div>
    );
  }

  const availableProblems = allProblems.filter((p) => {
    const q = problemFilter.trim().toLowerCase();
    if (!q) return true;
    return (p.title || '').toLowerCase().includes(q) || (p.slug || '').toLowerCase().includes(q);
  });

  const totalPoints = form.problems.reduce((sum, p) => sum + (Number(p.points) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Contest Setter Studio</h1>
          <p className="text-sm text-text-secondary">
            Schedule contests, attach problems with point weights, and publish live leaderboards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedSlug && (
            <Link
              href={`/contest/${savedSlug}`}
              className="px-3.5 py-2 text-xs font-semibold bg-bg-card border border-border rounded-lg hover:bg-bg-section"
            >
              View Contest →
            </Link>
          )}
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy-hover"
          >
            + New Contest
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border bg-bg-section">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Contests ({contests.length})
            </span>
          </div>
          <div className="max-h-[75vh] overflow-y-auto divide-y divide-border scrollbar-thin">
            {loading ? (
              <div className="p-4 text-xs text-text-muted">Loading contests...</div>
            ) : contests.length === 0 ? (
              <div className="p-4 text-xs text-text-muted">No contests created yet.</div>
            ) : (
              contests.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 flex items-center justify-between gap-2 ${editingId === c.id ? 'bg-bg-raised' : 'hover:bg-row-hover'
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => handleEditContest(c.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm font-medium text-text-primary truncate">{c.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {c.type} · {c.problemCount} problems · {c.durationMinutes}m
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteContest(c.id, c.title)}
                    className="px-2 py-1 text-xs text-error hover:bg-error-bg rounded"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-bg-card border border-border rounded-lg p-5 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-semibold text-text-primary">
              {editingId ? `Editing Contest #${editingId}` : 'Create New Contest'}
            </h2>
            {editingId && form.slug && (
              <Link href={`/contest/${form.slug}`} className="text-xs font-medium text-info hover:underline">
                Open Contest Page →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Contest Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    title,
                    slug: slugTouched ? prev.slug : slugify(title),
                  }));
                }}
                placeholder="e.g. Weekly Code Storm #1"
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Slug *</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((prev) => ({ ...prev, slug: e.target.value }));
                }}
                className="w-full px-3 py-2 text-sm font-mono bg-bg-input text-text-primary border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Start Time *</label>
              <input
                type="datetime-local"
                required
                value={form.startsAtLocal}
                onChange={(e) => setForm((prev) => ({ ...prev, startsAtLocal: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min={10}
                  max={10080}
                  required
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Track</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
                >
                  <option value="DSA">DSA</option>
                  <option value="CP">CP</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Rules & Description
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {CONTEST_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, description: tpl.description }))}
                    className="px-2 py-1 text-xs bg-bg-section hover:bg-bg-raised border border-border rounded"
                  >
                    {tpl.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPreviewMode((p) => !p)}
                  className="px-2.5 py-1 text-xs font-medium bg-navy text-white rounded"
                >
                  {previewMode ? 'Write' : 'Preview'}
                </button>
              </div>
            </div>

            {previewMode ? (
              <div className="p-4 bg-bg-input border border-border rounded-lg min-h-[150px]">
                <MarkdownRenderer content={form.description} />
              </div>
            ) : (
              <textarea
                rows={6}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 text-sm font-mono bg-bg-input text-text-primary border border-border rounded"
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Contest Problems ({form.problems.length}) · Total {totalPoints} pts
              </label>
              <span className="text-xs text-text-muted">
                Bank loaded: {allProblems.length}
              </span>
            </div>

            {form.problems.length > 0 && (
              <div className="space-y-2">
                {form.problems.map((item, idx) => (
                  <div
                    key={item.problemId}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-bg-section border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded bg-navy text-white text-xs font-bold flex items-center justify-center">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-medium text-text-primary truncate">{item.title}</span>
                      <span className="text-xs text-text-muted">({item.difficulty})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-muted">Pts:</label>
                      <input
                        type="number"
                        min={10}
                        step={10}
                        value={item.points}
                        onChange={(e) => updateProblemPoints(idx, e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono bg-bg-input text-text-primary border border-border rounded"
                      />
                      <button type="button" onClick={() => moveProblem(idx, -1)} className="px-1.5 py-1 text-xs bg-bg-input border border-border rounded">↑</button>
                      <button type="button" onClick={() => moveProblem(idx, 1)} className="px-1.5 py-1 text-xs bg-bg-input border border-border rounded">↓</button>
                      <button type="button" onClick={() => removeProblemAt(idx)} className="px-2 py-1 text-xs text-error hover:bg-error-bg rounded">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-bg-input border border-border rounded-lg space-y-2">
              <input
                type="text"
                value={problemFilter}
                onChange={(e) => setProblemFilter(e.target.value)}
                placeholder="Filter bank problems to add..."
                className="w-full px-3 py-1.5 text-xs bg-bg-card text-text-primary border border-border rounded"
              />
              <div className="max-h-44 overflow-y-auto divide-y divide-border scrollbar-thin">
                {availableProblems.length === 0 ? (
                  <div className="py-3 text-xs text-text-muted">
                    {allProblems.length === 0
                      ? 'No problems available from bank. Check backend /api/problems.'
                      : 'No problems match your filter.'}
                  </div>
                ) : (
                  availableProblems.map((prob) => {
                    const alreadyAdded = form.problems.some((x) => x.problemId === prob.id);
                    return (
                      <div key={prob.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <span className="font-medium text-text-primary">{prob.title}</span>
                          <span className="ml-2 text-text-muted">[{prob.difficulty}]</span>
                        </div>
                        <button
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => addProblemToContest(prob)}
                          className="px-2.5 py-1 rounded bg-navy text-white font-medium hover:bg-navy-hover disabled:opacity-40"
                        >
                          {alreadyAdded ? 'Added' : '+ Add'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium bg-bg-section text-text-secondary border border-border rounded-lg"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-lg hover:opacity-90"
            >
              {saving ? 'Saving...' : editingId ? 'Update Contest' : 'Publish Contest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}