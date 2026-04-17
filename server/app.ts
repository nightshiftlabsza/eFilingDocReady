import express, { type Request, type Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import type { ViteDevServer } from 'vite';
import { isProductCode } from '../src/lib/products';
import type { AccountResponse, PaymentInitResponse, PaymentStatusResponse, Persona } from '../src/types/account';
import { createAccount, getProfile, normalizeEmail, upsertProfilePersona } from './lib/account';
import {
    attachPaymentInitialization,
    createPendingTransaction,
    findTransactionByReference,
    getPayloadHash,
    getWebhookDedupeKey,
    initializePaystackPayment,
    isDocReadyReference,
    markTransactionAbandoned,
    markWebhookProcessed,
    recordWebhookReceipt,
    reconcileVerifiedPayment,
    shouldIgnorePaystackReference,
    verifyPaystackPayment,
    verifyPaystackSignature,
    type PaystackWebhookEvent,
} from './lib/billing';
import { withTransaction } from './lib/db';
import { resolveEntitlementState, getEntitlementsForAccount } from './lib/entitlements';
import { env } from './lib/env';
import { resolveAuthenticatedAccount } from './lib/requestAuth';
import { supabaseAdmin } from './lib/supabase';

function jsonError(res: Response, status: number, error: string) {
    return res.status(status).json({ error });
}

function parsePersona(value: unknown): Persona | null {
    if (value === 'taxpayer' || value === 'practitioner') return value;
    return null;
}

export async function buildAccountResponse(req: Request): Promise<AccountResponse> {
    const account = await resolveAuthenticatedAccount(req);

    if (!account) {
        return {
            authenticated: false,
            email: null,
            persona: null,
            activePlan: null,
            hasPremiumAccess: false,
            source: 'server',
        };
    }

    const [profile, entitlements] = await Promise.all([
        getProfile(account.id),
        getEntitlementsForAccount(account.id),
    ]);

    return resolveEntitlementState(entitlements, profile.persona, account.email, 'server');
}

function applyCors(app: express.Express) {
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (origin && origin === env.frontendAppUrl) {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Vary', 'Origin');
            res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
            res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        }

        if (req.method === 'OPTIONS') {
            return res.sendStatus(204);
        }

        return next();
    });
}

