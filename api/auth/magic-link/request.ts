import { VercelRequest, VercelResponse } from '@vercel/node';
import { query, initDb } from '../../../src/lib/server/db';
import { createMagicToken } from '../../../src/lib/server/auth';
import { sendMagicLinkEmail } from '../../../src/lib/server/email';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    try {
        await initDb();
        
        // Find user by email
        const userRes = await query('SELECT * FROM users WHERE email = $1', [email]);
        
        // Respond with success even if email doesn't exist (to prevent leakage)
        if (userRes.rowCount === 0 || !userRes.rows[0].has_pro_access) {
            return res.status(200).json({ message: 'If an account exists with an active plan, a magic link has been sent.' });
        }

        const token = await createMagicToken(email);
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        // Store token in DB
        await query(
            'INSERT INTO magic_tokens (email, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'15 minutes\')',
            [email, tokenHash]
        );

        const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
        const magicLink = `${appUrl}/api/auth/magic-link/consume?token=${token}`;

        await sendMagicLinkEmail(email, magicLink);

        return res.status(200).json({ message: 'If an account exists with an active plan, a magic link has been sent.' });
    } catch (err: any) {
        console.error('Magic link request error:', err);
        return res.status(500).json({ error: 'Failed to request magic link' });
    }
}
