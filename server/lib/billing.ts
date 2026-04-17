import crypto from 'crypto';
import type { PoolClient } from 'pg';
import type { ProductCode } from '../../src/types/account';
import { getProductConfig, isProductCode } from '../../src/lib/products';
import { query } from './db';
import { env } from './env';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';
export const DOCREADY_PRODUCT_SLUG = 'docready';
export const DOCREADY_REFERENCE_PREFIX = 'DR_';
export const LEKKERLEDGER_REFERENCE_PREFIX = 'LL_';

export interface PaymentTransactionRow {
    id: string;
    user_id: string;
    email: string;
    normalized_email: string;
    paystack_reference: string;
    plan_code: ProductCode;
    amount_minor: number;
    currency: 'ZAR';
    status: PaymentStatus;
    paystack_access_code: string | null;
    paystack_authorization_url: string | null;
    provider_payload: Record<string, unknown> | null;
    verified_at: string | null;
}

export interface PaystackMetadata {
    product_slug?: string;
    plan_code?: ProductCode;
    internal_tx_id?: string;
    customer_email?: string;
    environment?: string;
    [key: string]: unknown;
}

export interface PaystackWebhookEvent {
    event: string;
    data: {
        id?: number | string;
        reference?: string;
        amount?: number;
        currency?: string;
        status?: string;
        paid_at?: string;
        metadata?: PaystackMetadata;
        customer?: {
            email?: string;
        };
    };
}

interface PaystackInitializeResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}

interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data: {
        id?: number;
        reference: string;
        amount: number;
        currency: string;
        status: string;
        paid_at?: string;
        metadata?: PaystackMetadata;
        customer?: {
            email?: string;
        };
    };
}

function normalizeCustomerEmail(email: string) {
    return email.trim().toLowerCase();
}

function normalizePaystackEnvironment(value: string) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return normalized || 'development';
}

function getDocReadyEnvironment() {
    return normalizePaystackEnvironment(env.appEnv);
}

export function isDocReadyReference(reference: string) {
    return reference.startsWith(DOCREADY_REFERENCE_PREFIX);
}

export function isLekkerLedgerReference(reference: string) {
    return reference.startsWith(LEKKERLEDGER_REFERENCE_PREFIX);
}

export function shouldIgnorePaystackReference(reference: string | null | undefined) {
    if (typeof reference !== 'string') return true;
    return !isDocReadyReference(reference);
}

export function generatePaymentReference() {
    return `${DOCREADY_REFERENCE_PREFIX}${getDocReadyEnvironment()}_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function verifyPaystackSignature(rawBody: Buffer, signature: string | undefined, secretKey: string) {
    if (!signature) return false;

    const hash = crypto.createHmac('sha512', secretKey)
        .update(rawBody)
        .digest('hex');

    return hash === signature;
}

export function getWebhookDedupeKey(event: PaystackWebhookEvent) {
    const eventId = event.data.id ?? event.data.reference ?? crypto.createHash('sha256').update(JSON.stringify(event)).digest('hex');
    return `paystack:${event.event}:${eventId}`;
}

export function getPayloadHash(rawBody: Buffer) {
    return crypto.createHash('sha256').update(rawBody).digest('hex');
}

async function callPaystack<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`https://api.paystack.co${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${env.paystackSecretKey}`,
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
        },
    });

    const payload = await response.json() as T & { message?: string };
    if (!response.ok) {
        throw new Error((payload as { message?: string }).message || 'Paystack request failed');
    }

    return payload;
}

export async function initializePaystackPayment(input: {
    transactionId: string;
    email: string;
    normalizedEmail: string;
    amountMinor: number;
    reference: string;
    productCode: ProductCode;
}) {
    const payload = await callPaystack<PaystackInitializeResponse>('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
            email: input.email,
            amount: input.amountMinor,
            reference: input.reference,
            currency: 'ZAR',
            callback_url: env.paystackCallbackUrl,
            metadata: {
                product_slug: DOCREADY_PRODUCT_SLUG,
                plan_code: input.productCode,
                internal_tx_id: input.transactionId,
                customer_email: input.normalizedEmail,
                environment: getDocReadyEnvironment(),
            },
        }),
    });

    if (!payload.status) {
        throw new Error(payload.message || 'Unable to initialize payment');
    }

    return payload.data;
}

export async function verifyPaystackPayment(reference: string) {
    const payload = await callPaystack<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (!payload.status) {
        throw new Error(payload.message || 'Unable to verify payment');
    }
    return payload.data;
}