export function createApp(options: { vite?: ViteDevServer } = {}) {
    const app = express();

    app.disable('x-powered-by');
    applyCors(app);

    app.post('/api/webhooks/paystack', express.raw({ type: 'application/json' }));
    app.use('/api', express.json({ limit: '128kb' }));

    app.get('/api/health', (_req, res) => {
        res.status(200).json({ ok: true, service: 'docready-api' });
    });

    app.get('/api/account', async (req, res) => {
        try {
            const account = await buildAccountResponse(req);
            res.json(account);
        } catch {
            res.status(500).json({ error: 'Failed to load account state' });
        }
    });

    app.post('/api/auth/request-link', async (req, res) => {
        try {
            const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
            if (!email || !email.includes('@')) {
                return jsonError(res, 400, 'A valid email is required');
            }

            const { error } = await supabaseAdmin.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${env.frontendAppUrl}/auth/callback`,
                },
            });

            if (error) {
                return jsonError(res, 400, error.message);
            }

            return res.status(202).json({ ok: true });
        } catch {
            return jsonError(res, 500, 'Unable to send sign-in link');
        }
    });

    app.post('/api/payments/initiate', async (req, res) => {
        try {
            const { productCode, email, personaHint } = req.body ?? {};
            if (typeof productCode !== 'string' || !isProductCode(productCode)) {
                return jsonError(res, 400, 'Invalid product code');
            }

            const authAccount = await resolveAuthenticatedAccount(req);
            const resolvedEmail = authAccount?.email ?? (typeof email === 'string' ? email.trim() : '');
            if (!resolvedEmail || !resolvedEmail.includes('@')) {
                return jsonError(res, 400, 'A valid email is required');
            }

            const persona = parsePersona(personaHint);
            const normalizedEmail = normalizeEmail(resolvedEmail);

            const responsePayload = await withTransaction(async (client) => {
                const account = authAccount ?? await createAccount(resolvedEmail, null, client);
                if (persona) {
                    await upsertProfilePersona(account.id, persona, client);
                }

                const transaction = await createPendingTransaction({
                    userId: account.id,
                    email: resolvedEmail,
                    normalizedEmail,
                    productCode,
                }, client);

                const payment = await initializePaystackPayment({
                    transactionId: transaction.id,
                    email: resolvedEmail,
                    normalizedEmail: transaction.normalized_email,
                    amountMinor: transaction.amount_minor,
                    reference: transaction.paystack_reference,
                    productCode,
                });

                await attachPaymentInitialization({
                    reference: transaction.paystack_reference,
                    accessCode: payment.access_code,
                    authorizationUrl: payment.authorization_url,
                }, client);

                const payload: PaymentInitResponse = {
                    reference: payment.reference,
                    authorizationUrl: payment.authorization_url,
                    accessCode: payment.access_code,
                    amountMinor: transaction.amount_minor,
                    currency: transaction.currency,
                    productCode,
                    email: resolvedEmail,
                };

                return payload;
            });

            return res.status(201).json(responsePayload);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to initiate payment';
            return jsonError(res, 500, message);
        }
    });

    app.post('/api/payments/verify', async (req, res) => {
        try {
            const reference = typeof req.body?.reference === 'string' ? req.body.reference.trim() : '';
            if (!reference || !isDocReadyReference(reference)) {
                return jsonError(res, 400, 'Payment reference is required');
            }

            const verification = await verifyPaystackPayment(reference);

            const status = await withTransaction(async (client) => {
                await reconcileVerifiedPayment({ reference, verification }, client);
                const transaction = await findTransactionByReference(reference, client);
                if (!transaction) {
                    throw new Error('UNKNOWN_REFERENCE');
                }

                const [profile, entitlements] = await Promise.all([
                    getProfile(transaction.user_id, client),
                    getEntitlementsForAccount(transaction.user_id, client),
                ]);
                const resolved = resolveEntitlementState(entitlements, profile.persona, transaction.email, 'guest-payment');

                const payload: PaymentStatusResponse = {
                    reference,
                    transactionStatus: transaction.status,
                    hasPremiumAccess: resolved.hasPremiumAccess,
                    activePlan: resolved.activePlan,
                    entitlementReady: transaction.status === 'success' && resolved.hasPremiumAccess,
                };

                return payload;
            });

            return res.json(status);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to verify payment';
            if (message === 'UNKNOWN_REFERENCE') {
                return jsonError(res, 404, 'Payment reference not found');
            }
            return jsonError(res, 500, message);
        }
    });

    app.get('/api/payments/status', async (req, res) => {
        try {
            const reference = typeof req.query.reference === 'string' ? req.query.reference.trim() : '';
            if (!reference || !isDocReadyReference(reference)) {
                return jsonError(res, 400, 'Payment reference is required');
            }

            const transaction = await findTransactionByReference(reference);
            if (!transaction) {
                return jsonError(res, 404, 'Payment reference not found');
            }

            const [profile, entitlements] = await Promise.all([
                getProfile(transaction.user_id),
                getEntitlementsForAccount(transaction.user_id),
            ]);
            const resolved = resolveEntitlementState(entitlements, profile.persona, transaction.email, 'guest-payment');

            const payload: PaymentStatusResponse = {
                reference,
                transactionStatus: transaction.status,
                hasPremiumAccess: resolved.hasPremiumAccess,
                activePlan: resolved.activePlan,
                entitlementReady: transaction.status === 'success' && resolved.hasPremiumAccess,
            };

            return res.json(payload);
        } catch {
            return jsonError(res, 500, 'Failed to load payment status');
        }
    });

    app.post('/api/webhooks/paystack', async (req, res) => {
        try {
            const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
            const signature = Array.isArray(req.headers['x-paystack-signature'])
                ? req.headers['x-paystack-signature'][0]
                : req.headers['x-paystack-signature'];

            if (!verifyPaystackSignature(rawBody, signature, env.paystackSecretKey)) {
                return jsonError(res, 401, 'Invalid Paystack signature');
            }

            const event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent;
            const reference = event.data?.reference ?? null;
            if (!event.event || !reference) {
                return jsonError(res, 400, 'Malformed webhook payload');
            }

            if (shouldIgnorePaystackReference(reference)) {
                return res.status(200).json({ ok: true, ignored: true });
            }

            const eventKey = getWebhookDedupeKey(event);
            const payloadHash = getPayloadHash(rawBody);

            await withTransaction(async (client) => {
                const inserted = await recordWebhookReceipt({
                    eventKey,
                    eventType: event.event,
                    reference,
                    payload: event,
                    signatureValid: true,
                    payloadHash,
                }, client);

                if (!inserted) {
                    return;
                }

                if (event.event !== 'charge.success') {
                    if (event.event === 'charge.failed' || event.event === 'charge.abandoned') {
                        await markTransactionAbandoned(reference, client);
                    }
                    await markWebhookProcessed(eventKey, 'ignored', client);
                    return;
                }

                const verification = await verifyPaystackPayment(reference);
                await reconcileVerifiedPayment({ reference, verification }, client);
                await markWebhookProcessed(eventKey, 'processed', client);
            });

            return res.status(200).json({ ok: true });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Webhook processing failed';
            if (message === 'UNKNOWN_REFERENCE') {
                return jsonError(res, 404, 'Unknown payment reference');
            }
            return jsonError(res, 500, 'Failed to process webhook');
        }
    });

    if (options.vite) {
        const vite = options.vite;
        app.use(vite.middlewares);
        app.use(async (req, res, next) => {
            if (req.path.startsWith('/api/')) {
                return next();
            }

            try {
                const templatePath = path.resolve(process.cwd(), 'index.html');
                const template = await fs.readFile(templatePath, 'utf8');
                const html = await vite.transformIndexHtml(req.originalUrl, template);
                res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
            } catch (error) {
                vite.ssrFixStacktrace(error as Error);
                next(error);
            }
        });
    } else {
        app.use((_req, res) => {
            res.status(404).json({ error: 'DocReady API only. Deploy the frontend on Cloudflare Pages.' });
        });
    }

    return app;
}
