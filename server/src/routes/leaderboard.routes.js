import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getGlobalLeaderboard } from '../controllers/globalLeaderboard.controller.js';

const router = express.Router();

router.get('/', optionalAuth, getGlobalLeaderboard);

export default router;