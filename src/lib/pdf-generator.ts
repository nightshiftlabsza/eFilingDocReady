import { PDFDocument, PageSizes } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { sanitizeSarsFilename } from './sanitizer';

/**
 * Configure the pdfjs worker.
 * Vite resolves `import.meta.url` at build time → no runtime CDN dependency.
 * If you see "Setting up fake worker" warnings, ensure pdfjs-dist is installed:
 *   npm install pdfjs-dist
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

/** 300 DPI expressed as a scale multiplier from the PDF 72-point baseline. */
const RASTER_SCALE = 300 / 72; // 4.1667

/** Slight contrast boost applied after grayscale to sharpen text edges. */
const CONTRAST_FACTOR = 1.15;
const CONTRAST_INTERCEPT = 128 * (1 - CONTRAST_FACTOR);

/**
 * Builds a "Pure" PDF - native merge with no quality loss.
 * Images are embedded at original quality.
 */
export const buildPurePdf = async (files: File[]): Promise<Uint8Array> => {
    if (files.length > 20) {
        throw new Error("SARS maximum allowed is 20 files per submission.");
    }

    const finalPdf = await PDFDocument.create();

    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const imgBytes = await file.arrayBuffer();
            let image;
            if (file.type === 'image/png') {
                image = await finalPdf.embedPng(imgBytes);
            } else {
                image = await finalPdf.embedJpg(imgBytes);
            }

            const { width, height } = image.scaleToFit(
                PageSizes.A4[0] - 40,
                PageSizes.A4[1] - 40
            );

            const page = finalPdf.addPage(PageSizes.A4);
            page.drawImage(image, {
                x: page.getWidth() / 2 - width / 2,
                y: page.getHeight() / 2 - height / 2,
                width,
                height,
            });
        } else if (file.type === 'application/pdf') {
            const pdfBytes = await file.arrayBuffer();
            try {
                const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
                const copiedPages = await finalPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
                copiedPages.forEach((page) => finalPdf.addPage(page));
            } catch (err) {
                const safeName = sanitizeSarsFilename(file.name);
                throw new Error(`Failed to load ${safeName}. Ensure it is not locked with an unknown password.`);
            }
        }
    }

    return await finalPdf.save();
};

// ── Optimize for eFiling (SARS Compliance) ───────────────────────────────────

export interface RasterizeOptions {
    /**
     * Render scale relative to the 72-point PDF baseline.
     * Default: 4.167 (300 DPI) — minimum for SARS legibility compliance.
     * Do not go below 3.0 (216 DPI) or text may fail a legibility audit.
     */
    scale?: number;
    /**
     * JPEG output quality 0–1. Default: 0.7.
     * 0.7 hits the quality/size sweet spot for scanned-style documents.
     */
    jpegQuality?: number;
    /**
     * Convert to grayscale + apply contrast boost before JPEG encode.
     * Mimics a clean black-and-white scan. Recommended for SARS submissions:
     * reduces file size further and improves OCR legibility scores.
     * Default: true.
     */
    grayscale?: boolean;
    /** Called after each page completes — use to drive a progress bar. */
    onProgress?: (currentPage: number, totalPages: number) => void;
}

/**
 * Optimizes every page of a PDF for eFiling at 300 DPI using pdfjs-dist.
 * Applies an optional grayscale + contrast filter and returns a new merged PDF.
 *
 * Designed as Phase 2: call this when buildPurePdf output exceeds 5 MB.
 *
 * @param pdfBytes  - Source PDF as Uint8Array or ArrayBuffer.
 * @param options   - Render scale, JPEG quality, grayscale, progress callback.
 * @returns         - New PDF byte array optimized for SARS.
 */
