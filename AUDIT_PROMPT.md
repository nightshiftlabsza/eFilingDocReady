# DocReady Audit Prompt

This file is retained as a helper prompt, but the old no-backend/Vercel version is no longer current.

Use these facts when auditing the repo:

- Frontend: Cloudflare Pages
- Backend API: Railway
- Database and auth: Supabase
- Payments: Paystack
- Files are processed in the browser
- Customer document files and document metadata must not be stored remotely
- Free usage is merge-only
- Paid launch scope is only:
  - Taxpayer Pass: R49 once-off
  - Practitioner Pass: R399 once-off for one practitioner or one office user
- Supported inputs: PDF, JPG, JPEG, PNG
- DocReady is not affiliated with SARS and does not guarantee upload acceptance

Focus audits on:
- truthful public copy
- server-side payment verification
- webhook idempotency
- Supabase schema and RLS
- Cloudflare Pages and Railway deployment separation
- preserving the in-browser document engine
