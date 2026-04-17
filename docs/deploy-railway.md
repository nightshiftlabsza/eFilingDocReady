# Railway Deployment

## 1. Create the Railway service

Deploy this repo as a Node service on Railway.

Use:
- build command: `npm run build`
- start command: `npm run start`

## 2. Set environment variables

- `FRONTEND_APP_URL=https://docready.co.za`
- `PORT=3000`
- `PAYSTACK_CALLBACK_URL=https://docready.co.za/payment/callback`
- `DATABASE_URL=...`
- `VITE_API_BASE_URL=https://api.docready.co.za`
- `VITE_SUPPORT_EMAIL=support@example.com`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `PAYSTACK_SECRET_KEY=...`
- `VITE_PAYSTACK_PUBLIC_KEY=...`

## 3. Confirm runtime behavior

The Railway server:
- exposes `/api/*`
- does not serve the production frontend
- allows only the Cloudflare Pages origin via CORS

## 4. Cloudflare recommendations

Use Cloudflare only for:
- DNS
- proxy
- CDN
- WAF

Recommended:
- proxy `api.docready.co.za` through Cloudflare
- keep webhook paths reachable
- do not cache `/api/*`
- allow POST requests to `/api/webhooks/paystack`

## 5. Post-deploy checks

- open the homepage
- request a Supabase magic link
- confirm `GET /api/account` returns anonymous when signed out
- initiate a Paystack payment
- verify webhook delivery on Railway
- confirm premium access appears only after webhook processing
