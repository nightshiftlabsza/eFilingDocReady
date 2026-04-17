# DocReady Architecture

## What is stored remotely

- Supabase Auth identity records
- `users`
- `entitlements`
- `transactions`
- `webhook_events`

These records exist only to support sign-in, restore access, payment verification, and pass entitlement checks.

## What is never stored remotely

- PDF files
- Image files
- Document filenames
- Page counts or dimensions
- OCR text
- Compression output
- Any server-side copy of user documents

## Runtime flow

1. The browser processes documents entirely client-side.
2. The browser can request a restore link through `POST /api/auth/request-link`.
3. The browser calls `GET /api/account` with a Supabase bearer token when signed in.
4. The backend resolves the account and entitlement state from Postgres.
5. Payment checkout starts with `POST /api/payments/initiate`.
6. The backend creates a pending transaction and calls Paystack initialize.
7. Paystack webhook confirmation lands on `POST /api/webhooks/paystack`.
8. The backend verifies the payment, updates the transaction, and grants the entitlement idempotently.
9. The frontend can confirm a callback through `POST /api/payments/verify` or poll `GET /api/payments/status`.

## Product model

- `taxpayer_pass_onceoff`
- `practitioner_pass_onceoff`

## Access rules

- Free usage is merge-only.
- Premium tools require a verified server-side entitlement.
- Customer files are never uploaded to Supabase, Railway, or any other remote store.

## Cloudflare role

Cloudflare should only provide:
- DNS
- proxy/CDN
- WAF
- TLS termination if desired

Cloudflare must not process user documents or replace the Railway webhook endpoint.
