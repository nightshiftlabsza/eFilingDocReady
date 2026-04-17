import { describe, expect, it } from 'vitest';

process.env.FRONTEND_APP_URL = 'http://localhost:3000';
process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/docready';
process.env.PAYSTACK_SECRET_KEY = 'secret';
process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

describe('resolveEntitlementState', () => {
    it('grants premium when a taxpayer pass is active', async () => {
        const { resolveEntitlementState } = await import('../entitlements');
        const result = resolveEntitlementState([
            {
                id: 'ent-1',
                user_id: 'acct-1',
                product_code: 'taxpayer_pass_onceoff',
                status: 'active',
                granted_at: new Date().toISOString(),
                source_transaction_id: 'txn-1',
            },
        ], 'taxpayer', 'user@example.com');

        expect(result.hasPremiumAccess).toBe(true);
        expect(result.activePlan?.code).toBe('taxpayer_pass_onceoff');
        expect(result.activePlan?.label).toBe('Taxpayer Pass');
        expect(result.persona).toBe('taxpayer');
    });

    it('does not grant premium when there is no active entitlement', async () => {
        const { resolveEntitlementState } = await import('../entitlements');
        const result = resolveEntitlementState([
            {
                id: 'ent-1',
                user_id: 'acct-1',
                product_code: 'taxpayer_pass_onceoff',
                status: 'revoked',
                granted_at: new Date().toISOString(),
                source_transaction_id: 'txn-1',
            },
        ], 'taxpayer', 'user@example.com');

        expect(result.hasPremiumAccess).toBe(false);
        expect(result.activePlan).toBeNull();
    });

    it('prefers the first active entitlement returned by the database', async () => {
        const { resolveEntitlementState } = await import('../entitlements');
        const result = resolveEntitlementState([
            {
                id: 'ent-2',
                user_id: 'acct-1',
                product_code: 'practitioner_pass_onceoff',
                status: 'active',
                granted_at: new Date().toISOString(),
                source_transaction_id: 'txn-2',
            },
            {
                id: 'ent-1',
                user_id: 'acct-1',
                product_code: 'taxpayer_pass_onceoff',
                status: 'active',
                granted_at: new Date(Date.now() - 86400000).toISOString(),
                source_transaction_id: 'txn-1',
            },
        ], 'practitioner', 'firm@example.com');

        expect(result.hasPremiumAccess).toBe(true);
        expect(result.activePlan?.code).toBe('practitioner_pass_onceoff');
        expect(result.activePlan?.label).toBe('Practitioner Pass');
    });
});
