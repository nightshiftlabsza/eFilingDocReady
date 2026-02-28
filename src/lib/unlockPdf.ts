import { PDFDocument } from 'pdf-lib';

/**
 * Attempts to unlock an encrypted PDF with the provided password.
 * Returns the unencrypted byte array that can be saved directly or used.
 */
export const unlockEncryptedPdf = async (
    file: File,
    _password: string
): Promise<Uint8Array> => {
    try {
        const pdfBytes = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        return await pdfDoc.save();
    } catch (err: any) {
        if (err.message && err.message.includes('password')) {
            throw new Error("Invalid password or PDF could not be decrypted.");
        }
        throw err;
    }
};
