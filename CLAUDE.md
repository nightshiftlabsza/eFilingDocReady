# DocReady — Project Context for AI Coding Assistants

## What this app is
DocReady (docready.co.za) helps South African users prepare supporting documents for strict upload limits by:
- Merging PDFs and supported images into one PDF
- Compressing oversized outputs
- Auto-splitting large outputs
- Optionally adding or removing PDF passwords

DocReady is not affiliated with SARS and does not guarantee that any upload or submission will be accepted.

## Production architecture
- Frontend: Cloudflare Pages
- Backend API: Railway
- Database and auth: Supabase Auth + Supabase Postgres
- Payments: Paystack
- Edge: Cloudflare DNS, SSL, CDN, and WAF

## Product truth
- South Africa only
- Supported inputs: PDF, JPG, JPEG, PNG
- Free usage: merge into one PDF
- Paid usage:
  - Taxpayer Pass: R49 once-off
  - Practitioner Pass: R399 once-off for one practitioner or one office user
- Refund policy: 7 days

## Privacy boundary
- All file processing happens in the browser
- Remote storage is limited to users, transactions, entitlements, and webhook events
- Customer document files, filenames, page counts, and document-derived metadata must not be stored remotely

## App structure
- `src/App.tsx` — app shell and route state
- `src/components/` — homepage, persona views, workspace, pricing, legal pages, settings, receipt
- `src/lib/` — PDF generation, password helpers, API, auth, product catalog, site copy
- `server/` — Express API for Railway
- `supabase/` — SQL migration for launch schema
- `public/` — manifest, Cloudflare headers, Cloudflare redirects, icons

## Billing truth
- Server-side verification is the source of truth
- Frontend starts checkout by calling the Railway backend
- Backend writes transactions, verifies Paystack responses, processes webhooks, and grants entitlements idempotently
- Browser storage must not be used as the source of truth for paid access
