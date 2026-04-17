# DocReady — Project Context for AI Coding Assistants

## What this app is
DocReady (docready.co.za) is a launch-ready Progressive Web App for South Africans to:
- Merge PDFs and supported images into one PDF
- Compress output toward strict upload limits
- Auto-split oversized outputs
- Optionally add or remove PDF passwords

DocReady is not affiliated with SARS and does not guarantee that any upload or submission will be accepted.

## Production architecture
- Frontend: Cloudflare Pages
- Backend API: Railway
- Database and auth: Supabase Auth + Supabase Postgres
- Payments: Paystack
- DNS, SSL, CDN, WAF: Cloudflare

## Privacy boundary
- Document processing stays in the browser
- Customer document files and document metadata must not be stored remotely
- Remote storage is limited to users, transactions, entitlements, and webhook events

## Launch scope
- South Africa only
- Supported inputs: PDF, JPG, JPEG, PNG
- Free usage: merge into one PDF
- Paid passes unlock compression, auto-splitting, and password add/remove
- Two paid passes only:
  - Taxpayer Pass: R49 once-off
  - Practitioner Pass: R399 once-off for one practitioner or one office user
- Refund policy: 7 days

## Tech stack
- React 19 + TypeScript + Vite
- Tailwind CSS 4 + Framer Motion
- pdf-lib + pdfjs-dist
- Express backend in `server/`
- Supabase client helpers in `src/lib/`

## Important files
- `src/App.tsx` — app shell, route handling, consent gate, payment callback
- `src/components/LandingPage.tsx` — truthful launch homepage
- `src/components/FileWorkspace.tsx` — file upload, reorder, rotate, merge/compress controls
- `src/components/PricingModal.tsx` — two-plan launch checkout modal
- `src/components/LegalPage.tsx` — terms, privacy, refunds, contact, POPIA, PAIA
- `server/app.ts` — Railway API routes
- `server/lib/billing.ts` — Paystack initialize, verify, webhook reconciliation
- `supabase/migrations/20260329_000001_account_billing_auth.sql` — launch billing/auth schema
- `public/manifest.json` — PWA manifest
- `public/_redirects` — Cloudflare Pages SPA fallback
- `public/_headers` — Cloudflare Pages security/cache headers

## Do not do
- Do not reintroduce Vercel deployment assumptions
- Do not store customer documents server-side
- Do not add fake enterprise packaging, seat management, or unsupported admin claims
- Do not restore client-side premium state as the billing source of truth
- Do not add extra subscription tiers beyond the two launch passes
