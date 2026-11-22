'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL, getContestLeaderboard } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

function formatElapsed(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export default function ContestLeaderboard({ slug }) {
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;

    getContestLeaderboard(slug)
      .then((data) => {
        if (active) {
          setBoard(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const streamUrl = `${API_BASE_URL}/api/contests/${encodeURIComponent(slug)}/leaderboard/stream`;
    const es = new EventSource(streamUrl);

    es.onopen = () => {
      if (active) setLiveConnected(true);
    };

    es.onmessage = (event) => {
      if (!active) return;
      try {
        const parsed = JSON.parse(event.data);
        setBoard(parsed);
        setLiveConnected(true);
      } catch {
        // ignore malformed SSE frame
      }
    };

    es.onerror = () => {
      if (active) setLiveConnected(false);
    };

    return () => {
      active = false;
      es.close();
    };
  }, [slug]);

  if (loading) {
    return <div className="py-6 text-sm text-text-muted">Loading live standings...</div>;
  }

  const problems = board?.problems || [];
  const analytics = board?.problemAnalytics || [];
  const standings = board?.standings || [];
  const myRow = user ? standings.find((r) => r.userId === user.id) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-text-primary">Live Standings & Solve Speed</h2>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full ${
              liveConnected ? 'bg-success-bg text-success' : 'bg-bg-section text-text-muted'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${liveConnected ? 'bg-success animate-pulse' : 'bg-text-muted'}`} />
            {liveConnected ? 'Live SSE' : 'Syncing'}
          </span>
        </div>
        <span className="text-xs text-text-muted">
          Score = Points · Penalty = +5m per wrong attempt before AC
        </span>
      </div>

      {/* Per-Problem Solve Speed Analytics */}
      {analytics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {analytics.map((p) => (
            <div key={p.problemId} className="p-3 bg-bg-section border border-border rounded-lg space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-text-primary truncate">
                  {p.label}. {p.title}
                </span>
                <span className="text-[11px] font-mono text-text-muted shrink-0">{p.points} pts</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-secondary">
                <span>Solved: <strong className="text-text-primary">{p.solvedCount}</strong></span>
                <span>AC: <strong className="text-text-primary">{p.acceptanceRate}%</strong></span>
                <span>Avg: <strong className="font-mono text-text-primary">{formatElapsed(p.avgSolveTimeSeconds)}</strong></span>
              </div>

              {p.firstBlood ? (
                <div className="pt-1 border-t border-border text-[11px] text-warning flex items-center justify-between gap-1">
                  <span className="truncate font-medium">⚡ @{p.firstBlood.username}</span>
                  <span className="font-mono font-semibold shrink-0">
                    {formatElapsed(p.firstBlood.solveTimeSeconds)}
                  </span>
                </div>
              ) : (
                <div className="pt-1 border-t border-border text-[11px] text-text-muted">
                  First Blood: Unclaimed
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pinned Current User Rank */}
      {myRow && (
        <div className="p-3 bg-info-bg border border-info/30 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-info">
            Your Position: #{myRow.rank} (@{myRow.username})
          </span>
          <span className="font-mono text-text-primary">
            {myRow.totalPoints} pts · {myRow.solvedCount}/{problems.length} solved · {formatElapsed(myRow.totalTimeSeconds)}
          </span>
        </div>
      )}

      {standings.length === 0 ? (
        <div className="p-8 text-center bg-bg-section border border-border rounded-lg text-sm text-text-muted">
          No contest submissions yet. Standings and solve speed metrics will appear live once participants submit.
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-section border-b border-border text-text-muted uppercase">
              <tr>
                <th className="px-3 py-2.5">Rank</th>
                <th className="px-3 py-2.5">Participant</th>
                <th className="px-3 py-2.5">Score</th>
                <th className="px-3 py-2.5">Solved</th>
                <th className="px-3 py-2.5">Total Time</th>
                {problems.map((p) => (
                  <th key={p.problemId} className="px-3 py-2.5 text-center" title={p.title}>
                    {p.label} ({p.points})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-bg-card">
              {standings.map((row) => {
                const isMe = user && row.userId === user.id;
                return (
                  <tr key={row.userId} className={isMe ? 'bg-info-bg/40' : 'hover:bg-row-hover'}>
                    <td className="px-3 py-2.5 font-mono font-bold text-text-primary">#{row.rank}</td>
                    <td className="px-3 py-2.5 font-medium text-text-primary">
                      @{row.username} {isMe && <span className="text-[10px] text-info font-semibold">(You)</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono font-semibold text-success">{row.totalPoints}</td>
                    <td className="px-3 py-2.5 font-mono text-text-secondary">
                      {row.solvedCount}/{problems.length}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-text-muted">
                      {formatElapsed(row.totalTimeSeconds)}
                    </td>
                    {row.problems.map((cell, i) => {
                      const label = problems[i]?.label || `P${i + 1}`;
                      return (
                        <td key={cell.problemId || i} className="px-2.5 py-2 text-center">
                          {cell.solved ? (
                            <div
                              className={`inline-flex flex-col items-center px-2 py-1 rounded ${
                                cell.isFirstBlood
                                  ? 'bg-warning-bg text-warning border border-warning/40'
                                  : 'bg-success-bg text-success'
                              }`}
                              title={cell.isFirstBlood ? 'First Blood (Fastest Solver)' : 'Accepted'}
                            >
                              <span className="font-mono font-semibold">
                                {cell.isFirstBlood ? '⚡ ' : ''}
                                {formatElapsed(cell.solveTimeSeconds)}
                              </span>
                              <span className="text-[10px] uppercase font-mono">
                                {cell.language || 'AC'}
                                {cell.runtimeMs != null ? ` · ${cell.runtimeMs}ms` : ''}
                                {cell.wrongAttempts > 0 ? ` (-${cell.wrongAttempts})` : ''}
                              </span>
                            </div>
                          ) : cell.wrongAttempts > 0 ? (
                            <span className="inline-block px-2 py-1 rounded bg-error-bg text-error font-mono">
                              -{cell.wrongAttempts} ({label})
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}