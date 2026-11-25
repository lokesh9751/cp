import express from 'express';
import { validateBody } from '../middleware/validate.js';
import {
    signupSchema,
    loginSchema,
    googleAuthSchema,
    changeEmailSchema,
    changePasswordSchema,
    deleteAccountSchema,
} from '../validators/auth.validator.js';
import {
    signup,
    login,
    googleAuth,
    refresh,
    logout,
    me,
    changeEmail,
    changePassword,
    deleteAccount,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', validateBody(signupSchema), signup);
router.post('/login', validateBody(loginSchema), login);
router.post('/google', validateBody(googleAuthSchema), googleAuth);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

router.patch('/email', requireAuth, validateBody(changeEmailSchema), changeEmail);
router.patch('/password', requireAuth, validateBody(changePasswordSchema), changePassword);
router.delete('/account', requireAuth, validateBody(deleteAccountSchema), deleteAccount);

export default router;