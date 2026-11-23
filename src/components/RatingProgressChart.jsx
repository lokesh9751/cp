'use client';

import { useMemo, useState } from 'react';

export default function RatingProgressChart({
    ratingHistory = [],
    xpHistory = [],
    currentRating = 1200,
    maxRating = 1200,
    currentXp = 0,
}) {
    const defaultMode = ratingHistory.length > 0 ? 'rating' : 'xp';
    const [mode, setMode] = useState(defaultMode);
    const [activeIdx, setActiveIdx] = useState(null);

    const points = useMemo(() => {
        if (mode === 'rating') {
            return ratingHistory.map((item) => ({
                label: item.contestTitle,
                date: item.date,
                value: item.newRating,
                meta: `Rank #${item.rank} (${item.ratingChange >= 0 ? '+' : ''}${item.ratingChange})`,
            }));
        }
        return xpHistory.map((item) => ({
            label: `${item.solved} problem${item.solved === 1 ? '' : 's'} solved`,
            date: item.date,
            value: item.xp,
            meta: `+${item.gained} XP`,
        }));
    }, [mode, ratingHistory, xpHistory]);

    const width = 640;
    const height = 210;
    const padX = 44;
    const padY = 22;

    const { coords, minVal, maxVal, polylinePoints, areaPoints } = useMemo(() => {
        if (points.length === 0) {
            return { coords: [], minVal: 0, maxVal: 100, polylinePoints: '', areaPoints: '' };
        }

        const values = points.map((p) => p.value);
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const spread = Math.max(rawMax - rawMin, mode === 'rating' ? 100 : 20);
        const minV = Math.max(0, Math.floor(rawMin - spread * 0.15));
        const maxV = Math.ceil(rawMax + spread * 0.15);

        const plotW = width - padX * 2;
        const plotH = height - padY * 2;

        const mapped = points.map((p, i) => {
            const x =
                points.length === 1
                    ? padX + plotW / 2
                    : padX + (i / (points.length - 1)) * plotW;
            const y =
                padY + plotH - ((p.value - minV) / Math.max(maxV - minV, 1)) * plotH;
            return { ...p, x, y };
        });

        const line = mapped.map((c) => `${c.x},${c.y}`).join(' ');
        const area =
            mapped.length > 1
                ? `${mapped[0].x},${height - padY} ${line} ${mapped[mapped.length - 1].x},${height - padY}`
                : '';

        return {
            coords: mapped,
            minVal: minV,
            maxVal: maxV,
            polylinePoints: line,
            areaPoints: area,
        };
    }, [points, mode]);

    const activePoint = activeIdx !== null ? coords[activeIdx] : coords[coords.length - 1];
    const strokeVar = mode === 'rating' ? 'var(--navy)' : 'var(--success)';
    const gradId = mode === 'rating' ? 'cpRatingGrad' : 'cpXpGrad';

    return (
        <section className="bg-bg-card border border-border rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                <div>
                    <h2 className="text-section-title text-text-primary">
                        {mode === 'rating' ? 'Contest rating' : 'XP progression'}
                    </h2>
                    <p className="text-small text-text-secondary mt-0.5">
                        {mode === 'rating'
                            ? `Current: ${currentRating} · Peak: ${maxRating}`
                            : `Total XP: ${currentXp}`}
                    </p>
                </div>

                <div className="inline-flex rounded-lg border border-border bg-bg-section p-0.5 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => {
                            setMode('rating');
                            setActiveIdx(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'rating'
                                ? 'bg-navy text-white'
                                : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Contest rating
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setMode('xp');
                            setActiveIdx(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'xp'
                                ? 'bg-navy text-white'
                                : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        XP growth
                    </button>
                </div>
            </div>

            <div className="pt-4">
                {coords.length === 0 ? (
                    <div className="bg-bg-section border border-border rounded-lg p-8 text-center text-small text-text-secondary">
                        {mode === 'rating'
                            ? 'No rated contests completed yet. Switch to XP growth to view practice progress.'
                            : 'Solve a problem to start tracking XP progression.'}
                    </div>
                ) : (
                    <>
                        {activePoint && (
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg-section border border-border px-3.5 py-2 text-small">
                                <div className="text-text-primary font-medium">
                                    {activePoint.label}{' '}
                                    <span className="text-text-muted font-normal font-mono">
                                        ({activePoint.date})
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 font-mono">
                                    <span className="font-semibold text-text-primary">
                                        {activePoint.value} {mode === 'rating' ? 'Rating' : 'XP'}
                                    </span>
                                    <span className="text-text-secondary">{activePoint.meta}</span>
                                </div>
                            </div>
                        )}

                        <div className="w-full overflow-x-auto scrollbar-thin">
                            <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full min-w-[420px]">
                                <defs>
                                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={strokeVar} stopOpacity="0.2" />
                                        <stop offset="100%" stopColor={strokeVar} stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {[0, 0.5, 1].map((ratio) => {
                                    const y = padY + (height - padY * 2) * ratio;
                                    const val = Math.round(maxVal - (maxVal - minVal) * ratio);
                                    return (
                                        <g key={ratio}>
                                            <line
                                                x1={padX}
                                                y1={y}
                                                x2={width - padX}
                                                y2={y}
                                                stroke="var(--border)"
                                                strokeDasharray="3 3"
                                            />
                                            <text
                                                x={padX - 8}
                                                y={y + 4}
                                                textAnchor="end"
                                                fill="var(--text-muted)"
                                                fontSize="11"
                                                fontFamily="ui-monospace, monospace"
                                            >
                                                {val}
                                            </text>
                                        </g>
                                    );
                                })}

                                {areaPoints && <polygon points={areaPoints} fill={`url(#${gradId})`} />}

                                {coords.length > 1 && (
                                    <polyline
                                        fill="none"
                                        stroke={strokeVar}
                                        strokeWidth="2.25"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={polylinePoints}
                                    />
                                )}

                                {coords.map((pt, idx) => (
                                    <circle
                                        key={`${pt.date}-${idx}`}
                                        cx={pt.x}
                                        cy={pt.y}
                                        r={activeIdx === idx ? 5.5 : 3.5}
                                        fill={strokeVar}
                                        stroke="var(--bg-card)"
                                        strokeWidth="2"
                                        className="cursor-pointer"
                                        onMouseEnter={() => setActiveIdx(idx)}
                                    />
                                ))}
                            </svg>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}