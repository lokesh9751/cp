'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL, getSocialOverview } from '@/lib/api';

export default function SocialNavBadge() {
    const { user, accessToken } = useAuth();
    const [count, setCount] = useState(0);

    const fetchCount = useCallback(async () => {
        if (!user || !accessToken) {
            setCount(0);
            return;
        }
        try {
            const data = await getSocialOverview(accessToken);
            const unreadMsgs = (data.friends || []).reduce(
                (sum, f) => sum + (f.unreadCount || 0),
                0
            );
            const pendingReqs = (data.incomingRequests || []).length;
            setCount(unreadMsgs + pendingReqs);
        } catch {
            // ignore transient errors
        }
    }, [user?.id, accessToken]);

    useEffect(() => {
        if (!user || !accessToken) {
            setCount(0);
            return;
        }

        fetchCount();

        // Instant sync when SocialPage reads messages or responds to requests
        const handleRefresh = () => fetchCount();
        window.addEventListener('social-badge-refresh', handleRefresh);

        // Real-time SSE stream for instant incoming notifications
        const controller = new AbortController();
        async function connectStream() {
            try {
                const res = await fetch(`${API_BASE_URL}/api/social/stream`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    credentials: 'include',
                    signal: controller.signal,
                });
                if (!res.ok || !res.body) return;

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const chunks = buffer.split('\n\n');
                    buffer = chunks.pop() || '';

                    for (const chunk of chunks) {
                        if (
                            chunk.includes('event: message_new') ||
                            chunk.includes('event: social_update')
                        ) {
                            fetchCount();
                        }
                    }
                }
            } catch {
                // aborted or disconnected
            }
        }

        connectStream();

        return () => {
            window.removeEventListener('social-badge-refresh', handleRefresh);
            controller.abort();
        };
    }, [user?.id, accessToken, fetchCount]);

    if (!count) return null;

    return (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-mono font-semibold rounded-full bg-navy text-white">
            {count > 99 ? '99+' : count}
        </span>
    );
}