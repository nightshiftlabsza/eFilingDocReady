/**
 * SARS High-Contrast Legibility Filter.
 * Converts to grayscale and boosts contrast/brightness to mimic physical photocopies 
 * while drastically reducing file size.
 */
const processImageCanvas = async (imageFile: File, scale: number, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(imageFile);

        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Canvas context failed"));
                return;
            }

            // SARS 300 DPI Target Dimensions (A4)
            const TARGET_WIDTH = 2480;
            const TARGET_HEIGHT = 3508;

            // Calculate base scale to fit 300 DPI A4 precisely
            const widthRatio = TARGET_WIDTH / img.width;
            const heightRatio = TARGET_HEIGHT / img.height;
            const baseScale = Math.min(widthRatio, heightRatio, 1.0); // Prevent upscaling pixelation
            const finalScale = baseScale * scale;

            // Set dimensions with scaling factor
            canvas.width = Math.round(img.width * finalScale);
            canvas.height = Math.round(img.height * finalScale);

            // SARS legibility filters
            ctx.filter = 'grayscale(100%) contrast(140%) brightness(105%)';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("toBlob failed"));
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => reject(new Error("Image load failed"));
        img.src = url;
    });
};

/**
 * 11-Pass Iterative Compression Engine.
 * Follows the legacy spec: varying scale 1.0–2.0× and JPEG quality 0.28–0.80.
 * Goal: Stay under the adaptive target MB while preserving OCR-compatible legibility.
 */
export const compressImageForSARS = async (
    file: File,
    targetMB: number = 0.8
): Promise<File> => {
    // 11 strategic passes (Scale vs Quality)
    const passes = [
        { scale: 1.0, quality: 0.80 },
        { scale: 1.2, quality: 0.75 },
        { scale: 1.4, quality: 0.70 },
        { scale: 1.6, quality: 0.65 },
        { scale: 1.8, quality: 0.60 },
        { scale: 2.0, quality: 0.55 }, // Higher scale helps legibility on receipts
        { scale: 1.8, quality: 0.50 },
        { scale: 1.6, quality: 0.45 },
        { scale: 1.4, quality: 0.40 },
        { scale: 1.2, quality: 0.35 },
        { scale: 1.0, quality: 0.28 }  // Aggressive floor
    ];

    let bestBlob: Blob | null = null;
    const targetSizeBytes = targetMB * 1024 * 1024;

    console.log(`Starting 11-Pass Engine for ${file.name}. Target: ${targetMB}MB`);

    for (let i = 0; i < passes.length; i++) {
        const pass = passes[i];
        console.log(`Engine Pass ${i + 1}/11: Scale ${pass.scale}, Quality ${pass.quality}`);

        const currentBlob = await processImageCanvas(file, pass.scale, pass.quality);
        bestBlob = currentBlob;

        if (currentBlob.size <= targetSizeBytes) {
            console.log(`Target reached in pass ${i + 1}! (${(currentBlob.size / 1024 / 1024).toFixed(2)}MB)`);
            break;
        }
    }

    const finalBlob = bestBlob || file;
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return new File([finalBlob], `${baseName}_sars_ready.jpg`, {
        type: 'image/jpeg',
    });
};
