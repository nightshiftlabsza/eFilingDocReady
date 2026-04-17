import crypto from 'crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.FRONTEND_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/docready';
process.env.PAYSTACK_SECRET_KEY = 'secret';
process.env.APP_ENV = 'production';
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
            reference: 'DR_production_1776412800000_a1b2c3d4e5f60718',
            amount: 4900,
            currency: 'ZAR',
            status: 'success',
            paid_at: new Date().toISOString(),
            metadata: {
                product_slug: 'docready',
                plan_code: 'taxpayer_pass_onceoff',
                internal_tx_id: 'txn-1',
                customer_email: 'user@example.com',
                environment: 'production',
            },
            customer: { email: 'user@example.com' },
        });

        const { createApp } = await import('../app');
        const payload = {
            event: 'charge.success',
            data: {
                id: 10,
                reference: 'DR_production_1776412800000_a1b2c3d4e5f60718',
                status: 'success',
                customer: {
                    email: 'user@example.com',
                },
                metadata: {
                    product_slug: 'docready',
                    plan_code: 'taxpayer_pass_onceoff',
                    internal_tx_id: 'txn-1',
                    customer_email: 'user@example.com',
                    environment: 'production',
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

    it('ignores shared-account references for other products', async () => {
        const { createApp } = await import('../app');
        const payload = {
            event: 'charge.success',
            data: {
                id: 11,
                reference: 'LL_production_1776412800001_fedcba9876543210',
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
        expect(response.body).toEqual({ ok: true, ignored: true });
        expect(mockRecordWebhookReceipt).not.toHaveBeenCalled();
        expect(mockVerifyPaystackPayment).not.toHaveBeenCalled();
    });

    it('marks abandoned charges without granting access', async () => {
        mockRecordWebhookReceipt.mockResolvedValue({ id: 'event-2' });

        const { createApp } = await import('../app');
        const payload = {
            event: 'charge.abandoned',
            data: {
                reference: 'DR_production_1776412800002_0011223344556677',
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
        expect(mockMarkTransactionAbandoned).toHaveBeenCalledWith('DR_production_1776412800002_0011223344556677', expect.any(Object));
        expect(mockReconcileVerifiedPayment).not.toHaveBeenCalled();
    });
});
