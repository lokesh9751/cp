// Shared local mock state for registrations, reactions, and bookmarks
// Uses versioned localStorage keys with in-memory fallback

const REGISTRATIONS_KEY = 'competitive-pirates-registrations-v1';
const REACTIONS_KEY = 'competitive-pirates-reactions-v1';
const BOOKMARKS_KEY = 'competitive-pirates-bookmarks-v1';

/**
 * Safe localStorage getter
 */
function safeGetItem(key) {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

/**
 * Safe localStorage setter
 */
function safeSetItem(key, value) {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safe localStorage remover
 */
function safeRemoveItem(key) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // ignore
  }
}

/**
 * Parse JSON safely
 */
function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch (e) {
    return fallback;
  }
}

// In-memory fallback state
let memoryRegistrations = {};
let memoryReactions = {};
let memoryBookmarks = {};
let initialized = false;

/**
 * Initialize state from localStorage or memory
 */
function initialize() {
  if (initialized) return;
  initialized = true;

  if (typeof window !== 'undefined') {
    const regData = safeGetItem(REGISTRATIONS_KEY);
    const reactData = safeGetItem(REACTIONS_KEY);
    const bookmarkData = safeGetItem(BOOKMARKS_KEY);

    // safeParse may return null if stored value is "null" - validate shape
    const parsedRegistrations = safeParse(regData, {});
    memoryRegistrations = (parsedRegistrations && typeof parsedRegistrations === 'object' && !Array.isArray(parsedRegistrations))
      ? parsedRegistrations
      : {};

    const parsedReactions = safeParse(reactData, {});
    memoryReactions = (parsedReactions && typeof parsedReactions === 'object' && !Array.isArray(parsedReactions))
      ? parsedReactions
      : {};

    const parsedBookmarks = safeParse(bookmarkData, {});
    memoryBookmarks = (parsedBookmarks && typeof parsedBookmarks === 'object' && !Array.isArray(parsedBookmarks))
      ? parsedBookmarks
      : {};
  } else {
    memoryRegistrations = {};
    memoryReactions = {};
    memoryBookmarks = {};
  }
}

// ============================================
// REGISTRATIONS
// ============================================

/**
 * Get registration status for a contest
 * @param {string} slug
 * @param {boolean} defaultRegistered - Default from contest data
 * @returns {boolean}
 */
export function getRegistration(slug, defaultRegistered = false) {
  initialize();
  const stored = memoryRegistrations[slug];
  // Distinguish "no stored value" (undefined) from explicitly stored false
  if (stored !== undefined) {
    return Boolean(stored);
  }
  return defaultRegistered;
}

/**
 * Set registration status for a contest
 * @param {string} slug
 * @param {boolean} value
 * @returns {boolean} Success
 */
export function setRegistration(slug, value) {
  initialize();
  memoryRegistrations[slug] = value;
  const success = safeSetItem(REGISTRATIONS_KEY, JSON.stringify(memoryRegistrations));
  // Notify same-tab listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
      detail: { type: 'registration', slug, value }
    }));
  }
  return success;
}

/**
 * Get all registrations
 * @returns {Record<string, boolean>}
 */
export function getAllRegistrations() {
  initialize();
  return { ...memoryRegistrations };
}

// ============================================
// REACTIONS
// ============================================

/**
 * Get reaction for a contest
 * @param {string} slug
 * @returns {'like'|'dislike'|null}
 */
export function getReaction(slug) {
  initialize();
  const reaction = memoryReactions[slug];
  if (reaction === 'like' || reaction === 'dislike') return reaction;
  return null;
}

/**
 * Set reaction for a contest
 * @param {string} slug
 * @param {'like'|'dislike'|null} value
 * @returns {boolean} Success
 */
export function setReaction(slug, value) {
  initialize();
  if (value === 'like' || value === 'dislike') {
    memoryReactions[slug] = value;
  } else {
    delete memoryReactions[slug];
  }
  const success = safeSetItem(REACTIONS_KEY, JSON.stringify(memoryReactions));
  // Notify same-tab listeners
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
      detail: { type: 'reaction', slug, value }
    }));
  }
  return success;
}

/**
 * Toggle like reaction
 * @param {string} slug
 * @returns {'like'|null} New state
 */
