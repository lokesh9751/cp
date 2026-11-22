import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

async function ensureAvatarsDir() {
    await fs.mkdir(AVATARS_DIR, { recursive: true });
}

export async function processAndSaveAvatar(buffer, userId) {
    // Validate actual image bytes & convert to 256x256 WebP (strips EXIF)
    let processedBuffer;
    try {
        processedBuffer = await sharp(buffer)
            .rotate() // respects orientation before stripping EXIF
            .resize(256, 256, { fit: 'cover', position: 'centre' })
            .webp({ quality: 82 })
            .toBuffer();
    } catch {
        const err = new Error('Invalid or unsupported image file');
        err.status = 400;
        throw err;
    }

    await ensureAvatarsDir();
    const filename = `${userId}-${crypto.randomBytes(6).toString('hex')}.webp`;
    const filePath = path.join(AVATARS_DIR, filename);
    await fs.writeFile(filePath, processedBuffer);

    return `/uploads/avatars/${filename}`;
}

export async function deleteLocalAvatar(avatarUrl) {
    if (!avatarUrl || !avatarUrl.startsWith('/uploads/avatars/')) return;
    const filename = path.basename(avatarUrl);
    const filePath = path.join(AVATARS_DIR, filename);
    try {
        await fs.unlink(filePath);
    } catch {
        // Ignore if already deleted
    }
}