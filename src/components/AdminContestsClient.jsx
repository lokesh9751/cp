'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  adminListProblems,
  adminListContests,
  adminGetContest,
  adminCreateContest,
  adminUpdateContest,
  adminDeleteContest,
  adminCreateContestProblem,
} from '@/lib/api';

const DIVISION_LABELS = {
  OPEN: 'Open (All)',
  DIV1: 'Div 1',
  DIV2: 'Div 2',
  DIV3: 'Div 3',
};

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
  const start = new Date(Date.now() + 5 * 60 * 1000);
  return {
    title: '',
    slug: '',
    type: 'CP',
    division: 'DIV2',
    description: CONTEST_TEMPLATES[1].description,
    startsAtLocal: toDatetimeLocalValue(start),
    durationMinutes: 90,
    problems: [],
  };
}

function defaultProblemDraft(track = 'CP') {
  return {
    title: '',
    difficulty: 'MEDIUM',
    type: track,
    points: 100,
    timeLimitMs: 2000,
    statement: '',
    constraints: '1 <= N <= 10^5',
    testCases: [
      { input: '', expectedOutput: '', isSample: true },
      { input: '', expectedOutput: '', isSample: false },
    ],
  };
}

export default function AdminContestsClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [contests, setContests] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [problemFilter, setProblemFilter] = useState('');
  const [problemMode, setProblemMode] = useState('create'); // 'create' | 'bank'
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState(null);

  const [draft, setDraft] = useState(() => defaultProblemDraft('CP'));
  const [creatingProblem, setCreatingProblem] = useState(false);

  const loadData = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setAccessDenied(false);
    try {
      const [cList, pList] = await Promise.all([
        adminListContests(accessToken),
        adminListProblems(accessToken),
      ]);
      setContests(Array.isArray(cList) ? cList : []);
      setAllProblems(Array.isArray(pList) ? pList : []);
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
    setDraft(defaultProblemDraft('CP'));
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
        type: c.type || 'CP',
        division: c.division || 'OPEN',
        description: c.description || '',
        startsAtLocal: toDatetimeLocalValue(c.startsAt),
        durationMinutes: c.durationMinutes || 90,
        problems: (c.problems || []).map((p) => ({
          problemId: p.problemId,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          isPublic: p.isPublic,
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

  const addProblemToContest = (prob, customPoints = null) => {
    if (form.problems.some((item) => item.problemId === prob.id)) {
      toast.info('Problem already added to this contest');
      return;
    }
    const nextPoints = customPoints ?? (form.problems.length + 1) * 100;
    setForm((prev) => ({
      ...prev,
      problems: [
        ...prev.problems,
        {
          problemId: prob.id,
          title: prob.title,
          slug: prob.slug,
          difficulty: prob.difficulty,
          isPublic: prob.isPublic ?? true,
          points: nextPoints,
        },
      ],
    }));
    toast.success(`Added "${prob.title}" (+${nextPoints} pts)`);
  };

  const handleCreateInlineProblem = async () => {
    const validCases = draft.testCases.filter((tc) => tc.expectedOutput.trim().length > 0);
    if (!draft.title.trim()) {
      toast.error('Problem title is required');
      return;
    }
    if (draft.statement.trim().length < 10) {
      toast.error('Problem statement must be at least 10 characters');
      return;
    }
    if (validCases.length === 0) {
      toast.error('Add at least 1 test case with expected output');
      return;
    }

    setCreatingProblem(true);
    try {
      const created = await adminCreateContestProblem(
        {
          title: draft.title.trim(),
          type: form.type,
          difficulty: draft.difficulty,
          isPublic: false,
          statement: draft.statement.trim(),
          constraints: draft.constraints.trim(),
          timeLimitMs: Number(draft.timeLimitMs) || 2000,
          testCases: validCases,
        },
        accessToken
      );
      setAllProblems((prev) => [created, ...prev]);
      addProblemToContest(created, Number(draft.points) || (form.problems.length + 1) * 100);
      setDraft(defaultProblemDraft(form.type));
    } catch (err) {
      toast.error(err?.message || 'Failed to create contest problem');
    } finally {
      setCreatingProblem(false);
    }
  };

  const updateDraftTestCase = (idx, field, value) => {
    setDraft((prev) => {
      const copy = [...prev.testCases];
      copy[idx] = { ...copy[idx], [field]: value };
      return { ...prev, testCases: copy };
    });
  };

  const addDraftTestCase = () => {
    setDraft((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '', isSample: false }],
    }));
  };

  const removeDraftTestCase = (idx) => {
    setDraft((prev) => ({
      ...prev,
      testCases: prev.testCases.filter((_, i) => i !== idx),
    }));
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
      toast.error('Please add at least 1 problem to the contest.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: (form.slug || slugify(form.title)).trim(),
        type: form.type,
        division: form.division,
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
      toast.success(editingId ? 'Contest updated!' : 'Contest published!');
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
            Create division contests (Div 1/2/3), author exclusive contest problems, and run live leaderboards.
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-text-primary truncate">{c.title}</p>
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-info-bg text-info shrink-0">
                        {DIVISION_LABELS[c.division] || 'Open'}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {c.type} · {c.problemCount} problems · {c.durationMinutes}m · {c.registrationCount || 0} reg
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
                Open Contest Arena →
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
                placeholder="e.g. Pirates Round #1 (Div. 2)"
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

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Duration (m)</label>
                <input
                  type="number"
                  min={10}
                  max={10080}
                  required
                  value={form.durationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  className="w-full px-2.5 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Division</label>
                <select
                  value={form.division}
                  onChange={(e) => setForm((prev) => ({ ...prev, division: e.target.value }))}
                  className="w-full px-2 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
                >
                  <option value="DIV1">Div 1</option>
                  <option value="DIV2">Div 2</option>
                  <option value="DIV3">Div 3</option>
                  <option value="OPEN">Open (All)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Track</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className="w-full px-2 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
                >
                  <option value="CP">CP</option>
                  <option value="DSA">DSA</option>
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
              <div className="p-4 bg-bg-input border border-border rounded-lg min-h-[140px]">
                <MarkdownRenderer content={form.description} />
              </div>
            ) : (
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 text-sm font-mono bg-bg-input text-text-primary border border-border rounded"
              />
            )}
          </div>

          {/* Attached Contest Problems */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Contest Problems ({form.problems.length}) · Total {totalPoints} pts
              </label>
              <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setProblemMode('create')}
                  className={`px-3 py-1 font-medium ${problemMode === 'create'
                      ? 'bg-navy text-white'
                      : 'bg-bg-section text-text-secondary hover:text-text-primary'
                    }`}
                >
                  + Author New Problem
                </button>
                <button
                  type="button"
                  onClick={() => setProblemMode('bank')}
                  className={`px-3 py-1 font-medium ${problemMode === 'bank'
                      ? 'bg-navy text-white'
                      : 'bg-bg-section text-text-secondary hover:text-text-primary'
                    }`}
                >
                  Import from Bank ({allProblems.length})
                </button>
              </div>
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
                      {item.isPublic === false && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-warning-bg text-warning">
                          Contest-Only
                        </span>
                      )}
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

            {problemMode === 'create' ? (
              <div className="p-4 bg-bg-input border border-border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">
                    Create Exclusive Contest Problem (Hidden from Public Bank)
                  </span>
                  <span className="text-[11px] text-text-muted">Auto-attached as Problem {String.fromCharCode(65 + form.problems.length)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Problem Title *"
                    className="sm:col-span-2 px-3 py-1.5 text-xs bg-bg-card text-text-primary border border-border rounded"
                  />
                  <select
                    value={draft.difficulty}
                    onChange={(e) => setDraft((p) => ({ ...p, difficulty: e.target.value }))}
                    className="px-2.5 py-1.5 text-xs bg-bg-card text-text-primary border border-border rounded"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                  <input
                    type="number"
                    min={10}
                    step={50}
                    value={draft.points}
                    onChange={(e) => setDraft((p) => ({ ...p, points: e.target.value }))}
                    placeholder="Points"
                    className="px-2.5 py-1.5 text-xs font-mono bg-bg-card text-text-primary border border-border rounded"
                  />
                </div>

                <textarea
                  rows={4}
                  value={draft.statement}
                  onChange={(e) => setDraft((p) => ({ ...p, statement: e.target.value }))}
                  placeholder="Problem statement (Markdown & LaTeX supported) *"
                  className="w-full p-2.5 text-xs font-mono bg-bg-card text-text-primary border border-border rounded"
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={draft.constraints}
                    onChange={(e) => setDraft((p) => ({ ...p, constraints: e.target.value }))}
                    placeholder="Constraints (e.g. 1 <= N <= 10^5)"
                    className="sm:col-span-2 px-3 py-1.5 text-xs font-mono bg-bg-card text-text-primary border border-border rounded"
                  />
                  <input
                    type="number"
                    min={250}
                    step={250}
                    value={draft.timeLimitMs}
                    onChange={(e) => setDraft((p) => ({ ...p, timeLimitMs: e.target.value }))}
                    placeholder="Time Limit (ms)"
                    className="px-2.5 py-1.5 text-xs font-mono bg-bg-card text-text-primary border border-border rounded"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-muted">Test Cases ({draft.testCases.length})</span>
                    <button
                      type="button"
                      onClick={addDraftTestCase}
                      className="text-xs font-medium text-info hover:underline"
                    >
                      + Add Test Case
                    </button>
                  </div>
                  {draft.testCases.map((tc, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start p-2 bg-bg-card border border-border rounded">
                      <textarea
                        rows={2}
                        value={tc.input}
                        onChange={(e) => updateDraftTestCase(idx, 'input', e.target.value)}
                        placeholder={`Input #${idx + 1}`}
                        className="sm:col-span-5 p-1.5 text-xs font-mono bg-bg-input text-text-primary border border-border rounded"
                      />
                      <textarea
                        rows={2}
                        value={tc.expectedOutput}
                        onChange={(e) => updateDraftTestCase(idx, 'expectedOutput', e.target.value)}
                        placeholder={`Expected Output #${idx + 1} *`}
                        className="sm:col-span-5 p-1.5 text-xs font-mono bg-bg-input text-text-primary border border-border rounded"
                      />
                      <div className="sm:col-span-2 flex sm:flex-col items-center justify-between gap-1 text-[11px]">
                        <label className="inline-flex items-center gap-1 text-text-secondary cursor-pointer">
                          <input
                            type="checkbox"
                            checked={tc.isSample}
                            onChange={(e) => updateDraftTestCase(idx, 'isSample', e.target.checked)}
                          />
                          Sample
                        </label>
                        {draft.testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDraftTestCase(idx)}
                            className="text-error hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={creatingProblem}
                    onClick={handleCreateInlineProblem}
                    className="px-4 py-1.5 text-xs font-semibold bg-navy text-white rounded hover:bg-navy-hover disabled:opacity-50"
                  >
                    {creatingProblem ? 'Creating...' : 'Create & Attach Problem'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-bg-input border border-border rounded-lg space-y-2">
                <input
                  type="text"
                  value={problemFilter}
                  onChange={(e) => setProblemFilter(e.target.value)}
                  placeholder="Filter existing problems to attach..."
                  className="w-full px-3 py-1.5 text-xs bg-bg-card text-text-primary border border-border rounded"
                />
                <div className="max-h-44 overflow-y-auto divide-y divide-border scrollbar-thin">
                  {availableProblems.length === 0 ? (
                    <div className="py-3 text-xs text-text-muted">
                      {allProblems.length === 0
                        ? 'No problems found in admin problem bank.'
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
            )}
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