// Map<userId, Set<res>>
const clients = new Map();

export function addSocialClient(userId, res) {
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(res);
}

export function removeSocialClient(userId, res) {
    const set = clients.get(userId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) {
        clients.delete(userId);
    }
}

export function emitSocialEvent(userIds, event, payload) {
    const uniqueIds = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
    const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const uid of uniqueIds) {
        const set = clients.get(uid);
        if (!set) continue;
        for (const res of set) {
            try {
                res.write(data);
            } catch {
                // Ignore broken pipes; close handler cleans up
            }
        }
    }
}