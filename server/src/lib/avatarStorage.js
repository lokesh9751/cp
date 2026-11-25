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

async function processAnimatedGif(buffer, crop) {
    const meta = await sharp(buffer, {
        animated: true,
        limitInputPixels: 500_000_000,
    }).metadata();

    const pages = meta.pages || 1;
    const MAX_FRAMES = 60; // 60 * 256 = 15,360px (WebP max 16,383px ke andar)

    if (pages === 1) {
        let pipeline = sharp(buffer);
        if (crop) {
            const left = Math.max(0, Math.min(Math.round(crop.x), meta.width - 1));
            const top = Math.max(0, Math.min(Math.round(crop.y), meta.height - 1));
            const width = Math.max(1, Math.min(Math.round(crop.width), meta.width - left));
            const height = Math.max(1, Math.min(Math.round(crop.height), meta.height - top));
            pipeline = pipeline.extract({ left, top, width, height });
        }
        return pipeline
            .resize(256, 256, { fit: 'cover' })
            .webp({ quality: 80 })
            .toBuffer();
    }

    const { data, info } = await sharp(buffer, {
        animated: true,
        limitInputPixels: 500_000_000,
    })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const srcW = info.width;
    const srcH = Math.floor(info.height / pages);

    let left = 0;
    let top = 0;
    let cropW = srcW;
    let cropH = srcH;

    if (crop) {
        left = Math.max(0, Math.min(Math.round(crop.x), srcW - 1));
        top = Math.max(0, Math.min(Math.round(crop.y), srcH - 1));
        cropW = Math.max(1, Math.min(Math.round(crop.width), srcW - left));
        cropH = Math.max(1, Math.min(Math.round(crop.height), srcH - top));
    } else {
        const side = Math.min(srcW, srcH);
        left = Math.floor((srcW - side) / 2);
        top = Math.floor((srcH - side) / 2);
        cropW = side;
        cropH = side;
    }

    // Agar 60 se zyada frames hain toh evenly skip karke delay adjust karo
    const step = Math.ceil(pages / MAX_FRAMES);
    const resizedFrames = [];
    const delays = [];

    for (let p = 0; p < pages; p += step) {
        const frameRaw = Buffer.allocUnsafe(cropW * cropH * 4);
        const frameRowOffset = p * srcH;

        for (let r = 0; r < cropH; r++) {
            const srcStart = ((frameRowOffset + top + r) * srcW + left) * 4;
            const dstStart = r * cropW * 4;
            data.copy(frameRaw, dstStart, srcStart, srcStart + cropW * 4);
        }

        const framePng = await sharp(frameRaw, {
            raw: { width: cropW, height: cropH, channels: 4 },
        })
            .resize(256, 256, { fit: 'cover' })
            .png({ compressionLevel: 0 })
            .toBuffer();

        resizedFrames.push(framePng);

        // Skipped frames ka delay merge karo taaki speed normal rahe
        let frameDelay = 0;
        for (let k = p; k < Math.min(p + step, pages); k++) {
            frameDelay += meta.delay?.[k] || 100;
        }
        delays.push(frameDelay);
    }

    return sharp(resizedFrames, { join: { animated: true } })
        .webp({
            quality: 75,
            effort: 4,
            delay: delays,
            loop: meta.loop ?? 0,
        })
        .toBuffer();
}

export async function processAndSaveAvatar(buffer, userId, mimeType = '', crop = null) {
    const isGif = mimeType === 'image/gif';

    let processedBuffer;
    try {
        if (isGif) {
            try {
                processedBuffer = await processAnimatedGif(buffer, crop);
            } catch (gifErr) {
                console.error('[avatar] processAnimatedGif failed, using fallback:', gifErr);
                processedBuffer = await sharp(buffer, {
                    animated: true,
                    pages: 60,
                    limitInputPixels: 500_000_000,
                })
                    .resize(256, 256, { fit: 'cover', position: 'centre' })
                    .webp({ quality: 75, effort: 4 })
                    .toBuffer();
            }
        } else {
            processedBuffer = await sharp(buffer)
                .rotate()
                .resize(256, 256, { fit: 'cover', position: 'centre' })
                .webp({ quality: 82 })
                .toBuffer();
        }
    } catch (err) {
        console.error('[avatar] sharp processing error:', err);
        const error = new Error('Invalid or unsupported image file');
        error.status = 400;
        throw error;
    }

    const uniqueName = `${userId}-${crypto.randomBytes(6).toString('hex')}`;

    if (isCloudinaryConfigured()) {
        return uploadBufferToCloudinary(processedBuffer, uniqueName);
    }

    await ensureAvatarsDir();
    const filename = `${uniqueName}.webp`;
    const filePath = path.join(AVATARS_DIR, filename);
    await fs.writeFile(filePath, processedBuffer);

    return `/uploads/avatars/${filename}`;
}

export async function deleteLocalAvatar(avatarUrl) {
    if (!avatarUrl) return;

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

    if (!avatarUrl.startsWith('/uploads/avatars/')) return;
    const filename = path.basename(avatarUrl);
    const filePath = path.join(AVATARS_DIR, filename);
    try {
        await fs.unlink(filePath);
    } catch {
        // Ignore if already deleted
    }
}