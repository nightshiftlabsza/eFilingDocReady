import * as jose from 'jose';

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-at-least-32-chars-long');

/**
 * Creates a signed JWT for the magic link token.
 */
export async function createMagicToken(email: string) {
    return await new jose.SignJWT({ email, type: 'magic-link' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('15m')
        .sign(SECRET);
}

/**
 * Creates a persistent session JWT.
 */
export async function createSessionToken(email: string, hasProAccess: boolean) {
    return await new jose.SignJWT({ email, hasProAccess })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30d') // Session lasts 30 days
        .sign(SECRET);
}

/**
 * Verifies a JWT.
 */
export async function verifyToken(token: string) {
    try {
        const { payload } = await jose.jwtVerify(token, SECRET);
        return payload;
    } catch (err) {
        return null;
    }
}
