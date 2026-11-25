'use client';

import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';

function createImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener('load', () => resolve(img));
        img.addEventListener('error', (err) => reject(err));
        img.setAttribute('crossOrigin', 'anonymous');
        img.src = url;
    });
}

async function getCroppedImageFile(imageSrc, pixelCrop, fileName = 'avatar.jpg') {
    const image = await createImage(imageSrc);
    const outputSize = 512;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        outputSize,
        outputSize
    );

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Failed to crop image'))),
            'image/jpeg',
            0.92
        );
    });

    return new File([blob], fileName, { type: 'image/jpeg' });
}



export default function AvatarCropModal({ imageSrc, originalFile = null, onCancel, onConfirm, busy = false, }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_croppedArea, areaPixels) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && !busy && !processing) {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [busy, processing, onCancel]);

    const handleApply = async () => {
        if (!croppedAreaPixels || busy || processing) return;
        setProcessing(true);
        try {
            if (originalFile?.type === 'image/gif') {
                // GIF ko canvas se mat guzaro — original file + crop box server ko bhejo
                await onConfirm(originalFile, croppedAreaPixels);
            } else {
                const croppedFile = await getCroppedImageFile(imageSrc, croppedAreaPixels);
                await onConfirm(croppedFile, null);
            }
        } finally {
            setProcessing(false);
        }
    };

    const isDisabled = busy || processing;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Crop profile photo"
        >
            <div className="w-full max-w-md bg-bg-card border border-border rounded-xl overflow-hidden shadow-card">
                <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                    <h2 className="text-card-title text-text-primary">Crop profile photo</h2>
                    <button
                        type="button"
                        disabled={isDisabled}
                        onClick={onCancel}
                        className="text-text-muted hover:text-text-primary text-sm disabled:opacity-50"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative w-full h-80 bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                    />
                </div>

                {/* Zoom Slider + Actions */}
                <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-text-secondary shrink-0">Zoom</span>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            disabled={isDisabled}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 accent-navy cursor-pointer"
                            aria-label="Zoom"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            disabled={isDisabled}
                            onClick={onCancel}
                            className="px-4 py-2 text-small font-medium border border-border text-text-secondary hover:text-text-primary hover:bg-bg-section rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isDisabled}
                            onClick={handleApply}
                            className="px-4 py-2 text-small font-medium bg-navy text-white hover:bg-navy-hover rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isDisabled ? 'Uploading...' : 'Crop & upload'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}