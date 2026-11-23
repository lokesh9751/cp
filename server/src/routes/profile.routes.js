import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import {
    getProfile,
    patchProfile,
    uploadAvatar,
    deleteAvatar,
    getMyAnalytics,
    getPublicProfile,
} from '../controllers/profile.controller.js';



const router = express.Router();

const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, WebP, and GIF images are allowed'));
        }
    },
});

function handleAvatarUpload(req, res, next) {
    upload.single('avatar')(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'Image must be 2 MB or smaller' },
            });
        }
        return res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: err.message || 'Upload failed' },
        });
    });
}

router.get('/', requireAuth, getProfile);
router.patch('/', requireAuth, patchProfile);
router.post('/avatar', requireAuth, handleAvatarUpload, uploadAvatar);
router.delete('/avatar', requireAuth, deleteAvatar);
router.get('/analytics', requireAuth, getMyAnalytics);
router.get('/u/:username', getPublicProfile);

export default router;