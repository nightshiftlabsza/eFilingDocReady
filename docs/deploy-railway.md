# Railway Backend Deployment

## Service role

Use the existing Railway DocReady service as a backend-only API service.

- build command: `npm run build`
- start command: `npm run start`
- runtime entrypoint: `node build/server/index.js`
- healthcheck route: `GET /api/health`

The Railway service must not serve the production frontend. Any non-API route should keep returning the JSON `DocReady API only` response.

## Temporary launch URL

If Railway cannot attach `api.docready.co.za` yet, launch safely with the Railway default backend URL.

- frontend canonical host: `https://docready.co.za`
- backend API host: `https://<railway-default-domain>`
- frontend API base URL: `VITE_API_BASE_URL=https://<railway-default-domain>`

Do not block launch on a free Railway custom-domain slot.

## Railway environment variables

Set only the backend variables on Railway:

- `APP_ENV=production`
- `FRONTEND_APP_URL=https://docready.co.za`
- `PORT=3000`
- `PAYSTACK_CALLBACK_URL=https://docready.co.za/payment/callback`
- `DATABASE_URL=<supabase postgres connection string>`
- `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>`
- `PAYSTACK_SECRET_KEY=<shared Nightshift Labs ZA Paystack secret key>`

Do not set these frontend-only variables on Railway:

- `VITE_API_BASE_URL`
- `VITE_SUPPORT_EMAIL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PAYSTACK_PUBLIC_KEY`

## Runtime behavior

The Railway server:

- exposes `GET /api/health`
- exposes `GET /api/account`
- exposes `POST /api/auth/request-link`
- exposes `POST /api/payments/initiate`
- exposes `POST /api/payments/verify`
- exposes `GET /api/payments/status`
- exposes `POST /api/webhooks/paystack`
- allows CORS only from `https://docready.co.za`

## Cloudflare Pages settings

Cloudflare Pages should build the frontend separately:

- build command: `npm run build:client`
- output directory: `dist`

Cloudflare Pages variables:

- `VITE_API_BASE_URL=https://<railway-default-domain>`
- `VITE_SUPPORT_EMAIL=<real docready support mailbox>`
- `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<supabase anon key>`
- `VITE_PAYSTACK_PUBLIC_KEY=<shared Nightshift Labs ZA Paystack public key>`

## Edge/CDN rules

Cloudflare should only provide:

- DNS
- TLS
- proxy/CDN
- WAF

Cloudflare must not cache, rewrite, or serve `/api/*`.
