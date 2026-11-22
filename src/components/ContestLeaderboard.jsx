'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL, getContestLeaderboard } from '@/lib/api';

function formatElapsed(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

export default function ContestLeaderboard({ slug }) {
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
  const standings = board?.standings || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-text-primary">Live Leaderboard</h2>
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

      {standings.length === 0 ? (
        <div className="p-8 text-center bg-bg-section border border-border rounded-lg text-sm text-text-muted">
          No contest submissions yet. Standings will appear live once participants submit.
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
              {standings.map((row) => (
                <tr key={row.userId} className="hover:bg-row-hover">
                  <td className="px-3 py-2.5 font-mono font-bold text-text-primary">#{row.rank}</td>
                  <td className="px-3 py-2.5 font-medium text-text-primary">@{row.username}</td>
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
                          <div className="inline-flex flex-col items-center px-2 py-1 rounded bg-success-bg text-success">
                            <span className="font-mono font-semibold">
                              {formatElapsed(cell.solveTimeSeconds)}
                            </span>
                            <span className="text-[10px] uppercase font-mono">
                              {cell.language || 'AC'}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
