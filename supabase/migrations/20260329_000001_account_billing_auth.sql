-- DocReady launch schema
-- Stores account, transaction, entitlement, and webhook records only.
-- Customer documents, filenames, and document-derived metadata must never be stored remotely.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  normalized_email text not null unique,
  persona text check (persona in ('taxpayer', 'practitioner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  normalized_email text not null,
  paystack_reference text not null unique,
  plan_code text not null check (plan_code in ('taxpayer_pass_onceoff', 'practitioner_pass_onceoff')),
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'ZAR',
  status text not null check (status in ('pending', 'success', 'failed', 'abandoned')),
  paystack_access_code text,
  paystack_authorization_url text,
  provider_payload jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  email text not null,
  product_code text not null check (product_code in ('taxpayer_pass_onceoff', 'practitioner_pass_onceoff')),
  status text not null check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  source_transaction_id uuid unique references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  event_key text not null unique,
  reference text,
  payload_hash text,
  payload jsonb not null default '{}'::jsonb,
  signature_valid boolean not null default false,
  status text not null check (status in ('received', 'processed', 'ignored', 'rejected')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_normalized_email on public.users(normalized_email);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_reference on public.transactions(paystack_reference);
create index if not exists idx_entitlements_user_id on public.entitlements(user_id);
create index if not exists idx_webhook_events_reference on public.webhook_events(reference);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists trg_entitlements_updated_at on public.entitlements;
create trigger trg_entitlements_updated_at before update on public.entitlements
for each row execute function public.set_updated_at();

drop trigger if exists trg_webhook_events_updated_at on public.webhook_events;
create trigger trg_webhook_events_updated_at before update on public.webhook_events
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.entitlements enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
for select to authenticated
using (auth.uid() = auth_user_id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
for update to authenticated
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
for select to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = transactions.user_id
      and users.auth_user_id = auth.uid()
  )
);

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements
for select to authenticated
using (
  exists (
    select 1 from public.users
    where users.id = entitlements.user_id
      and users.auth_user_id = auth.uid()
  )
);
