import { prisma } from '../lib/prisma.js';

const USER_PUBLIC_SELECT = {
    id: true,
    username: true,
    avatarUrl: true,
    rating: true,
};

function createError(status, code, message) {
    const err = new Error(message);
    err.status = status;
    err.code = code;
    return err;
}

export async function searchUsersForFriend(currentUserId, query) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];

    const users = await prisma.user.findMany({
        where: {
            id: { not: currentUserId },
            username: { contains: q, mode: 'insensitive' },
            isBanned: false,
            isProfileHidden: false,
        },
        select: USER_PUBLIC_SELECT,
        take: 15,
        orderBy: { username: 'asc' },
    });

    if (users.length === 0) return [];

    const targetIds = users.map((u) => u.id);
    const relations = await prisma.friendship.findMany({
        where: {
            OR: [
                { requesterId: currentUserId, addresseeId: { in: targetIds } },
                { requesterId: { in: targetIds }, addresseeId: currentUserId },
            ],
        },
    });

    const relMap = new Map();
    for (const r of relations) {
        const otherId = r.requesterId === currentUserId ? r.addresseeId : r.requesterId;
        relMap.set(otherId, r);
    }

    return users.map((u) => {
        const rel = relMap.get(u.id);
        let relationStatus = 'NONE';
        let friendshipId = null;

        if (rel) {
            friendshipId = rel.id;
            if (rel.status === 'ACCEPTED') {
                relationStatus = 'FRIENDS';
            } else if (rel.status === 'PENDING') {
                relationStatus = rel.requesterId === currentUserId ? 'OUTGOING_PENDING' : 'INCOMING_PENDING';
            }
        }

        return { ...u, relationStatus, friendshipId };
    });
}

export async function getSocialOverview(currentUserId) {
    const [friendships, unreadGroups] = await Promise.all([
        prisma.friendship.findMany({
            where: {
                OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
                status: { in: ['ACCEPTED', 'PENDING'] },
            },
            include: {
                requester: { select: USER_PUBLIC_SELECT },
                addressee: { select: USER_PUBLIC_SELECT },
            },
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.message.groupBy({
            by: ['senderId'],
            where: {
                receiverId: currentUserId,
                readAt: null,
                isDeleted: false,
            },
            _count: { id: true },
        }),
    ]);

    const unreadMap = new Map(unreadGroups.map((g) => [g.senderId, g._count.id]));

    const friends = [];
    const incomingRequests = [];
    const outgoingRequests = [];

    for (const f of friendships) {
        const isRequester = f.requesterId === currentUserId;
        const otherUser = isRequester ? f.addressee : f.requester;

        if (f.status === 'ACCEPTED') {
            friends.push({
                friendshipId: f.id,
                user: otherUser,
                unreadCount: unreadMap.get(otherUser.id) || 0,
                since: f.updatedAt,
            });
        } else if (f.status === 'PENDING') {
            const reqItem = {
                friendshipId: f.id,
                user: otherUser,
                createdAt: f.createdAt,
            };
            if (isRequester) outgoingRequests.push(reqItem);
            else incomingRequests.push(reqItem);
        }
    }

    // Fetch last message per friend for chat list preview
    const friendIds = friends.map((f) => f.user.id);
    if (friendIds.length > 0) {
        const recentMsgs = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: currentUserId, receiverId: { in: friendIds } },
                    { senderId: { in: friendIds }, receiverId: currentUserId },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        const lastMsgMap = new Map();
        for (const m of recentMsgs) {
            const otherId = m.senderId === currentUserId ? m.receiverId : m.senderId;
            if (!lastMsgMap.has(otherId)) {
                lastMsgMap.set(otherId, {
                    id: m.id,
                    senderId: m.senderId,
                    content: m.isDeleted ? 'This message was deleted' : m.content,
                    isDeleted: m.isDeleted,
                    createdAt: m.createdAt,
                });
            }
        }

        for (const f of friends) {
            f.lastMessage = lastMsgMap.get(f.user.id) || null;
        }

        // Sort friends by most recent message activity
        friends.sort((a, b) => {
            const tA = new Date(a.lastMessage?.createdAt || a.since).getTime();
            const tB = new Date(b.lastMessage?.createdAt || b.since).getTime();
            return tB - tA;
        });
    }

    return { friends, incomingRequests, outgoingRequests };
}

export async function sendFriendRequest(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
        throw createError(400, 'VALIDATION_ERROR', 'You cannot add yourself as a friend');
    }

    const target = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: USER_PUBLIC_SELECT,
    });
    if (!target) {
        throw createError(404, 'NOT_FOUND', 'User not found');
    }

    const existing = await prisma.friendship.findFirst({
        where: {
            OR: [
                { requesterId: currentUserId, addresseeId: targetUserId },
                { requesterId: targetUserId, addresseeId: currentUserId },
            ],
        },
    });

    if (existing) {
        if (existing.status === 'ACCEPTED') {
            throw createError(409, 'ALREADY_FRIENDS', 'You are already friends with this user');
        }
        if (existing.status === 'PENDING') {
            if (existing.requesterId === targetUserId) {
                // Auto-accept if they already sent you a request
                return prisma.friendship.update({
                    where: { id: existing.id },
                    data: { status: 'ACCEPTED' },
                });
            }
            throw createError(409, 'ALREADY_SENT', 'Friend request already sent');
        }
        // Re-send if previously rejected
        return prisma.friendship.update({
            where: { id: existing.id },
            data: {
                requesterId: currentUserId,
                addresseeId: targetUserId,
                status: 'PENDING',
            },
        });
    }

    return prisma.friendship.create({
        data: {
            requesterId: currentUserId,
            addresseeId: targetUserId,
            status: 'PENDING',
        },
    });
}

