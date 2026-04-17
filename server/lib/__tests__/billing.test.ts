import crypto from 'crypto';
import { describe, expect, it } from 'vitest';

process.env.APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/docready';
process.env.PAYSTACK_SECRET_KEY = 'secret';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

describe('billing helpers', () => {
    it('generates unique payment references', async () => {
        const { generatePaymentReference } = await import('../billing');
        const first = generatePaymentReference();
        const second = generatePaymentReference();

        expect(first).toMatch(/^dr_\d+_[a-f0-9]{16}$/);
        expect(second).toMatch(/^dr_\d+_[a-f0-9]{16}$/);
        expect(first).not.toBe(second);
    });

    it('verifies paystack signatures from raw webhook payloads', async () => {
        const { verifyPaystackSignature } = await import('../billing');
        const secret = 'test_secret_key';
        const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'dr_123' } }));
        const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');

        expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
        expect(verifyPaystackSignature(body, 'wrong-signature', secret)).toBe(false);
    });

    it('builds deterministic webhook dedupe keys', async () => {
        const { getWebhookDedupeKey } = await import('../billing');
        expect(getWebhookDedupeKey({
            event: 'charge.success',
            data: { id: 42, reference: 'dr_ref' },
        })).toBe('paystack:charge.success:42');
    });
});
