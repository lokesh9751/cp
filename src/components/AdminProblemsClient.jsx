'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import {
  adminListProblems,
  adminGetProblem,
  adminCreateProblem,
  adminUpdateProblem,
  adminDeleteProblem,
  adminGenerateOutput,
} from '@/lib/api';

const DESCRIPTION_TEMPLATES = [
  {
    id: 'standard-dsa',
    label: 'Standard DSA',
    statement: `Given an input array of size $n$, compute the required result efficiently.

### Input Format
- First line: an integer $n$.
- Second line: $n$ space-separated integers $a_0, a_1, \dots, a_{n-1}$.

### Output Format
Print a single integer representing the answer.

### Explanation
Explain the sample case step by step here.`,
    constraints: `1 <= n <= 10^5\n-10^9 <= a[i] <= 10^9`,
  },
  {
    id: 'array-string',
    label: 'Array / String',
    statement: `Given an array of length $n$ and a target value $k$, find **the required answer** in $O(n)$ or $O(n \log n)$ time.

### Input Format
- Line 1: two integers $n$ and $k$.
- Line 2: $n$ space-separated integers.

### Output Format
Print the answer on a single line.`,
    constraints: `1 <= n <= 10^5\n0 <= k <= 10^9\n-10^9 <= nums[i] <= 10^9`,
  },
  {
    id: 'graph-tree',
    label: 'Graph / Tree',
    statement: `You are given a graph with $n$ vertices (1-indexed) and $m$ edges.

### Input Format
- Line 1: two integers $n$ and $m$.
- Next $m$ lines: two integers $u$ and $v$ representing an edge between $u$ and $v$.

### Output Format
Print the shortest distance or required value, or \`-1\` if unreachable.`,
    constraints: `1 <= n <= 10^5\n0 <= m <= 2 * 10^5\n1 <= u, v <= n`,
  },
  {
    id: 'cp-queries',
    label: 'CP / Queries',
    statement: `You are given an array of $n$ elements and $q$ queries.

- Type \`1 l r val\`: update range $[l, r]$.
- Type \`2 l r\`: query range $[l, r]$.

### Input Format
- Line 1: two integers $n$ and $q$.
- Line 2: $n$ space-separated integers.
- Next $q$ lines: each line describes a query.

### Output Format
For each Type \`2\` query, output the answer on a new line.`,
    constraints: `1 <= n, q <= 10^5\n-10^9 <= a[i], val <= 10^9`,
  },
];

const DEFAULT_BOILERPLATES = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Read input and print output
    return 0;
}
`,
  python: `import sys

def solve():
    data = sys.stdin.read().split()
    if not data:
        return
    # Write your solution here

if __name__ == "__main__":
    solve()
`,
  java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // Read input and print output
    }
}
`,
  javascript: `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf8').trim();
    if (!input) return;
    // Write your solution here
}

solve();
`,
};

const TOPIC_SUGGESTIONS = [
  'Arrays',
  'Strings',
  'Hash Table',
  'Two Pointers',
  'Binary Search',
  'Dynamic Programming',
  'Graphs',
  'Trees',
  'Greedy',
  'Stack',
  'Linked List',
  'Segment Tree',
  'Math',
];

const CONSTRAINT_SNIPPETS = [
  '1 <= n <= 10^5',
  '-10^9 <= a[i] <= 10^9',
  '1 <= |s| <= 10^5',
  '1 <= t <= 10^4',
];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function emptyForm() {
  return {
    title: '',
    slug: '',
    type: 'DSA',
    difficulty: 'EASY',
    statement: DESCRIPTION_TEMPLATES[0].statement,
    constraints: DESCRIPTION_TEMPLATES[0].constraints,
    timeLimitMs: 2000,
    memoryLimitKb: 262144,
    topicsText: '',
    starterCode: { ...DEFAULT_BOILERPLATES },
    referenceLang: 'cpp',
    referenceCode: DEFAULT_BOILERPLATES.cpp,
    testCases: [
      { input: '', expectedOutput: '', isSample: true },
      { input: '', expectedOutput: '', isSample: false },
    ],
  };
}

