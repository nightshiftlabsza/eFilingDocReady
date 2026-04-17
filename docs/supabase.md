# Supabase Setup

## 1. Create the project

Create a Supabase project and copy:
- Project URL
- anon key
- service role key

## 2. Configure Auth

Enable email-only passwordless auth:
- Supabase Dashboard -> Authentication -> Providers -> Email
- Enable magic links / OTP
- Do not enable Google login for this app

Set the site URL and redirect URLs:
- local: `http://localhost:3000`
- production: `https://docready.co.za`
- callback path: `/auth/callback`

## 3. Run the SQL migration

Apply the migration in:

- [20260329_000001_account_billing_auth.sql](C:\Users\mzaka.ZAK-PC\Documents\Apps\DocReady\supabase\migrations\20260329_000001_account_billing_auth.sql)

This creates:
- `users`
- `entitlements`
- `transactions`
- `webhook_events`

## 4. Set environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

`DATABASE_URL` should point at the same Supabase Postgres instance so the Railway server can run transactional billing logic.

## 5. Important RLS note

RLS is enabled for:
- `users`
- `entitlements`
- `transactions`

Backend billing and webhook work must use service-role or direct Postgres access.
