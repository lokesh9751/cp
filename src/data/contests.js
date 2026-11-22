// Centralized contest data and time utilities for Competitive Pirates
// All timestamps are ISO strings with explicit timezone offset (Asia/Kolkata IST = +05:30)

// Demo reference time: fixed instant for deterministic fixture schedules across reloads
// This is stored in localStorage so the schedule persists across reloads
const DEMO_REFERENCE_KEY = 'competitive-pirates-demo-ref-v1';
const DEFAULT_REFERENCE_ISO = '2026-11-29T12:00:00+05:30'; // A reference "now" for the demo

/**
 * Get the demo reference time. Creates and persists on first use.
 * @returns {number} Unix timestamp (ms) of the demo reference time
 */
export function getDemoReferenceTime() {
  if (typeof window === 'undefined') {
    // Server side: use the default reference time
    return new Date(DEFAULT_REFERENCE_ISO).getTime();
  }
  try {
    const stored = localStorage.getItem(DEMO_REFERENCE_KEY);
    if (stored) {
      return parseInt(stored, 10);
    }
    const ref = new Date(DEFAULT_REFERENCE_ISO).getTime();
    localStorage.setItem(DEMO_REFERENCE_KEY, String(ref));
    return ref;
  } catch (e) {
    return new Date(DEFAULT_REFERENCE_ISO).getTime();
  }
}

/**
 * Reset the demo reference time (for testing/demo purposes)
 */
export function resetDemoReferenceTime() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(DEMO_REFERENCE_KEY);
    } catch (e) {
      // ignore
    }
  }
}

/**
 * Get current time for the demo - uses reference time + real elapsed time
 * This ensures the schedule is stable but time still progresses
 * @returns {number} Current demo time in ms
 */
export function getDemoNow() {
  const reference = getDemoReferenceTime();
  const realNow = Date.now();
  // On first load, realNow ≈ reference, so demo now ≈ reference
  // As real time passes, demo time advances correspondingly
  return reference + (realNow - reference);
}

/**
 * Format a date in IST (Asia/Kolkata) timezone
 * @param {string|Date} date - ISO string or Date object
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatIST(date, options = {}) {
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    ...options,
  };
  return new Date(date).toLocaleString('en-IN', defaultOptions);
}

/**
 * Format just the date portion in IST
 */
export function formatISTDate(date) {
  return formatIST(date, { hour: undefined, minute: undefined, timeZoneName: undefined });
}

/**
 * Format just the time portion in IST
 */
export function formatISTTime(date) {
  return formatIST(date, { year: undefined, month: undefined, day: undefined });
}

/**
 * Calculate contest lifecycle state
 * @param {string} startsAt - ISO timestamp
 * @param {string} endsAt - ISO timestamp
 * @param {number} [now] - Optional current time (ms), defaults to demo now
 * @returns {'upcoming'|'ongoing'|'ended'}
 */
export function getContestLifecycle(startsAt, endsAt, now = getDemoNow()) {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (now < start) return 'upcoming';
  if (now < end) return 'ongoing';
  return 'ended';
}

/**
 * Format relative posted time from uploadedAt
 * @param {string} uploadedAt - ISO timestamp
 * @param {number} [now] - Optional current time (ms)
 * @returns {string} Relative time string
 */
export function formatRelativePostedTime(uploadedAt, now = getDemoNow()) {
  const diffMs = now - new Date(uploadedAt).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Posted today';
  if (diffDays === 1) return 'Posted 1 day ago';
  return `Posted ${diffDays} days ago`;
}

/**
 * Format countdown from now to target time
 * @param {string} targetAt - ISO timestamp
 * @param {number} [now] - Optional current time (ms)
 * @returns {string} Formatted countdown (e.g., "2d 5h 30m")
 */