export default function AdminProblemsClient() {
  const { user, accessToken, isLoading: authLoading } = useAuth();

  const [problems, setProblems] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [statementTab, setStatementTab] = useState('edit');
  const [starterTab, setStarterTab] = useState('cpp');

  const [saving, setSaving] = useState(false);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [lastSavedSlug, setLastSavedSlug] = useState(null);

  const statementRef = useRef(null);

  const loadList = useCallback(async () => {
    if (!accessToken) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setAccessDenied(false);
    try {
      const list = await adminListProblems(accessToken);
      setProblems(list);
    } catch (err) {
      if (err?.status === 403 || err?.status === 401) {
        setAccessDenied(true);
      } else {
        toast.error(err?.message || 'Failed to load problems');
      }
    } finally {
      setListLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (authLoading) return;
    loadList();
  }, [authLoading, loadList]);

  const startNewProblem = () => {
    setEditingId(null);
    setSlugTouched(false);
    setLastSavedSlug(null);
    setForm(emptyForm());
    setStatementTab('edit');
  };

  const handleSelectProblem = async (id) => {
    setLoadingProblem(true);
    setLastSavedSlug(null);
    try {
      const p = await adminGetProblem(id, accessToken);
      setEditingId(p.id);
      setSlugTouched(true);
      const refLang = p.referenceLang || 'cpp';
      setForm({
        title: p.title || '',
        slug: p.slug || '',
        type: p.type || 'DSA',
        difficulty: p.difficulty || 'EASY',
        statement: p.statement || '',
        constraints: p.constraints || '',
        timeLimitMs: p.timeLimitMs ?? 2000,
        memoryLimitKb: p.memoryLimitKb ?? 262144,
        topicsText: (p.topics || []).join(', '),
        starterCode: {
          cpp: p.starterCode?.cpp || '',
          python: p.starterCode?.python || '',
          java: p.starterCode?.java || '',
          javascript: p.starterCode?.javascript || '',
        },
        referenceLang: refLang,
        referenceCode: p.referenceCode || DEFAULT_BOILERPLATES[refLang] || '',
        testCases:
          p.testCases?.length > 0
            ? p.testCases.map((tc) => ({
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                isSample: Boolean(tc.isSample),
              }))
            : [{ input: '', expectedOutput: '', isSample: true }],
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to load problem');
    } finally {
      setLoadingProblem(false);
    }
  };

  const handleReferenceLangChange = (nextLang) => {
    setForm((prev) => {
      const currentIsDefault = Object.values(DEFAULT_BOILERPLATES).some(
        (tpl) => tpl.trim() === prev.referenceCode.trim()
      );
      return {
        ...prev,
        referenceLang: nextLang,
        referenceCode:
          !prev.referenceCode.trim() || currentIsDefault
            ? DEFAULT_BOILERPLATES[nextLang] || ''
            : prev.referenceCode,
      };
    });
  };

  const handleDeleteProblem = async (id, title) => {
    if (!window.confirm(`Delete "${title}" permanently? This also deletes its test cases.`)) {
      return;
    }
    try {
      await adminDeleteProblem(id, accessToken);
      setProblems((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) {
        startNewProblem();
      }
      toast.success(`Deleted "${title}".`);
    } catch (err) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  const insertMarkdown = (before, after = '') => {
    const el = statementRef.current;
    if (!el) {
      setForm((prev) => ({ ...prev, statement: `${prev.statement}${before}${after}` }));
      return;
    }
    const start = el.selectionStart ?? form.statement.length;
    const end = el.selectionEnd ?? form.statement.length;
    const selected = form.statement.slice(start, end);
    const next =
      form.statement.slice(0, start) + before + selected + after + form.statement.slice(end);
    setForm((prev) => ({ ...prev, statement: next }));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + before.length + selected.length;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const applyTemplate = (tpl) => {
    setForm((prev) => ({
      ...prev,
      statement: tpl.statement,
      constraints: tpl.constraints,
    }));
    toast.info(`Applied "${tpl.label}" template`);
  };

  const toggleTopicChip = (topic) => {
    const current = form.topicsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const exists = current.some((t) => t.toLowerCase() === topic.toLowerCase());
    const next = exists
      ? current.filter((t) => t.toLowerCase() !== topic.toLowerCase())
      : [...current, topic];
    setForm((prev) => ({ ...prev, topicsText: next.join(', ') }));
  };

  const addConstraintSnippet = (snippet) => {
    setForm((prev) => ({
      ...prev,
      constraints: prev.constraints.trim()
        ? `${prev.constraints.trim()}\n${snippet}`
        : snippet,
    }));
  };

  const updateTestCase = (idx, patch) => {
    setForm((prev) => {
      const next = [...prev.testCases];
      next[idx] = { ...next[idx], ...patch };
      return { ...prev, testCases: next };
    });
  };

  const addTestCase = (isSample) => {
    setForm((prev) => ({
      ...prev,
      testCases: [...prev.testCases, { input: '', expectedOutput: '', isSample }],
    }));
  };

  const removeTestCase = (idx) => {
    setForm((prev) => {
      if (prev.testCases.length <= 1) return prev;
      return {
        ...prev,
        testCases: prev.testCases.filter((_, i) => i !== idx),
      };
    });
  };

  const handleGenerateOne = async (idx) => {
    if (!form.referenceCode.trim()) {
      toast.error('Add a Reference Solution first to auto-generate outputs.');
      return;
    }
    setGeneratingIndex(idx);
    try {
      const res = await adminGenerateOutput(
        {
          language: form.referenceLang,
          code: form.referenceCode,
          input: form.testCases[idx].input,
          timeLimitMs: form.timeLimitMs,
          memoryLimitKb: form.memoryLimitKb,
        },
        accessToken
      );
      if (res.errorOutput) {
        toast.error(`Case #${idx + 1} (${res.verdict}): ${res.errorOutput}`);
      } else {
        updateTestCase(idx, { expectedOutput: res.stdout });
        toast.success(`Case #${idx + 1} output generated (${res.runtimeMs ?? 0}ms)`);
      }
    } catch (err) {
      toast.error(err?.message || 'Output generation failed');
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleGenerateAll = async () => {
    if (!form.referenceCode.trim()) {
      toast.error('Add a Reference Solution first to auto-generate outputs.');
      return;
    }
    setGeneratingAll(true);
    let hadError = false;
    try {
      const nextCases = [...form.testCases];
      for (let i = 0; i < nextCases.length; i++) {
        const res = await adminGenerateOutput(
          {
            language: form.referenceLang,
            code: form.referenceCode,
            input: nextCases[i].input,
            timeLimitMs: form.timeLimitMs,
            memoryLimitKb: form.memoryLimitKb,
          },
          accessToken
        );
        if (res.errorOutput) {
          toast.error(`Case #${i + 1} failed (${res.verdict}): ${res.errorOutput}`);
          hadError = true;
          break;
        }
        nextCases[i] = { ...nextCases[i], expectedOutput: res.stdout };
      }
      setForm((prev) => ({ ...prev, testCases: nextCases }));
      if (!hadError) {
        toast.success(`Generated expected outputs for all ${nextCases.length} test cases!`);
      }
    } catch (err) {
      toast.error(err?.message || 'Batch generation failed');
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: (form.slug || slugify(form.title)).trim(),
      type: form.type,
      difficulty: form.difficulty,
      statement: form.statement,
      constraints: form.constraints,
      timeLimitMs: Number(form.timeLimitMs) || 2000,
      memoryLimitKb: Number(form.memoryLimitKb) || 262144,
      topics: form.topicsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      starterCode: form.starterCode,
      referenceCode: form.referenceCode,
      referenceLang: form.referenceLang,
      testCases: form.testCases.map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: Boolean(tc.isSample),
      })),
    };

    try {
      const saved = editingId
        ? await adminUpdateProblem(editingId, payload, accessToken)
        : await adminCreateProblem(payload, accessToken);

      setEditingId(saved.id);
      setSlugTouched(true);
      setLastSavedSlug(saved.slug);
      setForm((prev) => ({ ...prev, slug: saved.slug }));
      toast.success(editingId ? 'Problem updated!' : 'Problem created!');
      loadList();
    } catch (err) {
      toast.error(err?.message || 'Failed to save problem');
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

  const filteredProblems = problems.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  const activeTopicsSet = new Set(
    form.topicsText
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Problem Setter Studio</h1>
          <p className="text-sm text-text-secondary">
            Create problems with templates, LaTeX math preview, and Judge0 output auto-generation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastSavedSlug && (
            <Link
              href={`/problem/${lastSavedSlug}`}
              className="px-3.5 py-2 text-xs font-semibold bg-bg-card border border-border rounded-lg hover:bg-bg-section"
            >
              Open in IDE →
            </Link>
          )}
          <button
            type="button"
            onClick={startNewProblem}
            className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy-hover"
          >
            + New Problem
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-4 bg-bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-3 border-b border-border bg-bg-section space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Problems ({problems.length})
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or slug..."
              className="w-full px-3 py-1.5 text-xs bg-bg-input text-text-primary border border-border rounded focus:outline-none focus:border-border-focus"
            />
          </div>

          <div className="max-h-[75vh] overflow-y-auto divide-y divide-border scrollbar-thin">
            {listLoading ? (
              <div className="p-4 text-xs text-text-muted">Loading problems...</div>
            ) : filteredProblems.length === 0 ? (
              <div className="p-4 text-xs text-text-muted">No matching problems.</div>
            ) : (
              filteredProblems.map((p) => {
                const isSelected = editingId === p.id;
                const diffCls =
                  p.difficulty === 'EASY'
                    ? 'bg-easy-bg text-easy'
                    : p.difficulty === 'MEDIUM'
                      ? 'bg-medium-bg text-medium'
                      : 'bg-hard-bg text-hard';
                return (
                  <div
                    key={p.id}
                    className={`p-3 flex items-center justify-between gap-2 transition-colors ${
                      isSelected ? 'bg-bg-raised' : 'hover:bg-row-hover'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectProblem(p.id)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${diffCls}`}>
                          {p.difficulty}
                        </span>
                        <span className="text-[11px] text-text-muted">{p.type}</span>
                        <span className="text-[11px] text-text-muted">{p.testCaseCount} cases</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProblem(p.id, p.title)}
                      className="px-2 py-1 text-xs text-error hover:bg-error-bg rounded"
                    >
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-bg-card border border-border rounded-lg p-5 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-semibold text-text-primary">
              {loadingProblem
                ? 'Loading problem...'
                : editingId
                  ? `Editing Problem #${editingId}`
                  : 'Create New Problem'}
            </h2>
            {editingId && form.slug && (
              <Link href={`/problem/${form.slug}`} className="text-xs font-medium text-info hover:underline">
                View Live IDE →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Title *</label>
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
                placeholder="e.g. Subarray Sum Equals K"
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded focus:outline-none focus:border-border-focus"
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
                className="w-full px-3 py-2 text-sm font-mono bg-bg-input text-text-primary border border-border rounded focus:outline-none focus:border-border-focus"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
              >
                <option value="DSA">DSA</option>
                <option value="CP">CP</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Time Limit (ms)</label>
              <input
                type="number"
                value={form.timeLimitMs}
                onChange={(e) => setForm((prev) => ({ ...prev, timeLimitMs: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Memory Limit (KB)</label>
              <input
                type="number"
                value={form.memoryLimitKb}
                onChange={(e) => setForm((prev) => ({ ...prev, memoryLimitKb: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded"
              />
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-muted">Topics</label>
            <input
              type="text"
              value={form.topicsText}
              onChange={(e) => setForm((prev) => ({ ...prev, topicsText: e.target.value }))}
              placeholder="Arrays, Hash Table, Dynamic Programming"
              className="w-full px-3 py-2 text-sm bg-bg-input text-text-primary border border-border rounded focus:outline-none focus:border-border-focus"
            />
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_SUGGESTIONS.map((topic) => {
                const selected = activeTopicsSet.has(topic.toLowerCase());
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopicChip(topic)}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      selected
                        ? 'bg-navy text-white border-navy'
                        : 'bg-bg-section text-text-secondary border-border hover:text-text-primary'
                    }`}
                  >
                    {selected ? `✓ ${topic}` : `+ ${topic}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description with Templates + Markdown/LaTeX Preview */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Problem Statement (Markdown + $LaTeX$)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-text-muted">Templates:</span>
                {DESCRIPTION_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="px-2 py-1 text-xs bg-bg-section hover:bg-bg-raised text-text-primary border border-border rounded"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-bg-section border-b border-border">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setStatementTab('edit')}
                    className={`px-2.5 py-1 text-xs font-medium rounded ${
                      statementTab === 'edit' ? 'bg-navy text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Write
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatementTab('preview')}
                    className={`px-2.5 py-1 text-xs font-medium rounded ${
                      statementTab === 'preview' ? 'bg-navy text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Live Preview
                  </button>
                </div>

                {statementTab === 'edit' && (
                  <div className="flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => insertMarkdown('\n### Heading\n')} className="px-2 py-0.5 text-xs bg-bg-input border border-border rounded">H3</button>
                    <button type="button" onClick={() => insertMarkdown('**', '**')} className="px-2 py-0.5 text-xs font-bold bg-bg-input border border-border rounded">B</button>
                    <button type="button" onClick={() => insertMarkdown('`', '`')} className="px-2 py-0.5 text-xs font-mono bg-bg-input border border-border rounded">`code`</button>
                    <button type="button" onClick={() => insertMarkdown('$', '$')} className="px-2 py-0.5 text-xs font-mono bg-bg-input border border-border rounded">$x$</button>
                    <button type="button" onClick={() => insertMarkdown('\n- ')} className="px-2 py-0.5 text-xs bg-bg-input border border-border rounded">• List</button>
                    <button
                      type="button"
                      onClick={() => insertMarkdown('\n### Input Format\n- \n\n### Output Format\n')}
                      className="px-2 py-0.5 text-xs bg-bg-input border border-border rounded"
                    >
                      I/O Block
                    </button>
                  </div>
                )}
              </div>

              {statementTab === 'edit' ? (
                <textarea
                  ref={statementRef}
                  required
                  rows={10}
                  value={form.statement}
                  onChange={(e) => setForm((prev) => ({ ...prev, statement: e.target.value }))}
                  className="w-full p-3 text-sm font-mono bg-bg-input text-text-primary focus:outline-none resize-y"
                />
              ) : (
                <div className="p-4 bg-bg-card min-h-[220px]">
                  <MarkdownRenderer content={form.statement} />
                </div>
              )}
            </div>
          </div>

          {/* Constraints */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-text-muted">Constraints</label>
              <div className="flex flex-wrap gap-1">
                {CONSTRAINT_SNIPPETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addConstraintSnippet(s)}
                    className="px-2 py-0.5 text-[11px] font-mono bg-bg-section border border-border rounded hover:bg-bg-raised"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={3}
              value={form.constraints}
              onChange={(e) => setForm((prev) => ({ ...prev, constraints: e.target.value }))}
              className="w-full p-3 text-xs font-mono bg-bg-input text-text-primary border border-border rounded focus:outline-none focus:border-border-focus"
            />
          </div>

          {/* Starter Code */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Starter Code
              </label>
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, starterCode: { ...DEFAULT_BOILERPLATES } }));
                  toast.success('Filled all 4 language boilerplates');
                }}
                className="px-2.5 py-1 text-xs bg-bg-section hover:bg-bg-raised border border-border rounded"
              >
                Fill All 4 Boilerplates
              </button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex border-b border-border bg-bg-section px-2">
                {['cpp', 'python', 'java', 'javascript'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setStarterTab(lang)}
                    className={`px-3 py-2 text-xs font-medium border-b-2 ${
                      starterTab === lang
                        ? 'border-navy text-text-primary'
                        : 'border-transparent text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
              <textarea
                rows={7}
                value={form.starterCode[starterTab] || ''}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    starterCode: { ...prev.starterCode, [starterTab]: e.target.value },
                  }))
                }
                className="w-full p-3 text-xs font-mono bg-bg-input text-text-primary focus:outline-none resize-y"
              />
            </div>
          </div>

          {/* Reference Solution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Reference Solution (Judge0 Auto-Output)
              </label>
              <select
                value={form.referenceLang}
                onChange={(e) => handleReferenceLangChange(e.target.value)}
                className="px-2 py-1 text-xs bg-bg-input text-text-primary border border-border rounded"
              >
                <option value="cpp">C++</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
            <textarea
              rows={8}
              value={form.referenceCode}
              onChange={(e) => setForm((prev) => ({ ...prev, referenceCode: e.target.value }))}
              className="w-full p-3 text-xs font-mono bg-bg-input text-text-primary border border-border rounded focus:outline-none focus:border-border-focus resize-y"
            />
          </div>

          {/* Test Cases */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Test Cases ({form.testCases.length})
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAll}
                  disabled={generatingAll || generatingIndex !== null}
                  className="px-2.5 py-1 text-xs font-medium bg-bg-section hover:bg-bg-raised text-text-primary border border-border-strong rounded"
                >
                  {generatingAll ? 'Generating All...' : 'Generate All Outputs (Judge0)'}
                </button>
                <button
                  type="button"
                  onClick={() => addTestCase(true)}
                  className="px-2.5 py-1 text-xs font-medium bg-navy text-white rounded hover:bg-navy-hover"
                >
                  + Sample Case
                </button>
                <button
                  type="button"
                  onClick={() => addTestCase(false)}
                  className="px-2.5 py-1 text-xs font-medium bg-bg-section text-text-primary border border-border rounded hover:bg-bg-raised"
                >
                  + Hidden Case
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {form.testCases.map((tc, idx) => (
                <div key={idx} className="p-3.5 bg-bg-section border border-border rounded-lg space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-primary">Case #{idx + 1}</span>
                      <label className="inline-flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.isSample}
                          onChange={(e) => updateTestCase(idx, { isSample: e.target.checked })}
                        />
                        Sample (visible to users)
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateOne(idx)}
                        disabled={generatingIndex === idx || generatingAll}
                        className="px-2 py-1 text-xs bg-bg-input hover:bg-bg-raised border border-border rounded"
                      >
                        {generatingIndex === idx ? 'Running...' : 'Generate Output'}
                      </button>
                      {form.testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(idx)}
                          className="px-2 py-1 text-xs text-error hover:bg-error-bg rounded"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[11px] text-text-muted mb-1">Input (stdin)</span>
                      <textarea
                        rows={3}
                        value={tc.input}
                        onChange={(e) => updateTestCase(idx, { input: e.target.value })}
                        className="w-full p-2 text-xs font-mono bg-bg-input text-text-primary border border-border rounded"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] text-text-muted mb-1">Expected Output</span>
                      <textarea
                        rows={3}
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(idx, { expectedOutput: e.target.value })}
                        className="w-full p-2 text-xs font-mono bg-bg-input text-text-primary border border-border rounded"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={startNewProblem}
              className="px-4 py-2 text-sm font-medium bg-bg-section text-text-secondary border border-border rounded-lg"
            >
              Reset Form
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-success text-white rounded-lg hover:opacity-90"
            >
              {saving ? 'Saving...' : editingId ? 'Update Problem' : 'Create Problem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
