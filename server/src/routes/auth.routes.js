import express from 'express';
import { validateBody } from '../middleware/validate.js';
import { signupSchema, loginSchema } from '../validators/auth.validator.js';
import { signup, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', validateBody(signupSchema), signup);

/**
 * @route POST /api/auth/login
 * @desc Login with email or username
 * @access Public
 */
router.post('/login', validateBody(loginSchema), login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token cookie
 * @access Public (with valid refresh token)
 */
router.post('/refresh', refresh);

/**
 * @route POST /api/auth/logout
 * @desc Logout and revoke session
 * @access Public
 */
router.post('/logout', logout);

/**
 * @route GET /api/auth/me
 * @desc Get current authenticated user
 * @access Private
 */
router.get('/me', requireAuth, me);

export default router;