export function formatCountdown(targetAt, now = getDemoNow()) {
  const diffMs = new Date(targetAt).getTime() - now;
  if (diffMs <= 0) return 'Started';
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * Format time remaining until end
 */
export function formatTimeRemaining(endsAt, now = getDemoNow()) {
  const diffMs = new Date(endsAt).getTime() - now;
  if (diffMs <= 0) return 'Ended';
  return formatCountdown(endsAt, now);
}

// ============================================
// CONTEST DATA
// ============================================

// Duration in minutes for each contest
const DURATIONS = {
  'dsa-weekly-contest': 120,
  'cp-weekend-challenge': 180,
  'algorithm-sprint': 150,
  'data-structures-marathon': 240,
  'graph-theory-sprint': 120,
};

// Generate contest schedule from demo reference time
function generateContests() {
  const refTime = getDemoReferenceTime();
  const refDate = new Date(refTime);

  // Helper to create ISO string at a specific offset from reference
  const atOffset = (daysOffset, hoursOffset, minutesOffset = 0) => {
    const d = new Date(refTime + daysOffset * 86400000 + hoursOffset * 3600000 + minutesOffset * 60000);
    return d.toISOString().replace('Z', '+05:30');
  };

  // Helper to create ISO string for a specific date/time in IST
  const atIST = (year, month, day, hour, minute = 0) => {
    // month is 0-indexed
    const d = new Date(Date.UTC(year, month, day, hour - 5, minute - 30)); // Convert IST to UTC
    return d.toISOString().replace('Z', '+05:30');
  };

  // We'll use atIST for explicit dates to make the fixture schedule clear
  // Reference day: 2026-11-29 (the demo reference date)

  return [
    // UPCOMING CONTESTS
    {
      slug: 'dsa-weekly-contest',
      title: 'DSA Weekly Contest',
      type: 'DSA',
      uploadedAt: atIST(2026, 10, 25, 10, 0), // Nov 25, 2026
      startsAt: atIST(2026, 11, 6, 20, 0),   // Dec 6, 2026 8:00 PM IST
      durationMinutes: DURATIONS['dsa-weekly-contest'],
      description: {
        overview: 'Weekly DSA contest focusing on fundamental data structures and algorithms. Perfect for regular practice and skill maintenance.',
        format: 'Individual participation. 2 hours duration. 4 problems of varying difficulty.',
        scoring: 'Standard ACM ICPC scoring: problems solved, then total penalty time. Wrong submissions add 20 minutes penalty per problem.',
        rules: [
          'No external libraries beyond standard language library',
          'No collaboration or code sharing during contest',
          'No use of AI coding assistants',
        ],
        setterNotes: 'Problems cover arrays, strings, basic DP, and graph traversal. Difficulty ranges from Easy to Medium.',
      },
      defaultRegistered: false,
      initialLikes: 42,
      initialDislikes: 3,
    },
    {
      slug: 'cp-weekend-challenge',
      title: 'CP Weekend Challenge',
      type: 'CP',
      uploadedAt: atIST(2026, 10, 28, 14, 0), // Nov 28, 2026
      startsAt: atIST(2026, 11, 13, 10, 0),  // Dec 13, 2026 10:00 AM IST
      durationMinutes: DURATIONS['cp-weekend-challenge'],
      description: {
        overview: 'Weekend competitive programming challenge with algorithmic problems requiring deeper thinking and optimization.',
        format: 'Individual participation. 3 hours duration. 5 problems.',
        scoring: 'IOI-style scoring: partial points per test case group. Total score determines ranking.',
        rules: [
          'Standard CP rules apply',
          'Fast I/O recommended for large inputs',
          '64-bit integers required for some problems',
        ],
        setterNotes: 'Expect problems on segment trees, graph algorithms, and number theory. One constructive problem.',
      },
      defaultRegistered: true,
      initialLikes: 67,
      initialDislikes: 5,
    },
    {
      slug: 'algorithm-sprint',
      title: 'Algorithm Sprint',
      type: 'CP',
      uploadedAt: atIST(2026, 11, 1, 9, 0),   // Dec 1, 2026
      startsAt: atIST(2026, 11, 20, 18, 0),  // Dec 20, 2026 6:00 PM IST
      durationMinutes: DURATIONS['algorithm-sprint'],
      description: {
        overview: 'Fast-paced algorithmic sprint focusing on implementation speed and correctness under time pressure.',
        format: 'Individual participation. 2.5 hours duration. 6 short problems.',
        scoring: 'Standard ACM scoring. Speed matters - earlier correct submissions rank higher on ties.',
        rules: [
          'Problems are shorter but require precise implementation',
          'Edge cases are important',
        ],
        setterNotes: 'Covers greedy, binary search, two pointers, and sliding window techniques.',
      },
      defaultRegistered: false,
      initialLikes: 38,
      initialDislikes: 2,
    },

    // ONGOING CONTESTS (started earlier on demo reference day, still running)
    {
      slug: 'data-structures-marathon',
      title: 'Data Structures Marathon',
      type: 'DSA',
      uploadedAt: atIST(2026, 10, 20, 16, 0), // Nov 20, 2026
      startsAt: atIST(2026, 10, 29, 10, 0),  // Nov 29, 2026 10:00 AM IST (started 2 hours ago)
      durationMinutes: DURATIONS['data-structures-marathon'],
      description: {
        overview: 'Extended marathon contest covering comprehensive data structure implementations and applications.',
        format: 'Individual participation. 4 hours duration. 8 problems.',
        scoring: 'ACM ICPC scoring with extended problem set.',
        rules: [
          'Longer duration allows for more complex implementations',
          'Partial scoring available for some problems',
        ],
        setterNotes: 'Covers arrays, linked lists, trees, graphs, heaps, and advanced structures.',
      },
      defaultRegistered: true,  // Registered by default, showing "Solve"
      initialLikes: 91,
      initialDislikes: 7,
    },
    {
      slug: 'graph-theory-sprint',
      title: 'Graph Theory Sprint',
      type: 'CP',
      uploadedAt: atIST(2026, 10, 22, 11, 0), // Nov 22, 2026
      startsAt: atIST(2026, 10, 29, 11, 0),  // Nov 29, 2026 11:00 AM IST (started 1 hour ago)
      durationMinutes: DURATIONS['graph-theory-sprint'],
      description: {
        overview: 'Focused sprint on graph algorithms and network flow problems.',
        format: 'Individual participation. 2 hours duration. 4 problems.',
        scoring: 'IOI-style partial scoring.',
        rules: [
          'Graph representation efficiency matters',
          'Watch for memory limits on large graphs',
        ],
        setterNotes: 'Covers BFS/DFS, shortest paths, MST, max flow, and SCC.',
      },
      defaultRegistered: false, // Unregistered by default, showing "Too late"
      initialLikes: 54,
      initialDislikes: 4,
    },
  ];
}

// Export the generated contests
export const contests = generateContests();

/**
 * Get a contest by slug
 * @param {string} slug
 * @returns {object|null}
 */
export function getContestBySlug(slug) {
  return contests.find(c => c.slug === slug) || null;
}

/**
 * Get all contest slugs
 * @returns {string[]}
 */
export function getAllContestSlugs() {
  return contests.map(c => c.slug);
}

/**
 * Get contests filtered by lifecycle
 * @param {'upcoming'|'ongoing'|'ended'} lifecycle
 * @param {number} [now] - Optional current time
 * @returns {object[]}
 */
export function getContestsByLifecycle(lifecycle, now = getDemoNow()) {
  return contests.filter(c => getContestLifecycle(c.startsAt, c.endsAt, now) === lifecycle);
}

/**
 * Get upcoming contests sorted by start time (earliest first)
 */
export function getUpcomingContests(now = getDemoNow()) {
  return getContestsByLifecycle('upcoming', now).sort((a, b) =>
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
}

/**
 * Get ongoing contests sorted by end time (earliest ending first)
 */
export function getOngoingContests(now = getDemoNow()) {
  return getContestsByLifecycle('ongoing', now).sort((a, b) =>
    new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
  );
}

/**
 * Get ended contests sorted by end time (most recent first)
 */
export function getEndedContests(now = getDemoNow()) {
  return getContestsByLifecycle('ended', now).sort((a, b) =>
    new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime()
  );
}

// Add computed endsAt to each contest
contests.forEach(c => {
  c.endsAt = new Date(new Date(c.startsAt).getTime() + c.durationMinutes * 60000).toISOString().replace('Z', '+05:30');
});