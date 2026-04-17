import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockFindAccountByAuthUserId = vi.fn();
const mockFindAccountByNormalizedEmail = vi.fn();
const mockLinkAccountToAuthUser = vi.fn();
const mockCreateAccount = vi.fn();

vi.mock('../supabase', () => ({
    supabaseAdmin: {
        auth: {
            getUser: mockGetUser,
        },
    },
}));

vi.mock('../account', () => ({
    createAccount: mockCreateAccount,
    findAccountByAuthUserId: mockFindAccountByAuthUserId,
    findAccountByNormalizedEmail: mockFindAccountByNormalizedEmail,
    linkAccountToAuthUser: mockLinkAccountToAuthUser,
    normalizeEmail: (email: string) => email.trim().toLowerCase(),
}));

vi.mock('../db', () => ({
    withTransaction: async (callback: (client: Record<string, never>) => Promise<unknown>) => callback({}),
}));

describe('resolveAuthenticatedAccount', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when there is no bearer token', async () => {
        const { resolveAuthenticatedAccount } = await import('../requestAuth');
        const result = await resolveAuthenticatedAccount({ headers: {} } as never);
        expect(result).toBeNull();
    });

    it('links an existing email-only account to the auth user', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'auth-1', email: 'User@Example.com' } },
            error: null,
        });
        mockFindAccountByAuthUserId.mockResolvedValue(null);
        mockFindAccountByNormalizedEmail.mockResolvedValue({
            id: 'acct-1',
            auth_user_id: null,
            email: 'User@Example.com',
            normalized_email: 'user@example.com',
            paystack_customer_code: null,
        });
        mockLinkAccountToAuthUser.mockResolvedValue({
            id: 'acct-1',
            auth_user_id: 'auth-1',
            email: 'User@Example.com',
            normalized_email: 'user@example.com',
            paystack_customer_code: null,
        });

        const { resolveAuthenticatedAccount } = await import('../requestAuth');
        const result = await resolveAuthenticatedAccount({
            headers: { authorization: 'Bearer token-123' },
        } as never);

        expect(mockLinkAccountToAuthUser).toHaveBeenCalledWith('acct-1', 'auth-1', expect.any(Object));
        expect(result?.auth_user_id).toBe('auth-1');
    });
});
