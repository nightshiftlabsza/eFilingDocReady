import { PDFDocument } from '@cantoo/pdf-lib';

/**
 * Attempts to unlock an encrypted PDF.
 *
 * Strategy:
 * 1. Try `ignoreEncryption: true` — works for most PDFs where the owner password
 *    restricts editing but the user password is empty or bypassed by pdf-lib.
 * 2. If that fails, retry with the user-supplied password.
 */
export const unlockEncryptedPdf = async (
    file: File,
    password: string
): Promise<Uint8Array> => {
    const pdfBytes = await file.arrayBuffer();

    // Primary path: bypass encryption (works for most consumer PDFs)
    try {
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        return await pdfDoc.save();
    } catch {
        // ignoreEncryption failed — fall through to password attempt
    }

    // Fallback: use the actual password
    try {
        const pdfDoc = await PDFDocument.load(pdfBytes, { password });
        return await pdfDoc.save();
    } catch (err: any) {
        if (err.message?.includes('password') || err.message?.includes('encrypt')) {
            throw new Error("Invalid password or PDF could not be decrypted.");
        }
        throw err;
    }
};
