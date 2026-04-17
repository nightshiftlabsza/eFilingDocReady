import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.FRONTEND_APP_URL = 'http://localhost:3000';
process.env.PAYSTACK_CALLBACK_URL = 'http://localhost:3000/payment/callback';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/docready';
process.env.PAYSTACK_SECRET_KEY = 'secret';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

const mockResolveAuthenticatedAccount = vi.fn();
const mockCreateAccount = vi.fn();
const mockUpsertProfilePersona = vi.fn();
const mockCreatePendingTransaction = vi.fn();
const mockInitializePaystackPayment = vi.fn();
const mockAttachPaymentInitialization = vi.fn();
const mockVerifyPaystackPayment = vi.fn();
const mockReconcileVerifiedPayment = vi.fn();
const mockFindTransactionByReference = vi.fn();
const mockGetProfile = vi.fn();
const mockGetEntitlementsForAccount = vi.fn();

vi.mock('../lib/requestAuth', () => ({
    resolveAuthenticatedAccount: mockResolveAuthenticatedAccount,
}));

vi.mock('../lib/account', async () => {
    const actual = await vi.importActual<typeof import('../lib/account')>('../lib/account');
    return {
        ...actual,
        createAccount: mockCreateAccount,
        upsertProfilePersona: mockUpsertProfilePersona,
        getProfile: mockGetProfile,
    };
});

vi.mock('../lib/db', async () => {
    const actual = await vi.importActual<typeof import('../lib/db')>('../lib/db');
    return {
        ...actual,
        withTransaction: async (callback: (client: Record<string, never>) => Promise<unknown>) => callback({}),
    };
});

vi.mock('../lib/entitlements', async () => {
    const actual = await vi.importActual<typeof import('../lib/entitlements')>('../lib/entitlements');
    return {
        ...actual,
        getEntitlementsForAccount: mockGetEntitlementsForAccount,
    };
});

vi.mock('../lib/billing', async () => {
    const actual = await vi.importActual<typeof import('../lib/billing')>('../lib/billing');
    return {
        ...actual,
        createPendingTransaction: mockCreatePendingTransaction,
        initializePaystackPayment: mockInitializePaystackPayment,
        attachPaymentInitialization: mockAttachPaymentInitialization,
        verifyPaystackPayment: mockVerifyPaystackPayment,
        reconcileVerifiedPayment: mockReconcileVerifiedPayment,
        findTransactionByReference: mockFindTransactionByReference,
    };
});

describe('payment routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes a pending payment and returns the Paystack authorization URL', async () => {
        mockResolveAuthenticatedAccount.mockResolvedValue(null);
        mockCreateAccount.mockResolvedValue({
            id: 'user-1',
            auth_user_id: null,
            email: 'buyer@example.com',
            normalized_email: 'buyer@example.com',
            persona: 'taxpayer',
        });
        mockCreatePendingTransaction.mockResolvedValue({
            id: 'txn-1',
            user_id: 'user-1',
            email: 'buyer@example.com',
            normalized_email: 'buyer@example.com',
            paystack_reference: 'dr_ref_1',
            plan_code: 'taxpayer_pass_onceoff',
            amount_minor: 4900,
            currency: 'ZAR',
            status: 'pending',
        });
        mockInitializePaystackPayment.mockResolvedValue({
            authorization_url: 'https://checkout.paystack.com/abc',
            access_code: 'access_123',
            reference: 'dr_ref_1',
        });
        mockAttachPaymentInitialization.mockResolvedValue({});

        const { createApp } = await import('../app');
        const response = await request(createApp())
            .post('/api/payments/initiate')
            .send({
                productCode: 'taxpayer_pass_onceoff',
                email: 'buyer@example.com',
                personaHint: 'taxpayer',
            });

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
            reference: 'dr_ref_1',
            authorizationUrl: 'https://checkout.paystack.com/abc',
            accessCode: 'access_123',
            amountMinor: 4900,
            currency: 'ZAR',
            productCode: 'taxpayer_pass_onceoff',
            email: 'buyer@example.com',
        });
        expect(mockCreatePendingTransaction).toHaveBeenCalledTimes(1);
        expect(mockInitializePaystackPayment).toHaveBeenCalledTimes(1);
    });

    it('verifies a payment server-side before reporting premium access', async () => {
        mockVerifyPaystackPayment.mockResolvedValue({
            reference: 'dr_ref_2',
            amount: 39900,
            currency: 'ZAR',
            status: 'success',
            paid_at: new Date().toISOString(),
            metadata: { productCode: 'practitioner_pass_onceoff' },
            customer: { email: 'firm@example.com' },
        });
        mockReconcileVerifiedPayment.mockResolvedValue({});
        mockFindTransactionByReference.mockResolvedValue({
            id: 'txn-2',
            user_id: 'user-2',
            email: 'firm@example.com',
            normalized_email: 'firm@example.com',
            paystack_reference: 'dr_ref_2',
            plan_code: 'practitioner_pass_onceoff',
            amount_minor: 39900,
            currency: 'ZAR',
            status: 'success',
            paystack_access_code: null,
            paystack_authorization_url: null,
            provider_payload: null,
            verified_at: new Date().toISOString(),
        });
        mockGetProfile.mockResolvedValue({ persona: 'practitioner' });
        mockGetEntitlementsForAccount.mockResolvedValue([
            {
                id: 'ent-2',
                user_id: 'user-2',
                product_code: 'practitioner_pass_onceoff',
                status: 'active',
                granted_at: new Date().toISOString(),
                source_transaction_id: 'txn-2',
            },
        ]);

        const { createApp } = await import('../app');
        const response = await request(createApp())
            .post('/api/payments/verify')
            .send({ reference: 'dr_ref_2' });

        expect(response.status).toBe(200);
        expect(mockVerifyPaystackPayment).toHaveBeenCalledWith('dr_ref_2');
        expect(mockReconcileVerifiedPayment).toHaveBeenCalledTimes(1);
        expect(response.body).toMatchObject({
            reference: 'dr_ref_2',
            transactionStatus: 'success',
            hasPremiumAccess: true,
            entitlementReady: true,
            activePlan: {
                code: 'practitioner_pass_onceoff',
                label: 'Practitioner Pass',
            },
        });
    });
});
