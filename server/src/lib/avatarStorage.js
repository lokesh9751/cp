import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');
const AVATARS_DIR = path.join(UPLOADS_ROOT, 'avatars');

const CLOUDINARY_FOLDER = 'cp/avatars';

function isCloudinaryConfigured() {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

function configureCloudinary() {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}

async function uploadBufferToCloudinary(buffer, publicId) {
    configureCloudinary();
    const dataUri = `data:image/webp;base64,${buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
        folder: CLOUDINARY_FOLDER,
        public_id: publicId,
        resource_type: 'image',
        format: 'webp',
    });
    return result.secure_url;
}

function extractCloudinaryPublicId(avatarUrl) {
    const match = String(avatarUrl || '').match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i);
    return match ? match[1] : null;
}

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

    const uniqueName = `${userId}-${crypto.randomBytes(6).toString('hex')}`;

    if (isCloudinaryConfigured()) {
        return uploadBufferToCloudinary(processedBuffer, uniqueName);
    }

    // Fallback to local disk if Cloudinary env vars are not set yet
    await ensureAvatarsDir();
    const filename = `${uniqueName}.webp`;
    const filePath = path.join(AVATARS_DIR, filename);
    await fs.writeFile(filePath, processedBuffer);

    return `/uploads/avatars/${filename}`;
}

export async function deleteLocalAvatar(avatarUrl) {
    if (!avatarUrl) return;

    // Delete from Cloudinary if it's a Cloudinary URL
    if (avatarUrl.includes('res.cloudinary.com') && isCloudinaryConfigured()) {
        const publicId = extractCloudinaryPublicId(avatarUrl);
        if (publicId) {
            try {
                configureCloudinary();
                await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
            } catch {
                // Ignore if already deleted
            }
        }
        return;
    }

    // Delete from local disk for legacy /uploads/avatars/ paths
    if (!avatarUrl.startsWith('/uploads/avatars/')) return;
    const filename = path.basename(avatarUrl);
    const filePath = path.join(AVATARS_DIR, filename);
    try {
        await fs.unlink(filePath);
    } catch {
        // Ignore if already deleted
    }
}