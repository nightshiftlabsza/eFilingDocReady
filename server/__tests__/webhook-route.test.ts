import crypto from 'crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.FRONTEND_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/docready';
process.env.PAYSTACK_SECRET_KEY = 'secret';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

const mockRecordWebhookReceipt = vi.fn();
const mockMarkWebhookProcessed = vi.fn();
const mockMarkTransactionAbandoned = vi.fn();
const mockReconcileVerifiedPayment = vi.fn();
const mockVerifyPaystackPayment = vi.fn();

vi.mock('../lib/db', async () => {
    const actual = await vi.importActual<typeof import('../lib/db')>('../lib/db');
    return {
        ...actual,
        withTransaction: async (callback: (client: Record<string, never>) => Promise<unknown>) => callback({}),
    };
});

vi.mock('../lib/billing', async () => {
    const actual = await vi.importActual<typeof import('../lib/billing')>('../lib/billing');
    return {
        ...actual,
        recordWebhookReceipt: mockRecordWebhookReceipt,
        markWebhookProcessed: mockMarkWebhookProcessed,
        markTransactionAbandoned: mockMarkTransactionAbandoned,
        reconcileVerifiedPayment: mockReconcileVerifiedPayment,
        verifyPaystackPayment: mockVerifyPaystackPayment,
    };
});

describe('/api/webhooks/paystack', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('rejects malformed payloads', async () => {
        const { createApp } = await import('../app');
        const body = JSON.stringify({ event: 'charge.success', data: {} });
        const signature = crypto.createHmac('sha512', 'secret').update(body).digest('hex');

        const response = await request(createApp())
            .post('/api/webhooks/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(body);

        expect(response.status).toBe(400);
    });

    it('processes the first webhook and ignores the duplicate replay', async () => {
        mockRecordWebhookReceipt
            .mockResolvedValueOnce({ id: 'event-1' })
            .mockResolvedValueOnce(null);
        mockVerifyPaystackPayment.mockResolvedValue({
            reference: 'dr_ref',
            amount: 4900,
            currency: 'ZAR',
            status: 'success',
            paid_at: new Date().toISOString(),
            metadata: { productCode: 'taxpayer_pass_onceoff' },
            customer: { email: 'user@example.com' },
        });

        const { createApp } = await import('../app');
        const payload = {
            event: 'charge.success',
            data: {
                id: 10,
                reference: 'dr_ref',
                status: 'success',
                customer: {
                    email: 'user@example.com',
                },
                metadata: {
                    productCode: 'taxpayer_pass_onceoff',
                },
            },
        };
        const body = JSON.stringify(payload);
        const signature = crypto.createHmac('sha512', 'secret').update(body).digest('hex');

        const first = await request(createApp())
            .post('/api/webhooks/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(body);

        const second = await request(createApp())
            .post('/api/webhooks/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(body);

        expect(first.status).toBe(200);
        expect(second.status).toBe(200);
        expect(mockVerifyPaystackPayment).toHaveBeenCalledTimes(1);
        expect(mockReconcileVerifiedPayment).toHaveBeenCalledTimes(1);
        expect(mockMarkWebhookProcessed).toHaveBeenCalledWith('paystack:charge.success:10', 'processed', expect.any(Object));
    });

    it('marks abandoned charges without granting access', async () => {
        mockRecordWebhookReceipt.mockResolvedValue({ id: 'event-2' });

        const { createApp } = await import('../app');
        const payload = {
            event: 'charge.abandoned',
            data: {
                reference: 'dr_abandoned',
            },
        };
        const body = JSON.stringify(payload);
        const signature = crypto.createHmac('sha512', 'secret').update(body).digest('hex');

        const response = await request(createApp())
            .post('/api/webhooks/paystack')
            .set('Content-Type', 'application/json')
            .set('x-paystack-signature', signature)
            .send(body);

        expect(response.status).toBe(200);
        expect(mockMarkTransactionAbandoned).toHaveBeenCalledWith('dr_abandoned', expect.any(Object));
        expect(mockReconcileVerifiedPayment).not.toHaveBeenCalled();
    });
});
