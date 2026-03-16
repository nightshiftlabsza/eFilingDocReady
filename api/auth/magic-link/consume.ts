import { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../../../src/lib/server/db';
import { verifyToken, createSessionToken } from '../../../src/lib/server/auth';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
    }

    try {
        const payload = await verifyToken(token);

        if (!payload || payload.type !== 'magic-link') {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const email = payload.email as string;
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Check if token exists and is not used
        const tokenRes = await query(
            'SELECT * FROM magic_tokens WHERE email = $1 AND token_hash = $2 AND used_at IS NULL AND expires_at > NOW()',
            [email, tokenHash]
        );

        if (tokenRes.rowCount === 0) {
            return res.status(400).json({ error: 'Token already used or expired' });
        }

        // Mark token as used
        await query('UPDATE magic_tokens SET used_at = NOW() WHERE id = $1', [tokenRes.rows[0].id]);

        // Find user and confirm Pro access
        const userRes = await query('SELECT has_pro_access FROM users WHERE email = $1', [email]);
        const hasProAccess = userRes.rowCount > 0 && userRes.rows[0].has_pro_access;

        if (!hasProAccess) {
             return res.status(403).json({ error: 'No active plan found for this email' });
        }

        // Create session token
        const sessToken = await createSessionToken(email, true);

        // Set secure HTTP-only cookie
        res.setHeader('Set-Cookie', [
            `sess=${sessToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
        ]);

        // Redirect to main app
        const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
        return res.redirect(302, `${appUrl}/`);
    } catch (err: any) {
        console.error('Magic link consumption error:', err);
        return res.status(500).json({ error: 'Failed to verify magic link' });
    }
}
