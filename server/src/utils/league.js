export const LEAGUE_TIERS = [
    { key: 'WARRIOR', name: 'Warrior', minPoints: 0, maxPoints: 19 },
    { key: 'ELITE', name: 'Elite', minPoints: 20, maxPoints: 49 },
    { key: 'MASTER', name: 'Master', minPoints: 50, maxPoints: 99 },
    { key: 'GRANDMASTER', name: 'Grandmaster', minPoints: 100, maxPoints: 179 },
    { key: 'EPIC', name: 'Epic', minPoints: 180, maxPoints: 299 },
    { key: 'LEGEND', name: 'Legend', minPoints: 300, maxPoints: 449 },
    { key: 'MYTHIC', name: 'Mythic', minPoints: 450, maxPoints: 649 },
    { key: 'MYTHICAL_HONOR', name: 'Mythical Honor', minPoints: 650, maxPoints: 899 },
    { key: 'MYTHICAL_GLORY', name: 'Mythical Glory', minPoints: 900, maxPoints: 1199 },
    { key: 'MYTHICAL_IMMORTAL', name: 'Mythical Immortal', minPoints: 1200, maxPoints: null },
];

const IMMORTAL_START = 1200;
const IMMORTAL_STEP = 200;

export function getLeagueInfo(points) {
    const pts = Math.max(0, Number(points) || 0);

    if (pts >= IMMORTAL_START) {
        const level = Math.floor((pts - IMMORTAL_START) / IMMORTAL_STEP) + 1;
        const nextThreshold = IMMORTAL_START + level * IMMORTAL_STEP;
        return {
            key: 'MYTHICAL_IMMORTAL',
            name: 'Mythical Immortal',
            level,
            label: `Mythical Immortal ${level}`,
            nextLabel: `Mythical Immortal ${level + 1}`,
            pointsToNext: nextThreshold - pts,
            progressPct: Math.min(100, Math.round(((pts - (nextThreshold - IMMORTAL_STEP)) / IMMORTAL_STEP) * 100)),
        };
    }

    for (let i = 0; i < LEAGUE_TIERS.length - 1; i++) {
        const tier = LEAGUE_TIERS[i];
        const next = LEAGUE_TIERS[i + 1];
        if (pts >= tier.minPoints && pts < next.minPoints) {
            const span = next.minPoints - tier.minPoints;
            return {
                key: tier.key,
                name: tier.name,
                level: null,
                label: tier.name,
                nextLabel: next.key === 'MYTHICAL_IMMORTAL' ? 'Mythical Immortal 1' : next.name,
                pointsToNext: next.minPoints - pts,
                progressPct: Math.min(100, Math.round(((pts - tier.minPoints) / span) * 100)),
            };
        }
    }

    return {
        key: 'WARRIOR',
        name: 'Warrior',
        level: null,
        label: 'Warrior',
        nextLabel: 'Elite',
        pointsToNext: 20,
        progressPct: 0,
    };
}