export function toggleLike(slug) {
  const current = getReaction(slug);
  const newValue = current === 'like' ? null : 'like';
  setReaction(slug, newValue);
  return newValue;
}

/**
 * Toggle dislike reaction
 * @param {string} slug
 * @returns {'dislike'|null} New state
 */
export function toggleDislike(slug) {
  const current = getReaction(slug);
  const newValue = current === 'dislike' ? null : 'dislike';
  setReaction(slug, newValue);
  return newValue;
}

/**
 * Get reaction counts for a contest (baseline + current user)
 * @param {string} slug
 * @param {number} initialLikes
 * @param {number} initialDislikes
 * @returns {{likes: number, dislikes: number}}
 */
export function getReactionCounts(slug, initialLikes, initialDislikes) {
  const reaction = getReaction(slug);
  let likes = initialLikes;
  let dislikes = initialDislikes;
  if (reaction === 'like') likes += 1;
  if (reaction === 'dislike') dislikes += 1;
  return { likes: Math.max(0, likes), dislikes: Math.max(0, dislikes) };
}

/**
 * Get all reactions
 * @returns {Record<string, 'like'|'dislike'>}
 */
export function getAllReactions() {
  initialize();
  return { ...memoryReactions };
}

// ============================================
// BOOKMARKS
// ============================================

/**
 * Get bookmark status for a question
 * @param {string} questionId - Question ID as string
 * @returns {boolean}
 */
export function getBookmark(questionId) {
  initialize();
  const key = String(questionId);
  const stored = memoryBookmarks[key];
  if (stored !== undefined) {
    return Boolean(stored);
  }
  return false; // Default to not bookmarked
}

/**
 * Toggle bookmark for a question
 * @param {string} questionId - Question ID as string
 * @returns {boolean} New bookmark state
 */
export function toggleBookmark(questionId) {
  initialize();
  const key = String(questionId);
  const currentValue = memoryBookmarks[key];
  const newValue = !(currentValue === true || currentValue === 'true');
  memoryBookmarks[key] = newValue;
  const success = safeSetItem(BOOKMARKS_KEY, JSON.stringify(memoryBookmarks));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
      detail: { type: 'bookmark', questionId: key, value: newValue }
    }));
  }
  return newValue;
}

/**
 * Get all bookmarks
 * @returns {Record<string, boolean>}
 */
export function getAllBookmarks() {
  initialize();
  return { ...memoryBookmarks };
}

/**
 * Set bookmark for a question
 * @param {string} questionId
 * @param {boolean} value
 */
export function setBookmark(questionId, value) {
  initialize();
  const key = String(questionId);
  memoryBookmarks[key] = value;
  const success = safeSetItem(BOOKMARKS_KEY, JSON.stringify(memoryBookmarks));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
      detail: { type: 'bookmark', questionId: key, value }
    }));
  }
  return success;
}

// ============================================
// STORAGE EVENT LISTENER (cross-tab sync)
// ============================================

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === REGISTRATIONS_KEY) {
      const parsed = safeParse(e.newValue, {});
      memoryRegistrations = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
        detail: { type: 'registration', source: 'storage' }
      }));
    } else if (e.key === REACTIONS_KEY) {
      const parsed = safeParse(e.newValue, {});
      memoryReactions = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
        detail: { type: 'reaction', source: 'storage' }
      }));
    } else if (e.key === BOOKMARKS_KEY) {
      const parsed = safeParse(e.newValue, {});
      memoryBookmarks = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
        detail: { type: 'bookmark', source: 'storage' }
      }));
    }
  });
}

// ============================================
// RESET UTILITIES
// ============================================

/**
 * Reset all mock state (for demo purposes)
 */
export function resetMockState() {
  memoryRegistrations = {};
  memoryReactions = {};
  memoryBookmarks = {};
  safeRemoveItem(REGISTRATIONS_KEY);
  safeRemoveItem(REACTIONS_KEY);
  safeRemoveItem(BOOKMARKS_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cp-mock-state-change', {
      detail: { type: 'reset' }
    }));
  }
}

/**
 * Reset everything including demo reference time
 */
export function resetAllDemoState() {
  resetMockState();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('competitive-pirates-demo-ref-v1');
    } catch (e) {
      // ignore
    }
  }
}