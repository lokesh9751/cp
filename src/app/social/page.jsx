'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
    API_BASE_URL,
    resolveAssetUrl,
    getSocialOverview,
    searchSocialUsers,
    sendFriendRequestApi,
    respondFriendRequestApi,
    removeFriendApi,
    getChatMessages,
    sendChatMessageApi,
    editChatMessageApi,
    deleteChatMessageApi,
} from '@/lib/api';

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0]?.toUpperCase() || 'U';
}

function formatTime(dateValue) {
    if (!dateValue) return '';
    const d = new Date(dateValue);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ user, size = 'md' }) {
    const src = resolveAssetUrl(user?.avatarUrl);
    const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    if (src) {
        return (
            <img
                src={src}
                alt={user?.username || 'User'}
                className={`${dim} rounded-full object-cover border border-border shrink-0`}
            />
        );
    }
    return (
        <div
            className={`${dim} rounded-full bg-navy text-white flex items-center justify-center font-semibold shrink-0`}
        >
            {getInitials(user?.username)}
        </div>
    );
}

export default function SocialPage() {
    const { user, accessToken, isLoading: authLoading, refresh } = useAuth();

    const [tab, setTab] = useState('chats'); // 'chats' | 'requests' | 'add'
    const [overview, setOverview] = useState({
        friends: [],
        incomingRequests: [],
        outgoingRequests: [],
        isSuperuser: false,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Search / Add friend state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Active chat state
    const [activeFriend, setActiveFriend] = useState(null);
    const [messages, setMessages] = useState([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    // Edit message state
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    const lastMessageId = messages[messages.length - 1]?.id;

    const messagesContainerRef = useRef(null);
    const activeFriendRef = useRef(null);
    activeFriendRef.current = activeFriend;

    const runAuthed = useCallback(
        async (fn) => {
            try {
                return await fn(accessToken);
            } catch (err) {
                if (err?.status === 401 && refresh) {
                    const newToken = await refresh();
                    if (newToken) return await fn(newToken);
                }
                throw err;
            }
        },
        [accessToken, refresh]
    );

    const loadOverview = useCallback(async () => {
        if (!accessToken) return;
        try {
            const data = await runAuthed((token) => getSocialOverview(token));
            setOverview(data);
            setError('');
        } catch (err) {
            setError(err?.message || 'Unable to load social data.');
        } finally {
            setLoading(false);
        }
    }, [accessToken, runAuthed]);

    const loadMessages = useCallback(
        async (friendUser, { silent = false } = {}) => {
            if (!friendUser || !accessToken) return;
            if (!silent) setMessagesLoading(true);
            try {
                const list = await runAuthed((token) => getChatMessages(friendUser.id, token));
                setMessages(list);
                setOverview((prev) => ({
                    ...prev,
                    friends: prev.friends.map((f) =>
                        f.user.id === friendUser.id ? { ...f, unreadCount: 0 } : f
                    ),
                }));
                window.dispatchEvent(new Event('social-badge-refresh'));
            } catch (err) {
                if (!silent) setError(err?.message || 'Unable to load messages.');
            } finally {
                if (!silent) setMessagesLoading(false);
            }
        },
        [accessToken, runAuthed]
    );

    useEffect(() => {
        if (authLoading) return;
        if (!user || !accessToken) {
            setLoading(false);
            return;
        }
        loadOverview();
    }, [authLoading, user?.id, accessToken, loadOverview]);

    // Auto-scroll only inside the messages container (page stays stable)
    useEffect(() => {
        if (messagesLoading || !activeFriend) return;
        const el = messagesContainerRef.current;
        if (!el) return;

        const frame = requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight;
        });

        return () => cancelAnimationFrame(frame);
    }, [lastMessageId, messages.length, messagesLoading, activeFriend?.id]);

    // Live SSE stream using fetch (supports Bearer token)
    useEffect(() => {
        if (!user || !accessToken) return;
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

                        if (!dataStr) continue;
                        let payload = null;
                        try {
                            payload = JSON.parse(dataStr);
                        } catch {
                            continue;
                        }

                        if (eventName === 'social_update') {
                            loadOverview();
                        } else if (eventName === 'message_new' && payload?.message) {
                            const msg = payload.message;
                            const current = activeFriendRef.current;
                            const isCurrentChat =
                                current &&
                                (msg.senderId === current.id || msg.receiverId === current.id);

                            if (isCurrentChat) {
                                setMessages((prev) =>
                                    prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
                                );
                                if (msg.senderId === current.id) {
                                    loadMessages(current, { silent: true });
                                }
                            }
                            loadOverview();
                            window.dispatchEvent(new Event('social-badge-refresh'));
                        } else if (
                            (eventName === 'message_updated' || eventName === 'message_deleted') &&
                            payload?.message
                        ) {
                            const updated = payload.message;
                            setMessages((prev) =>
                                prev.map((m) => (m.id === updated.id ? updated : m))
                            );
                            loadOverview();
                        }
                    }
                }
            } catch {
                // Aborted or disconnected
            }
        }

        connectStream();
        return () => controller.abort();
    }, [user?.id, accessToken, loadOverview, loadMessages]);

    // Debounced user search for Add Friend tab
    useEffect(() => {
        if (tab !== 'add' || !accessToken) return;
        const q = searchQuery.trim();
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const users = await runAuthed((token) => searchSocialUsers(q, token));
                setSearchResults(users);
            } catch {
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, tab, accessToken, runAuthed]);

    const handleSelectFriend = (friendUser) => {
        setActiveFriend(friendUser);
        setEditingId(null);
        setEditDraft('');
        loadMessages(friendUser);
    };

    const handleSendRequest = async (targetUserId) => {
        try {
            await runAuthed((token) => sendFriendRequestApi(targetUserId, token));
            setSearchResults((prev) =>
                prev.map((u) =>
                    u.id === targetUserId ? { ...u, relationStatus: 'OUTGOING_PENDING' } : u
                )
            );
            loadOverview();
        } catch (err) {
            setError(err?.message || 'Failed to send request.');
        }
    };

    const handleRespondRequest = async (friendshipId, action) => {
        try {
            await runAuthed((token) => respondFriendRequestApi(friendshipId, action, token));
            loadOverview();
            window.dispatchEvent(new Event('social-badge-refresh'));
        } catch (err) {
            setError(err?.message || 'Failed to update request.');
        }
    };

    const handleRemoveFriend = async (friendId) => {
        try {
            await runAuthed((token) => removeFriendApi(friendId, token));
            if (activeFriend?.id === friendId) {
                setActiveFriend(null);
                setMessages([]);
            }
            loadOverview();
        } catch (err) {
            setError(err?.message || 'Failed to remove friend.');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const content = draft.trim();
        if (!content || !activeFriend || sending) return;

        setSending(true);
        try {
            const msg = await runAuthed((token) =>
                sendChatMessageApi(activeFriend.id, content, token)
            );
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            setDraft('');
            loadOverview();
        } catch (err) {
            setError(err?.message || 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const handleSaveEdit = async (messageId) => {
        const content = editDraft.trim();
        if (!content) return;
        try {
            const updated = await runAuthed((token) =>
                editChatMessageApi(messageId, content, token)
            );
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
            setEditingId(null);
            setEditDraft('');
        } catch (err) {
            setError(err?.message || 'Failed to edit message.');
        }
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            const updated = await runAuthed((token) =>
                deleteChatMessageApi(messageId, token)
            );
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        } catch (err) {
            setError(err?.message || 'Failed to delete message.');
        }
    };

    if (!authLoading && !user) {
        return (
            <div className="max-w-lg mx-auto my-12 bg-bg-card border border-border rounded-lg p-8 text-center">
                <h1 className="text-section-title text-text-primary mb-2">Log in to access Friends & Chat</h1>
                <p className="text-small text-text-secondary mb-6">
                    Add friends, manage requests, and message other competitive programmers.
                </p>
                <Link
                    href="/login"
                    className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors no-underline"
                >
                    Log in
                </Link>
            </div>
        );
    }

    const unreadChatsCount = (overview.friends || []).reduce(
        (sum, f) => sum + (f.unreadCount || 0),
        0
    );
    const incomingCount = overview.incomingRequests?.length || 0;

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            {error && (
                <div className="mb-4 px-4 py-2.5 rounded-lg border border-border bg-error-bg text-error text-small flex items-center justify-between">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError('')} className="text-xs underline">
                        Dismiss
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-130px)] min-h-[520px]">
                {/* Left Sidebar: Unified Tabs (Chats / Requests / Add Friend) */}
                <aside className="md:col-span-4 bg-bg-card border border-border rounded-lg flex flex-col overflow-hidden h-full min-h-0">
                    <div className="p-3 border-b border-border">
                        <div className="grid grid-cols-3 gap-1 bg-bg-section p-1 rounded-lg border border-border">
                            <button
                                type="button"
                                onClick={() => setTab('chats')}
                                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'chats'
                                    ? 'bg-navy text-white'
                                    : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                Chats{unreadChatsCount > 0 ? ` (${unreadChatsCount})` : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('requests')}
                                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'requests'
                                    ? 'bg-navy text-white'
                                    : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                Requests{incomingCount > 0 ? ` (${incomingCount})` : ''}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTab('add')}
                                className={`py-1.5 text-xs font-medium rounded-md transition-colors ${tab === 'add'
                                    ? 'bg-navy text-white'
                                    : 'text-text-secondary hover:text-text-primary'
                                    }`}
                            >
                                Add friend
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-border">
                        {loading ? (
                            <div className="p-6 text-center text-small text-text-muted">Loading...</div>
                        ) : tab === 'chats' ? (
                            overview.friends.length === 0 ? (
                                <div className="p-6 text-center space-y-3">
                                    <p className="text-small text-text-secondary">No friends yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => setTab('add')}
                                        className="px-3.5 py-1.5 text-xs font-medium bg-navy text-white hover:bg-navy-hover rounded-lg"
                                    >
                                        Find users
                                    </button>
                                </div>
                            ) : (
                                overview.friends.map((item) => {
                                    const isSelected = activeFriend?.id === item.user.id;
                                    return (
                                        <button
                                            key={item.friendshipId}
                                            type="button"
                                            onClick={() => handleSelectFriend(item.user)}
                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isSelected ? 'bg-bg-section' : 'hover:bg-row-hover'
                                                }`}
                                        >
                                            <Avatar user={item.user} />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-small font-medium text-text-primary truncate">
                                                        @{item.user.username}
                                                    </span>
                                                    {item.unreadCount > 0 && (
                                                        <span className="px-1.5 py-0.5 text-[11px] font-mono font-semibold rounded-full bg-navy text-white">
                                                            {item.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-muted truncate mt-0.5">
                                                    {item.lastMessage
                                                        ? item.lastMessage.content
                                                        : 'Start a conversation'}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )
                        ) : tab === 'requests' ? (
                            <div className="p-4 space-y-5">
                                <div>
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                                        Incoming ({overview.incomingRequests.length})
                                    </h3>
                                    {overview.incomingRequests.length === 0 ? (
                                        <p className="text-small text-text-secondary">No pending requests.</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {overview.incomingRequests.map((req) => (
                                                <div
                                                    key={req.friendshipId}
                                                    className="p-3 rounded-lg bg-bg-section border border-border flex items-center justify-between gap-2"
                                                >
                                                    <Link
                                                        href={`/u/${req.user.username}`}
                                                        className="flex items-center gap-2.5 min-w-0 no-underline"
                                                    >
                                                        <Avatar user={req.user} size="sm" />
                                                        <span className="text-small font-medium text-text-primary truncate hover:text-navy">
                                                            @{req.user.username}
                                                        </span>
                                                    </Link>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondRequest(req.friendshipId, 'ACCEPT')}
                                                            className="px-2.5 py-1 text-xs font-medium bg-navy text-white hover:bg-navy-hover rounded-md"
                                                        >
                                                            Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondRequest(req.friendshipId, 'REJECT')}
                                                            className="px-2.5 py-1 text-xs font-medium border border-border text-text-secondary hover:text-error rounded-md"
                                                        >
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-border">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-2">
                                        Sent ({overview.outgoingRequests.length})
                                    </h3>
                                    {overview.outgoingRequests.length === 0 ? (
                                        <p className="text-small text-text-secondary">No sent requests.</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {overview.outgoingRequests.map((req) => (
                                                <div
                                                    key={req.friendshipId}
                                                    className="p-3 rounded-lg bg-bg-section border border-border flex items-center justify-between gap-2"
                                                >
                                                    <Link
                                                        href={`/u/${req.user.username}`}
                                                        className="flex items-center gap-2.5 min-w-0 no-underline"
                                                    >
                                                        <Avatar user={req.user} size="sm" />
                                                        <span className="text-small font-medium text-text-primary truncate hover:text-navy">
                                                            @{req.user.username}
                                                        </span>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRespondRequest(req.friendshipId, 'CANCEL')}
                                                        className="px-2.5 py-1 text-xs font-medium border border-border text-text-secondary hover:text-error rounded-md shrink-0"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by username..."
                                    className="w-full px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy"
                                />

                                {searching ? (
                                    <p className="text-xs text-text-muted">Searching...</p>
                                ) : searchQuery.trim().length < 2 ? (
                                    <p className="text-xs text-text-muted">
                                        Type at least 2 characters to search users.
                                    </p>
                                ) : searchResults.length === 0 ? (
                                    <p className="text-small text-text-secondary">No users found.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {searchResults.map((u) => (
                                            <div
                                                key={u.id}
                                                className="p-2.5 rounded-lg bg-bg-section border border-border flex items-center justify-between gap-2"
                                            >
                                                <Link
                                                    href={`/u/${u.username}`}
                                                    className="flex items-center gap-2.5 min-w-0 no-underline"
                                                >
                                                    <Avatar user={u} size="sm" />
                                                    <div className="min-w-0">
                                                        <p className="text-small font-medium text-text-primary truncate hover:text-navy">
                                                            @{u.username}
                                                        </p>
                                                        <p className="text-[11px] font-mono text-text-muted">
                                                            Rating {u.rating ?? 1200}
                                                        </p>
                                                    </div>
                                                </Link>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {(user?.role === 'SUPERUSER' || overview.isSuperuser) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setTab('chats');
                                                                handleSelectFriend(u);
                                                            }}
                                                            className="px-2.5 py-1 text-xs font-medium border border-border text-text-primary hover:bg-bg-card rounded-md"
                                                        >
                                                            Message
                                                        </button>
                                                    )}
                                                    {u.relationStatus === 'FRIENDS' ? (
                                                        <span className="text-xs text-text-muted px-2">Friends</span>
                                                    ) : u.relationStatus === 'OUTGOING_PENDING' ? (
                                                        <span className="text-xs text-text-muted px-2">Requested</span>
                                                    ) : u.relationStatus === 'INCOMING_PENDING' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRespondRequest(u.friendshipId, 'ACCEPT')}
                                                            className="px-2.5 py-1 text-xs font-medium bg-navy text-white rounded-md"
                                                        >
                                                            Accept
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendRequest(u.id)}
                                                            className="px-2.5 py-1 text-xs font-medium bg-navy text-white hover:bg-navy-hover rounded-md"
                                                        >
                                                            Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Right Panel: Chat Window */}
                <section className="md:col-span-8 bg-bg-card border border-border rounded-lg flex flex-col overflow-hidden h-full min-h-0">
                    {!activeFriend ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <h2 className="text-section-title text-text-primary">Select a conversation</h2>
                            <p className="text-small text-text-secondary mt-1 max-w-sm">
                                Choose a friend from the list to start chatting, or use the Add friend tab to connect with other players.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3 bg-bg-card">
                                <Link
                                    href={`/u/${activeFriend.username}`}
                                    className="flex items-center gap-3 min-w-0 no-underline"
                                >
                                    <Avatar user={activeFriend} />
                                    <div className="min-w-0">
                                        <p className="text-card-title text-text-primary truncate hover:text-navy">
                                            @{activeFriend.username}
                                        </p>
                                        <p className="text-xs text-text-muted">View public profile</p>
                                    </div>
                                </Link>

                                {overview.friends.some((f) => f.user.id === activeFriend.id && !f.isDirectSuperuser) && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFriend(activeFriend.id)}
                                        className="px-3 py-1.5 text-xs font-medium border border-border text-text-secondary hover:text-error hover:bg-bg-section rounded-lg transition-colors"
                                    >
                                        Remove friend
                                    </button>
                                )}
                            </div>

                            {/* Messages Feed */}
                            <div
                                ref={messagesContainerRef}
                                className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 bg-bg-page/40"
                            >
                                {messagesLoading ? (
                                    <p className="text-center text-small text-text-muted">Loading messages...</p>
                                ) : messages.length === 0 ? (
                                    <p className="text-center text-small text-text-muted py-12">
                                        No messages yet. Say hello to @{activeFriend.username}.
                                    </p>
                                ) : (
                                    messages.map((msg) => {
                                        const isMine = msg.senderId === user.id;
                                        const isEditing = editingId === msg.id;

                                        return (
                                            <div
                                                key={msg.id}
                                                className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[78%] rounded-lg px-3.5 py-2 border ${msg.isDeleted
                                                        ? 'bg-bg-section border-border text-text-muted italic'
                                                        : isMine
                                                            ? 'bg-navy text-white border-navy'
                                                            : 'bg-bg-card text-text-primary border-border'
                                                        }`}
                                                >
                                                    {msg.isDeleted ? (
                                                        <p className="text-small">This message was deleted</p>
                                                    ) : isEditing ? (
                                                        <div className="space-y-2 min-w-[220px]">
                                                            <input
                                                                type="text"
                                                                value={editDraft}
                                                                onChange={(e) => setEditDraft(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleSaveEdit(msg.id);
                                                                    if (e.key === 'Escape') setEditingId(null);
                                                                }}
                                                                autoFocus
                                                                className="w-full px-2.5 py-1 text-small rounded bg-bg-input text-text-primary border border-border focus:outline-none"
                                                            />
                                                            <div className="flex justify-end gap-2 text-xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingId(null)}
                                                                    className="opacity-80 hover:opacity-100"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveEdit(msg.id)}
                                                                    className="font-semibold underline"
                                                                >
                                                                    Save
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-small whitespace-pre-wrap break-words">
                                                            {msg.content}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
                                                    <span className="font-mono">{formatTime(msg.createdAt)}</span>
                                                    {msg.editedAt && !msg.isDeleted && <span>(edited)</span>}
                                                    {isMine && !msg.isDeleted && !isEditing && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingId(msg.id);
                                                                    setEditDraft(msg.content);
                                                                }}
                                                                className="hover:text-text-primary"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteMessage(msg.id)}
                                                                className="hover:text-error"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Message Input */}
                            <form
                                onSubmit={handleSendMessage}
                                className="p-3.5 border-t border-border bg-bg-card flex items-center gap-2.5"
                            >
                                <input
                                    type="text"
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    placeholder={`Message @${activeFriend.username}...`}
                                    maxLength={2000}
                                    className="flex-1 px-3.5 py-2 text-small border border-border rounded-lg bg-bg-input text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-navy"
                                />
                                <button
                                    type="submit"
                                    disabled={!draft.trim() || sending}
                                    className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors"
                                >
                                    {sending ? 'Sending...' : 'Send'}
                                </button>
                            </form>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}