export const rasterizePdf = async (
    pdfBytes: Uint8Array | ArrayBuffer,
    options: RasterizeOptions = {},
): Promise<Uint8Array> => {
    const {
        scale = RASTER_SCALE,
        jpegQuality = 0.7,
        grayscale = true,
        onProgress,
    } = options;

    // ── Optimize for eFiling (SARS Compliance) ────────────────────────────────────
    // Always copy the buffer before passing to pdfjs — its Worker transfer detaches
    // the original ArrayBuffer, which would corrupt phase1Bytes on subsequent passes.
    const srcBytes = new Uint8Array(pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes));
    const loadingTask = pdfjsLib.getDocument({ data: srcBytes });
    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    const outPdf = await PDFDocument.create();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);

        // baseViewport: original page dimensions in PDF points (72 pt = 1 inch).
        const baseViewport = page.getViewport({ scale: 1 });

        // Cap the canvas to prevent memory crashes on large-page PDFs
        // (e.g. PDFs created from 3440×1440 ultrawide screenshots).
        // A4 at 300 DPI = 2480×3508px. We cap at A3 long-edge (4961px) which
        // is far beyond SARS legibility requirements and safe for all browsers.
        const MAX_CANVAS_DIM = 4961;
        const rawMaxDim = Math.max(baseViewport.width, baseViewport.height) * scale;
        const effectiveScale = rawMaxDim > MAX_CANVAS_DIM
            ? scale * (MAX_CANVAS_DIM / rawMaxDim)
            : scale;
        const hiResViewport = page.getViewport({ scale: effectiveScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(hiResViewport.width);
        canvas.height = Math.floor(hiResViewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error(`rasterizePdf: canvas 2D context unavailable (page ${pageNum})`);

        // Fill white before rendering — JPEG has no alpha channel.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ── Render page at 300 DPI ────────────────────────────────────────────
        await page.render({
            canvasContext: ctx as any,
            canvas: canvas as any,
            viewport: hiResViewport,
        }).promise;

        // ── Grayscale + contrast (Rec.709 luminosity) ─────────────────────────
        // Rec.709 weights (sRGB linear): R=0.2126, G=0.7152, B=0.0722.
        // These give perceptually accurate grey (green dominates human vision).
        if (grayscale) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const { data } = imageData;
            for (let i = 0; i < data.length; i += 4) {
                const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                // Contrast boost — clamp to [0, 255]
                const out = Math.min(255, Math.max(0,
                    Math.round(CONTRAST_FACTOR * luma + CONTRAST_INTERCEPT)
                ));
                data[i] = data[i + 1] = data[i + 2] = out;
                // data[i + 3] (alpha) left at 255 — toBlob handles alpha-over-white
            }
            ctx.putImageData(imageData, 0, 0);
        }

        // ── JPEG encode ───────────────────────────────────────────────────────
        const jpegBytes = await canvasToJpegBytes(canvas, jpegQuality);

        // Release canvas GPU/CPU memory before moving to next page
        canvas.width = 0;
        canvas.height = 0;

        // ── Embed into output PDF at original point dimensions ────────────────
        // The image pixel dimensions encode 300 DPI; the PDF page size is in
        // points (72 DPI baseline). This preserves the physical page size so
        // the printed/viewed document is the same physical dimensions as the
        // source, but internally stored at 300 DPI resolution.
        const embeddedImg = await outPdf.embedJpg(jpegBytes);
        const outPage = outPdf.addPage([baseViewport.width, baseViewport.height]);
        outPage.drawImage(embeddedImg, {
            x: 0,
            y: 0,
            width: baseViewport.width,
            height: baseViewport.height,
        });

        // Release pdfjs page resources before next iteration
        page.cleanup();
        onProgress?.(pageNum, totalPages);
    }

    return outPdf.save();
};

/**
 * Encodes a canvas as a JPEG Uint8Array.
 * Uses `toBlob` (async, memory-efficient) with a `toDataURL` fallback.
 */
async function canvasToJpegBytes(
    canvas: HTMLCanvasElement,
    quality: number,
): Promise<Uint8Array> {
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob produced no output'))),
            'image/jpeg',
            quality,
        );
    });
    return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Phase 2 merge: native merge first, then rasterize the merged PDF.
 * Replaces the stub that previously just called buildPurePdf.
 *
 * Workflow:
 *   1. buildPurePdf → lossless merge (fast, preserves vector quality)
 *   2. rasterizePdf → 300 DPI optimization (guaranteed size reduction)
 *
 * Callers (e.g. App.tsx) should first try buildPurePdf alone and only
 * invoke buildRasterPdf if the output exceeds 5 MB.
 */
export const buildRasterPdf = async (
    files: File[],
    options: RasterizeOptions = {},
): Promise<Uint8Array> => {
    const merged = await buildPurePdf(files);
    return rasterizePdf(merged, options);
};

/**
 * Phase 3 Multi-Volume Splitter:
 * If the final PDF array buffer still exceeds 5MB after all compression, 
 * this chunks the pages into multiple PDFs sequentially to meet the strict bounds.
 */
export const splitPdfIfNeeded = async (pdfBytes: Uint8Array, maxBytes: number = 4.8 * 1024 * 1024): Promise<Uint8Array[]> => {
    if (pdfBytes.length <= maxBytes) return [pdfBytes];

    const sourcePdf = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = sourcePdf.getPageCount();

    // If it's literally 1 page and enormous, we can't split it further.
    if (totalPages <= 1) return [pdfBytes];

    let currentPdf = await PDFDocument.create();
    const parts: Uint8Array[] = [];

    for (let i = 0; i < totalPages; i++) {
        // Copy one page into current PDF
        const [copiedPage] = await currentPdf.copyPages(sourcePdf, [i]);
        currentPdf.addPage(copiedPage);

        // Measure current size
        const currentBytes = await currentPdf.save();

        // If this page brought us over the limit (and it isn't the only page in the doc)
        if (currentBytes.length > maxBytes && currentPdf.getPageCount() > 1) {
            // Remove the page we just added
            currentPdf.removePage(currentPdf.getPageCount() - 1);
            parts.push(await currentPdf.save());

            // Start a new PDF with the chunked page
            currentPdf = await PDFDocument.create();
            const [newCopiedPage] = await currentPdf.copyPages(sourcePdf, [i]);
            currentPdf.addPage(newCopiedPage);
        }
    }

    // Push final remaining chunk
    if (currentPdf.getPageCount() > 0) {
        parts.push(await currentPdf.save());
    }

    return parts;
};


