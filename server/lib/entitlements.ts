import type { PoolClient } from 'pg';
import type { AccountResponse, ProductCode } from '../../src/types/account';
import { getProductConfig } from '../../src/lib/products';
import { query } from './db';

export interface EntitlementRow {
    id: string;
    user_id: string;
    product_code: ProductCode;
    status: 'active' | 'revoked';
    granted_at: string | null;
    source_transaction_id: string | null;
}

export async function getEntitlementsForAccount(accountId: string, client?: PoolClient) {
    const result = await query<EntitlementRow>(
        `select id, user_id, product_code, status, granted_at, source_transaction_id
         from entitlements
         where user_id = $1
         order by granted_at desc nulls last, created_at desc`,
        [accountId],
        client,
    );

    return result.rows;
}

export function resolveEntitlementState(
    entitlements: EntitlementRow[],
    persona: AccountResponse['persona'],
    email: string | null,
    source: AccountResponse['source'] = 'server',
): AccountResponse {
    const activeEntitlement = entitlements.find((entitlement) => entitlement.status === 'active') ?? null;
    const activePlan = activeEntitlement
        ? {
            code: activeEntitlement.product_code,
            label: getProductConfig(activeEntitlement.product_code).label,
            persona: getProductConfig(activeEntitlement.product_code).persona,
            grantedAt: activeEntitlement.granted_at,
        }
        : null;

    return {
        authenticated: email !== null,
        email,
        persona,
        activePlan,
        hasPremiumAccess: activePlan !== null,
        source,
    };
}
