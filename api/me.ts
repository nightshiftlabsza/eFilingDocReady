import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../src/lib/server/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = req.cookies.sess;

    if (!token) {
        return res.status(200).json({ hasProAccess: false });
    }

    const payload = await verifyToken(token);

    if (!payload) {
        return res.status(200).json({ hasProAccess: false });
    }

    return res.status(200).json({
        email: payload.email,
        hasProAccess: payload.hasProAccess || false
    });
}
