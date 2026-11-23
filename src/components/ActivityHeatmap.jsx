'use client';

import { useMemo, useState } from 'react';

function getCellStyle(count) {
    if (!count) {
        return {
            backgroundColor: 'var(--bg-section)',
            borderColor: 'var(--border)',
        };
    }
    const opacity = count === 1 ? 0.35 : count <= 3 ? 0.58 : count <= 5 ? 0.8 : 1;
    return {
        backgroundColor: 'var(--success)',
        borderColor: 'var(--success)',
        opacity,
    };
}

function formatDateLabel(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export default function ActivityHeatmap({
    heatmap = [],
    activeDays = 0,
    currentStreak = 0,
    maxStreak = 0,
}) {
    const [hovered, setHovered] = useState(null);

    const { weeks, monthLabels } = useMemo(() => {
        const countMap = new Map(heatmap.map((item) => [item.date, item.count]));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const start = new Date(today);
        start.setDate(start.getDate() - 364);
        start.setDate(start.getDate() - start.getDay());

        const builtWeeks = [];
        const labels = [];
        let lastMonth = -1;

        const cursor = new Date(start);
        let weekIndex = 0;

        while (cursor <= today) {
            const week = [];
            for (let day = 0; day < 7; day++) {
                const iso = cursor.toISOString().slice(0, 10);
                const isFuture = cursor > today;
                const count = isFuture ? 0 : countMap.get(iso) || 0;

                if (day === 0 && !isFuture) {
                    const m = cursor.getMonth();
                    if (m !== lastMonth) {
                        labels.push({
                            weekIndex,
                            label: cursor.toLocaleDateString('en-US', { month: 'short' }),
                        });
                        lastMonth = m;
                    }
                }

                week.push({ date: iso, count, isFuture });
                cursor.setDate(cursor.getDate() + 1);
            }
            builtWeeks.push(week);
            weekIndex++;
        }

        return { weeks: builtWeeks, monthLabels: labels };
    }, [heatmap]);

    return (
        <section className="bg-bg-card border border-border rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                    <h2 className="text-section-title text-text-primary">Submission activity</h2>
                    <p className="text-small text-text-secondary mt-0.5">
                        {hovered
                            ? `${hovered.count} problem${hovered.count === 1 ? '' : 's'} solved on ${formatDateLabel(hovered.date)}`
                            : 'Daily solved problems over the past year'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-small text-text-secondary">
                    <span>
                        Active days:{' '}
                        <strong className="font-mono font-semibold text-text-primary">{activeDays}</strong>
                    </span>
                    <span>
                        Current streak:{' '}
                        <strong className="font-mono font-semibold text-text-primary">{currentStreak}d</strong>
                    </span>
                    <span>
                        Max streak:{' '}
                        <strong className="font-mono font-semibold text-text-primary">{maxStreak}d</strong>
                    </span>
                </div>
            </div>

            <div className="pt-4 overflow-x-auto scrollbar-thin pb-2">
                <div className="inline-block min-w-max">
                    <div className="relative mb-1.5 h-4 text-[11px] text-text-muted">
                        {monthLabels.map((m) => (
                            <span
                                key={`${m.label}-${m.weekIndex}`}
                                style={{ left: `${m.weekIndex * 15}px` }}
                                className="absolute top-0"
                            >
                                {m.label}
                            </span>
                        ))}
                    </div>

                    <div className="flex gap-[3px]">
                        {weeks.map((week, wIdx) => (
                            <div key={wIdx} className="flex flex-col gap-[3px]">
                                {week.map((cell) => {
                                    if (cell.isFuture) {
                                        return <div key={cell.date} className="h-3 w-3" />;
                                    }
                                    return (
                                        <button
                                            key={cell.date}
                                            type="button"
                                            onMouseEnter={() => setHovered(cell)}
                                            onMouseLeave={() => setHovered(null)}
                                            title={`${cell.count} solved on ${formatDateLabel(cell.date)}`}
                                            style={getCellStyle(cell.count)}
                                            className="h-3 w-3 rounded-[2px] border transition-transform hover:scale-110"
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-text-muted">
                <span>Less</span>
                {[0, 1, 2, 4, 6].map((sample) => (
                    <span
                        key={sample}
                        style={getCellStyle(sample)}
                        className="inline-block h-2.5 w-2.5 rounded-[2px] border"
                    />
                ))}
                <span>More</span>
            </div>
        </section>
    );
}