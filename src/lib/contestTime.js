const CONTESTS_INVALIDATE_EVENT = 'cp-contests-invalidated';

export function computeServerOffset(serverTime) {
    if (!serverTime) return 0;
    const serverMs = new Date(serverTime).getTime();
    if (Number.isNaN(serverMs)) return 0;
    return serverMs - Date.now();
}

export function getAlignedNow(offsetMs = 0) {
    return Date.now() + offsetMs;
}

export function getLifecycle(startsAt, endsAt, nowMs = Date.now()) {
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (nowMs < start) return 'upcoming';
    if (nowMs < end) return 'ongoing';
    return 'ended';
}

export function formatCountdownMs(targetDate, nowMs = Date.now()) {
    const diff = Math.max(0, new Date(targetDate).getTime() - nowMs);
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (days > 0) {
        return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatISTDateTime(dateValue) {
    if (!dateValue) return 'TBD';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'TBD';
    return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }) + ' IST';
}

export function formatRelativePosted(dateValue, nowMs = Date.now()) {
    if (!dateValue) return '';
    const postedMs = new Date(dateValue).getTime();
    if (Number.isNaN(postedMs)) return '';
    const diffSec = Math.max(0, Math.floor((nowMs - postedMs) / 1000));
    const diffDays = Math.floor(diffSec / 86400);
    if (diffDays >= 1) return `Posted ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffSec / 3600);
    if (diffHours >= 1) return `Posted ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffMins = Math.floor(diffSec / 60);
    return diffMins >= 1 ? `Posted ${diffMins} min ago` : 'Posted just now';
}

export function notifyContestsChanged(slug = null) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(CONTESTS_INVALIDATE_EVENT, { detail: { slug } }));
}

export function subscribeContestsChanged(callback) {
    if (typeof window === 'undefined') return () => { };
    const handler = (e) => callback(e.detail);
    window.addEventListener(CONTESTS_INVALIDATE_EVENT, handler);
    return () => window.removeEventListener(CONTESTS_INVALIDATE_EVENT, handler);
}