/**
 * Sanitizes a filename to be "SARS-Safe".
 *
 * SARS eFiling restricts special characters: * # @ ! & > ' "
 * And sometimes spaces cause issues or timeouts.
 *
 * This utility:
 * 1. Replaces '&' with 'and'
 * 2. Replaces ' (apostrophe) with nothing
 * 3. Replaces other restricted characters with underscores
 * 4. Trims the filename to a reasonable length (optional but good practice)
 * 5. Ensures the extension is preserved
 */
export const sanitizeSarsFilename = (filename: string): string => {
    // Separate name and extension
    const lastDotIndex = filename.lastIndexOf('.');
    let name = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
    // 1. Remove specific chars that break backend systems entirely
    name = name.replace(/['&]/g, '_');

    // 2. Replace other restricted or risky characters with underscores
    // Restricted: * # @ ! > " [ ] { } ( ) | \ / ? : ; ,
    // We'll use a regex to keep only alphanumeric, spaces, dashes, and underscores
    name = name.replace(/[^a-zA-Z0-9\s-_]/g, '_');

    // 3. Compact multiple spaces or underscores
    name = name.replace(/\s+/g, ' ');
    name = name.replace(/[_-]+/g, '_');

    // 4. Trim whitespaces and underscores at ends
    name = name.trim().replace(/^_+|_+$/g, '');

    // 5. Shorten to 64 chars if extremely long (SARS can be picky about path lengths)
    if (name.length > 64) {
        name = name.substring(0, 64).trim();
    }

    // 6. Rejoin with extension
    return `${name}${extension}`;
};

/**
 * Validates if the filename is likely to be rejected by SARS.
 * Returns true if the name contains ANY character that is not alphanumeric, space, dot, dash, or underscore.
 */
export const isFilenameRisky = (filename: string): boolean => {
    // If it has restricted chars or multiple extensions/dots, it's risky
    const riskyPattern = /[^a-zA-Z0-9.\s-_]/;
    return riskyPattern.test(filename) || (filename.match(/\./g) || []).length > 1;
};
