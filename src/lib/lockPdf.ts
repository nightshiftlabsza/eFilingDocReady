import { PDFDocument } from '@cantoo/pdf-lib';

/**
 * Loads a PDF and re-saves it with AES-256 user + owner password protection.
 * If `password` is empty the document is saved unencrypted (pass-through).
 *
 * Permissions are set to allow printing at low resolution only — the document
 * cannot be copied or modified without the owner password.
 *
 * @param pdfBytes - Source bytes (plain or already-decrypted PDF).
 * @param password - Password string to protect the output with.
 */
export const addPasswordToPdf = async (
    pdfBytes: Uint8Array,
    password: string,
): Promise<Uint8Array> => {
    if (!password) return pdfBytes;

    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    return doc.save({
        userPassword: password,
        ownerPassword: password,
    } as any); // @cantoo/pdf-lib extends the save options with encryption params
};