export async function createPendingTransaction(input: {
    userId: string;
    email: string;
    normalizedEmail: string;
    productCode: ProductCode;
}, client?: PoolClient) {
    const product = getProductConfig(input.productCode);
    const reference = generatePaymentReference();

    const result = await query<PaymentTransactionRow>(
        `insert into transactions (
            user_id,
            email,
            normalized_email,
            paystack_reference,
            plan_code,
            amount_minor,
            currency,
            status
         ) values (
            $1, $2, $3, $4, $5, $6, $7, 'pending'
         )
         returning id, user_id, email, normalized_email, paystack_reference, plan_code, amount_minor, currency, status,
                   paystack_access_code, paystack_authorization_url, provider_payload, verified_at`,
        [
            input.userId,
            input.email,
            input.normalizedEmail,
            reference,
            input.productCode,
            product.amountMinor,
            product.currency,
        ],
        client,
    );

    return result.rows[0];
}

export async function attachPaymentInitialization(input: {
    reference: string;
    accessCode: string;
    authorizationUrl: string;
}, client: PoolClient) {
    const result = await query<PaymentTransactionRow>(
        `update transactions
         set paystack_access_code = $2,
             paystack_authorization_url = $3,
             updated_at = now()
         where paystack_reference = $1
         returning id, user_id, email, normalized_email, paystack_reference, plan_code, amount_minor, currency, status,
                   paystack_access_code, paystack_authorization_url, provider_payload, verified_at`,
        [input.reference, input.accessCode, input.authorizationUrl],
        client,
    );

    return result.rows[0] ?? null;
}

export async function findTransactionByReference(reference: string, client?: PoolClient) {
    const result = await query<PaymentTransactionRow>(
        `select id, user_id, email, normalized_email, paystack_reference, plan_code, amount_minor, currency, status,
                paystack_access_code, paystack_authorization_url, provider_payload, verified_at
         from transactions
         where paystack_reference = $1`,
        [reference],
        client,
    );

    return result.rows[0] ?? null;
}

export async function recordWebhookReceipt(input: {
    eventKey: string;
    eventType: string;
    reference: string | null;
    payload: PaystackWebhookEvent;
    signatureValid: boolean;
    payloadHash: string;
}, client: PoolClient) {
    const result = await query<{ id: string }>(
        `insert into webhook_events (
            provider,
            event_type,
            event_key,
            reference,
            payload_hash,
            payload,
            signature_valid,
            status
         ) values (
            'paystack', $1, $2, $3, $4, $5::jsonb, $6, 'received'
         )
         on conflict (event_key) do nothing
         returning id`,
        [
            input.eventType,
            input.eventKey,
            input.reference,
            input.payloadHash,
            JSON.stringify(input.payload),
            input.signatureValid,
        ],
        client,
    );

    return result.rows[0] ?? null;
}

export async function markWebhookProcessed(eventKey: string, status: 'processed' | 'ignored' | 'rejected', client: PoolClient) {
    await query(
        `update webhook_events
         set status = $2,
             processed_at = now(),
             updated_at = now()
         where event_key = $1`,
        [eventKey, status],
        client,
    );
}

export async function markTransactionAbandoned(reference: string, client?: PoolClient) {
    await query(
        `update transactions
         set status = 'abandoned',
             updated_at = now()
         where paystack_reference = $1
           and status in ('pending', 'failed')`,
        [reference],
        client,
    );
}

export async function markTransactionFailed(reference: string, payload: Record<string, unknown>, client: PoolClient) {
    await query(
        `update transactions
         set status = 'failed',
             provider_payload = $2::jsonb,
             updated_at = now()
         where paystack_reference = $1`,
        [reference, JSON.stringify(payload)],
        client,
    );
}

export async function finalizeSuccessfulTransaction(input: {
    reference: string;
    payload: Record<string, unknown>;
    paidAt: string | null;
}, client: PoolClient) {
    const result = await query<PaymentTransactionRow>(
        `update transactions
         set status = 'success',
             provider_payload = $2::jsonb,
             verified_at = coalesce($3::timestamptz, now()),
             updated_at = now()
         where paystack_reference = $1
         returning id, user_id, email, normalized_email, paystack_reference, plan_code, amount_minor, currency, status,
                   paystack_access_code, paystack_authorization_url, provider_payload, verified_at`,
        [input.reference, JSON.stringify(input.payload), input.paidAt],
        client,
    );

    return result.rows[0] ?? null;
}