export async function respondToFriendRequest(currentUserId, friendshipId, action) {
    const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.status !== 'PENDING') {
        throw createError(404, 'NOT_FOUND', 'Friend request not found');
    }

    if (action === 'CANCEL') {
        if (friendship.requesterId !== currentUserId) {
            throw createError(403, 'FORBIDDEN', 'Only the sender can cancel this request');
        }
        await prisma.friendship.delete({ where: { id: friendshipId } });
        return { ...friendship, deleted: true };
    }

    if (friendship.addresseeId !== currentUserId) {
        throw createError(403, 'FORBIDDEN', 'You cannot respond to this request');
    }

    const nextStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
    return prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: nextStatus },
    });
}

export async function removeFriend(currentUserId, friendUserId) {
    const existing = await prisma.friendship.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { requesterId: currentUserId, addresseeId: friendUserId },
                { requesterId: friendUserId, addresseeId: currentUserId },
            ],
        },
    });

    if (!existing) {
        throw createError(404, 'NOT_FOUND', 'Friendship not found');
    }

    await prisma.friendship.delete({ where: { id: existing.id } });
    return { removedUserId: friendUserId };
}

async function assertAreFriends(userA, userB) {
    const friendship = await prisma.friendship.findFirst({
        where: {
            status: 'ACCEPTED',
            OR: [
                { requesterId: userA, addresseeId: userB },
                { requesterId: userB, addresseeId: userA },
            ],
        },
    });
    if (!friendship) {
        throw createError(403, 'NOT_FRIENDS', 'You can only chat with accepted friends');
    }
}

export async function getConversationMessages(currentUserId, friendUserId) {
    await assertAreFriends(currentUserId, friendUserId);

    // Mark incoming messages as read
    await prisma.message.updateMany({
        where: {
            senderId: friendUserId,
            receiverId: currentUserId,
            readAt: null,
        },
        data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
        where: {
            OR: [
                { senderId: currentUserId, receiverId: friendUserId },
                { senderId: friendUserId, receiverId: currentUserId },
            ],
        },
        orderBy: { createdAt: 'asc' },
        take: 150,
    });

    return messages.map((m) => ({
        ...m,
        content: m.isDeleted ? '' : m.content,
    }));
}

export async function sendChatMessage(currentUserId, friendUserId, content) {
    await assertAreFriends(currentUserId, friendUserId);

    const trimmed = String(content || '').trim();
    if (!trimmed || trimmed.length > 2000) {
        throw createError(400, 'VALIDATION_ERROR', 'Message must be between 1 and 2000 characters');
    }

    return prisma.message.create({
        data: {
            senderId: currentUserId,
            receiverId: friendUserId,
            content: trimmed,
        },
    });
}

export async function editChatMessage(currentUserId, messageId, content) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw createError(404, 'NOT_FOUND', 'Message not found');
    if (msg.senderId !== currentUserId) {
        throw createError(403, 'FORBIDDEN', 'You can only edit your own messages');
    }
    if (msg.isDeleted) {
        throw createError(400, 'VALIDATION_ERROR', 'Cannot edit a deleted message');
    }

    const trimmed = String(content || '').trim();
    if (!trimmed || trimmed.length > 2000) {
        throw createError(400, 'VALIDATION_ERROR', 'Message must be between 1 and 2000 characters');
    }

    return prisma.message.update({
        where: { id: messageId },
        data: { content: trimmed, editedAt: new Date() },
    });
}

export async function deleteChatMessage(currentUserId, messageId) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw createError(404, 'NOT_FOUND', 'Message not found');
    if (msg.senderId !== currentUserId) {
        throw createError(403, 'FORBIDDEN', 'You can only delete your own messages');
    }

    return prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true, content: '' },
    });
}