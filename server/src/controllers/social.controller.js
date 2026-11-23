import {
    searchUsersForFriend,
    getSocialOverview,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    getConversationMessages,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
} from '../services/social.service.js';
import {
    addSocialClient,
    removeSocialClient,
    emitSocialEvent,
} from '../lib/socialEvents.js';

function handleErr(err, res, next) {
    if (err?.status) {
        return res.status(err.status).json({
            error: { code: err.code || 'ERROR', message: err.message },
        });
    }
    return next(err);
}

export function streamSocialEvents(req, res) {
    const userId = req.user.id;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    addSocialClient(userId, res);

    const heartbeat = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch {
            clearInterval(heartbeat);
        }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        removeSocialClient(userId, res);
    });
}

export async function searchUsers(req, res, next) {
    try {
        const users = await searchUsersForFriend(req.user.id, req.query.q);
        res.json({ users });
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function getOverview(req, res, next) {
    try {
        const data = await getSocialOverview(req.user.id);
        res.json(data);
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function createFriendRequest(req, res, next) {
    try {
        const { userId } = req.body || {};
        if (!userId) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Target userId is required' },
            });
        }
        const friendship = await sendFriendRequest(req.user.id, userId);
        emitSocialEvent([req.user.id, userId], 'social_update', { type: 'REQUEST_UPDATED' });
        res.status(201).json({ friendship });
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function updateFriendRequest(req, res, next) {
    try {
        const { id } = req.params;
        const { action } = req.body || {};
        if (!['ACCEPT', 'REJECT', 'CANCEL'].includes(action)) {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Action must be ACCEPT, REJECT, or CANCEL' },
            });
        }
        const result = await respondToFriendRequest(req.user.id, id, action);
        emitSocialEvent([result.requesterId, result.addresseeId], 'social_update', {
            type: 'REQUEST_UPDATED',
        });
        res.json({ friendship: result });
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function deleteFriend(req, res, next) {
    try {
        const { friendId } = req.params;
        await removeFriend(req.user.id, friendId);
        emitSocialEvent([req.user.id, friendId], 'social_update', { type: 'FRIEND_REMOVED' });
        res.json({ removed: true });
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function getMessages(req, res, next) {
    try {
        const { friendId } = req.params;
        const messages = await getConversationMessages(req.user.id, friendId);
        res.json({ messages });
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function postMessage(req, res, next) {
    try {
        const { friendId } = req.params;
        const message = await sendChatMessage(req.user.id, friendId, req.body?.content);
        emitSocialEvent([req.user.id, friendId], 'message_new', { message });
        res.status(201).json({ message });
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function patchMessage(req, res, next) {
    try {
        const { messageId } = req.params;
        const message = await editChatMessage(req.user.id, messageId, req.body?.content);
        emitSocialEvent([message.senderId, message.receiverId], 'message_updated', { message });
        res.json({ message });
    } catch (err) {
        handleErr(err, res, next);
    }
}

export async function removeMessage(req, res, next) {
    try {
        const { messageId } = req.params;
        const message = await deleteChatMessage(req.user.id, messageId);
        emitSocialEvent([message.senderId, message.receiverId], 'message_deleted', { message });
        res.json({ message });
    } catch (err) {
        handleErr(err, res, next);
    }
}