export async function grantEntitlementForTransaction(transaction: PaymentTransactionRow, client: PoolClient) {
    await query(
        `insert into entitlements (
            user_id,
            email,
            product_code,
            status,
            granted_at,
            source_transaction_id
         ) values (
            $1, $2, $3, 'active', coalesce($4::timestamptz, now()), $5
         )
         on conflict (source_transaction_id) do nothing`,
        [
            transaction.user_id,
            transaction.email,
            transaction.plan_code,
            transaction.verified_at,
            transaction.id,
        ],
        client,
    );

    await query(
        `update entitlements
         set status = 'active',
             granted_at = coalesce(granted_at, $3::timestamptz, now()),
             source_transaction_id = coalesce(source_transaction_id, $4),
             updated_at = now()
         where user_id = $1
           and product_code = $2`,
        [transaction.user_id, transaction.plan_code, transaction.verified_at, transaction.id],
        client,
    );
}

function validateVerificationReference(reference: string, errorMessage: string) {
    if (!isDocReadyReference(reference)) {
        throw new Error(errorMessage);
    }
}

function validateSuccessfulVerification(transaction: PaymentTransactionRow, verification: PaystackVerifyResponse['data']) {
    validateVerificationReference(transaction.paystack_reference, 'Stored transaction reference is not a DocReady reference');
    validateVerificationReference(verification.reference, 'Verified reference is not a DocReady reference');

    if (verification.status !== 'success') {
        throw new Error('Verified payment status is not successful');
    }

    if (verification.metadata?.product_slug !== DOCREADY_PRODUCT_SLUG) {
        throw new Error('Verified product slug does not match DocReady');
    }

    const verifiedPlanCode = verification.metadata?.plan_code;
    if (!verifiedPlanCode || !isProductCode(verifiedPlanCode)) {
        throw new Error('Verified plan code is not allowed for DocReady');
    }

    if (verifiedPlanCode !== transaction.plan_code) {
        throw new Error('Verified plan code does not match pending transaction');
    }

    if (verification.metadata?.internal_tx_id !== transaction.id) {
        throw new Error('Verified transaction id does not match pending transaction');
    }

    const verifiedCustomerEmail = typeof verification.metadata?.customer_email === 'string'
        ? normalizeCustomerEmail(verification.metadata.customer_email)
        : null;
    if (!verifiedCustomerEmail || verifiedCustomerEmail !== transaction.normalized_email) {
        throw new Error('Verified customer email does not match pending transaction');
    }

    const verifiedEnvironment = typeof verification.metadata?.environment === 'string'
        ? normalizePaystackEnvironment(verification.metadata.environment)
        : null;
    if (!verifiedEnvironment || verifiedEnvironment !== getDocReadyEnvironment()) {
        throw new Error('Verified environment does not match DocReady environment');
    }

    if (verification.reference !== transaction.paystack_reference) {
        throw new Error('Verified reference does not match pending transaction');
    }

    if (verification.amount !== transaction.amount_minor) {
        throw new Error('Verified amount does not match pending transaction');
    }

    if ((verification.currency || 'ZAR').toUpperCase() !== transaction.currency) {
        throw new Error('Verified currency does not match pending transaction');
    }
}

export async function reconcileVerifiedPayment(input: {
    reference: string;
    verification: PaystackVerifyResponse['data'];
}, client: PoolClient) {
    validateVerificationReference(input.reference, 'Payment reference is not a DocReady reference');

    const transaction = await findTransactionByReference(input.reference, client);
    if (!transaction) {
        throw new Error('UNKNOWN_REFERENCE');
    }

    validateVerificationReference(transaction.paystack_reference, 'Stored transaction reference is not a DocReady reference');

    if (input.verification.reference !== input.reference) {
        throw new Error('Verified reference does not match requested reference');
    }

    validateVerificationReference(input.verification.reference, 'Verified reference is not a DocReady reference');

    if (transaction.status === 'success') {
        return transaction;
    }

    if (input.verification.status === 'abandoned') {
        await markTransactionAbandoned(input.reference, client);
        return findTransactionByReference(input.reference, client);
    }

    if (input.verification.status !== 'success') {
        await markTransactionFailed(input.reference, input.verification as unknown as Record<string, unknown>, client);
        return findTransactionByReference(input.reference, client);
    }

    validateSuccessfulVerification(transaction, input.verification);

    const updatedTransaction = await finalizeSuccessfulTransaction({
        reference: input.reference,
        payload: input.verification as unknown as Record<string, unknown>,
        paidAt: input.verification.paid_at ?? null,
    }, client);

    if (!updatedTransaction) {
        throw new Error('TRANSACTION_UPDATE_FAILED');
    }

    await grantEntitlementForTransaction(updatedTransaction, client);
    return updatedTransaction;
}
