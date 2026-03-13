/**
 * sanitize.ts
 * SARS eFiling filename compliance.
 *
 * SARS rejects files whose names contain: ' &
 * Additional characters that break eFiling uploads: < > " / \ | ? * :
 * Reference: SARS eFiling upload error documentation.
 */

const SARS_ILLEGAL = /['"&<>\/\\|?*:]/g;
const WHITESPACE   = /\s+/g;

/**
 * Strips SARS-illegal characters from a filename (excluding extension).
 * Collapses whitespace to underscores. Falls back to "document" if empty.
 *
 * @example
 * sanitizeFilename("O'Brien's Return & IRP5.pdf")
 * // → "OBriens_Return__IRP5.pdf"
 */
export function sanitizeFilename(name: string): string {
    const lastDot = name.lastIndexOf('.');
    const hasExt  = lastDot > 0;
    const base    = hasExt ? name.slice(0, lastDot) : name;
    const ext     = hasExt ? name.slice(lastDot)    : '';

    const clean = base
        .replace(SARS_ILLEGAL, '')
        .replace(WHITESPACE, '_')
        .replace(/_+/g, '_')       // collapse consecutive underscores
        .replace(/^_|_$/g, '')     // trim leading/trailing underscores
        .trim();

    return (clean || 'document') + ext;
}

/**
 * Returns true if the filename passes SARS upload rules.
 * Use to surface a warning before processing.
 */
export function isFilenameCompliant(name: string): boolean {
    return !SARS_ILLEGAL.test(name);
}
