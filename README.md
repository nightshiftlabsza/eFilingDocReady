# DocReady

DocReady is a privacy-first web app for South Africans to prepare supporting documents for strict upload limits without uploading files to a server.

## Privacy boundary

DocReady does store remote account and billing data:
- Supabase Auth users and account records
- Payment transactions and webhook events
- Pass entitlements

DocReady does not store remote document data:
- PDFs, images, filenames, page counts, page sizes, OCR text, or document metadata
- Any server-side document upload or processing payloads

All PDF and image processing remains inside the browser.

## Stack

- Frontend: React + Vite + TypeScript
- Auth and data: Supabase Auth + Supabase Postgres
- Payments: Paystack
- Runtime: Express on Railway
- Edge layer: Cloudflare for DNS, CDN, proxy, and WAF only

## Local development

```bash
npm install
npm run dev
```

The local app runs through the Express server with Vite middleware, so both the SPA and `/api/*` routes are available from one local port.

## Build and test

```bash
npm run build
npm test
```

## Environment variables

Copy `.env.example` to `.env` and fill in:

- `APP_URL`
- `FRONTEND_APP_URL`
- `PORT`
- `PAYSTACK_CALLBACK_URL`
- `DATABASE_URL`
- `VITE_API_BASE_URL`
- `VITE_SUPPORT_EMAIL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `VITE_PAYSTACK_PUBLIC_KEY`

## Deployment docs

- [Architecture](C:\Users\mzaka.ZAK-PC\Documents\Apps\DocReady\docs\architecture.md)
- [Supabase Setup](C:\Users\mzaka.ZAK-PC\Documents\Apps\DocReady\docs\supabase.md)
- [Paystack Setup](C:\Users\mzaka.ZAK-PC\Documents\Apps\DocReady\docs\paystack.md)
- [Railway Deployment](C:\Users\mzaka.ZAK-PC\Documents\Apps\DocReady\docs\deploy-railway.md)
