import { VercelRequest, VercelResponse } from '@vercel/node';
import { query, initDb } from '../../src/lib/server/db';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify Paystack signature
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY || '')
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    if (event.event === 'charge.success') {
        const { email } = event.data.customer;
        const customerId = event.data.customer.customer_code;
        const plan = event.data.metadata?.plan || 'Pro'; // Use metadata or default to Pro

        try {
            await initDb();
            
            // Upsert user with Pro entitlement
            await query(`
                INSERT INTO users (email, has_pro_access, customer_id, updated_at)
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (email) DO UPDATE
                SET has_pro_access = $2, customer_id = $3, updated_at = NOW()
            `, [email, true, customerId]);

            console.log(`Entitlement provisioned for ${email}`);
        } catch (err) {
            console.error('Database error in webhook:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(200).json({ status: 'success' });
}
