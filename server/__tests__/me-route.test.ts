import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.FRONTEND_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/docready';
process.env.PAYSTACK_SECRET_KEY = 'secret';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

const mockResolveAuthenticatedAccount = vi.fn();
const mockGetProfile = vi.fn();
const mockGetEntitlementsForAccount = vi.fn();

vi.mock('../lib/requestAuth', () => ({
    resolveAuthenticatedAccount: mockResolveAuthenticatedAccount,
}));

vi.mock('../lib/account', async () => {
    const actual = await vi.importActual<typeof import('../lib/account')>('../lib/account');
    return {
        ...actual,
        getProfile: mockGetProfile,
        createAccount: vi.fn(),
        upsertProfilePersona: vi.fn(),
    };
});

vi.mock('../lib/entitlements', async () => {
    const actual = await vi.importActual<typeof import('../lib/entitlements')>('../lib/entitlements');
    return {
        ...actual,
        getEntitlementsForAccount: mockGetEntitlementsForAccount,
    };
});

describe('/api/account', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns an anonymous response when no session is present', async () => {
        mockResolveAuthenticatedAccount.mockResolvedValue(null);

        const { createApp } = await import('../app');
        const response = await request(createApp()).get('/api/account');

        expect(response.status).toBe(200);
        expect(response.body.authenticated).toBe(false);
        expect(response.body.hasPremiumAccess).toBe(false);
        expect(response.body.activePlan).toBeNull();
    });

    it('returns authenticated account entitlement state', async () => {
        mockResolveAuthenticatedAccount.mockResolvedValue({
            id: 'acct-1',
            auth_user_id: 'auth-1',
            email: 'user@example.com',
            normalized_email: 'user@example.com',
            persona: 'taxpayer',
        });
        mockGetProfile.mockResolvedValue({ persona: 'taxpayer' });
        mockGetEntitlementsForAccount.mockResolvedValue([
            {
                id: 'ent-1',
                user_id: 'acct-1',
                product_code: 'taxpayer_pass_onceoff',
                status: 'active',
                granted_at: new Date().toISOString(),
                source_transaction_id: 'txn-1',
            },
        ]);

        const { createApp } = await import('../app');
        const response = await request(createApp()).get('/api/account');

        expect(response.status).toBe(200);
        expect(response.body.authenticated).toBe(true);
        expect(response.body.email).toBe('user@example.com');
        expect(response.body.hasPremiumAccess).toBe(true);
        expect(response.body.activePlan).toMatchObject({
            code: 'taxpayer_pass_onceoff',
            label: 'Taxpayer Pass',
        });
    });
});
