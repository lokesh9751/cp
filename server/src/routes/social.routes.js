import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
    streamSocialEvents,
    searchUsers,
    getOverview,
    createFriendRequest,
    updateFriendRequest,
    deleteFriend,
    getMessages,
    postMessage,
    patchMessage,
    removeMessage,
} from '../controllers/social.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/stream', streamSocialEvents);
router.get('/overview', getOverview);
router.get('/search', searchUsers);

router.post('/requests', createFriendRequest);
router.patch('/requests/:id', updateFriendRequest);
router.delete('/friends/:friendId', deleteFriend);

router.get('/messages/:friendId', getMessages);
router.post('/messages/:friendId', postMessage);
router.patch('/messages/:messageId', patchMessage);
router.delete('/messages/:messageId', removeMessage);

export default router;