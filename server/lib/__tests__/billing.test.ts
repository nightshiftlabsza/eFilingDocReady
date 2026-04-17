import crypto from 'crypto';
import { describe, expect, it } from 'vitest';

process.env.FRONTEND_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/docready';
process.env.PAYSTACK_SECRET_KEY = 'secret';
process.env.APP_ENV = 'production';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

describe('billing helpers', () => {
    it('generates unique payment references', async () => {
        const { generatePaymentReference } = await import('../billing');
        const first = generatePaymentReference();
        const second = generatePaymentReference();

        expect(first).toMatch(/^DR_production_\d+_[a-f0-9]{16}$/);
        expect(second).toMatch(/^DR_production_\d+_[a-f0-9]{16}$/);
        expect(first).not.toBe(second);
    });

    it('verifies paystack signatures from raw webhook payloads', async () => {
        const { verifyPaystackSignature } = await import('../billing');
        const secret = 'test_secret_key';
        const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'DR_production_123_abcdef0123456789' } }));
        const signature = crypto.createHmac('sha512', secret).update(body).digest('hex');

        expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
        expect(verifyPaystackSignature(body, 'wrong-signature', secret)).toBe(false);
    });

    it('builds deterministic webhook dedupe keys', async () => {
        const { getWebhookDedupeKey } = await import('../billing');
        expect(getWebhookDedupeKey({
            event: 'charge.success',
            data: { id: 42, reference: 'DR_production_1776412800000_a1b2c3d4e5f60718' },
        })).toBe('paystack:charge.success:42');
    });

    it('ignores references that do not belong to DocReady', async () => {
        const { isDocReadyReference, shouldIgnorePaystackReference } = await import('../billing');

        expect(isDocReadyReference('DR_production_1776412800000_a1b2c3d4e5f60718')).toBe(true);
        expect(shouldIgnorePaystackReference('LL_production_1776412800000_a1b2c3d4e5f60718')).toBe(true);
        expect(shouldIgnorePaystackReference('DR_production_1776412800000_a1b2c3d4e5f60718')).toBe(false);
    });
});
