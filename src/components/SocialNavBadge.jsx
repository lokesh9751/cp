'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { API_BASE_URL, getSocialOverview } from '@/lib/api';

const MUTE_STORAGE_KEY = 'cp-chat-sound-muted';

export default function SocialNavBadge() {
    const { user, accessToken } = useAuth();
    const pathname = usePathname();
    const [count, setCount] = useState(0);

    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;

    const audioRef = useRef(null);
    const unlockedRef = useRef(false);

    // Initialize Audio & unlock on first user interaction (browser autoplay rule)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const audio = new Audio('/sounds/message.mp3');
        audio.preload = 'auto';
        audioRef.current = audio;

        const unlockAudio = () => {
            if (unlockedRef.current || !audioRef.current) return;
            audioRef.current.muted = true;
            audioRef.current
                .play()
                .then(() => {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current.muted = false;
                    unlockedRef.current = true;
                })
                .catch(() => {
                    if (audioRef.current) audioRef.current.muted = false;
                });
        };

        window.addEventListener('pointerdown', unlockAudio, { passive: true });
        window.addEventListener('keydown', unlockAudio, { passive: true });
        return () => {
            window.removeEventListener('pointerdown', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
    }, []);

    const playNotificationSound = useCallback(() => {
        try {
            // 1. Agar user already /social page par hai toh sound nahi bajegi
            const currentPath = pathnameRef.current || '';
            if (currentPath === '/social' || currentPath.startsWith('/social/')) {
                return;
            }

            // 2. Agar user ne sound mute kar rakha hai toh sound nahi bajegi
            if (localStorage.getItem(MUTE_STORAGE_KEY) === 'true') {
                return;
            }

            const audio = audioRef.current || new Audio('/sounds/message.mp3');
            audio.currentTime = 0;
            audio.play().catch(() => {
                // Ignore if browser blocked autoplay before interaction
            });
        } catch {
            // Ignore storage/audio errors
        }
    }, []);

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

        const handleRefresh = () => fetchCount();
        window.addEventListener('social-badge-refresh', handleRefresh);

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
                        const lines = chunk.split('\n');
                        let eventName = 'message';
                        let dataStr = '';

                        for (const line of lines) {
                            if (line.startsWith('event:')) eventName = line.slice(6).trim();
                            else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
                        }

                        if (eventName === 'message_new') {
                            let payload = null;
                            try {
                                payload = dataStr ? JSON.parse(dataStr) : null;
                            } catch {
                                payload = null;
                            }

                            // Sirf tab sound bajao jab message kisi aur ne bheja ho
                            if (!payload?.message || payload.message.senderId !== user.id) {
                                playNotificationSound();
                            }
                            fetchCount();
                        } else if (eventName === 'social_update') {
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
    }, [user?.id, accessToken, fetchCount, playNotificationSound]);

    if (!count) return null;

    return (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-mono font-semibold rounded-full bg-navy text-white">
            {count > 99 ? '99+' : count}
        </span>
    );
}