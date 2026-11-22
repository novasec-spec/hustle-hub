-- Hustle Hub payments + Premium.
-- Payments can only be settled by the server: settle/get/set-ref functions require HH_PAYMENT_SECRET,
-- whose SHA-256 is stored in a private, non-exposed schema.
-- Before applying, replace the placeholder with: printf %s "$HH_PAYMENT_SECRET" | sha256sum

create schema if not exists hh_private;
revoke all on schema hh_private from public, anon, authenticated;
create table hh_private.config (key text primary key, value text not null);
insert into hh_private.config (key, value) values ('payment_secret_sha256', '<sha256 hex of HH_PAYMENT_SECRET>')
on conflict (key) do update set value = excluded.value;

create table public.hh_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('mpesa','intasend','paystack','paypal','crypto')),
  amount numeric(12,2) not null,
  currency text not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','canceled')),
  provider_ref text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on public.hh_payments (user_id);
create index on public.hh_payments (provider_ref);
alter table public.hh_payments enable row level security;
create policy "own_select" on public.hh_payments for select to authenticated using ((select auth.uid()) = user_id);

create table public.hh_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'premium',
  current_period_end timestamptz not null,
  last_provider text,
  updated_at timestamptz not null default now()
);
alter table public.hh_subscriptions enable row level security;
create policy "own_select" on public.hh_subscriptions for select to authenticated using ((select auth.uid()) = user_id);

create table public.hh_ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.hh_ai_usage (user_id, created_at);
alter table public.hh_ai_usage enable row level security;
create policy "own_select" on public.hh_ai_usage for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.hh_ai_usage for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function hh_private.check_secret(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or encode(extensions.digest(p_secret, 'sha256'), 'hex') <>
     (select value from hh_private.config where key = 'payment_secret_sha256') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;
revoke all on function hh_private.check_secret(text) from public, anon, authenticated;

create or replace function public.hh_start_payment(p_provider text, p_amount numeric, p_currency text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  insert into public.hh_payments (user_id, provider, amount, currency)
  values (auth.uid(), p_provider, p_amount, upper(p_currency)) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.hh_start_payment(text, numeric, text) from public, anon;
grant execute on function public.hh_start_payment(text, numeric, text) to authenticated;

create or replace function public.hh_set_payment_ref(p_secret text, p_id uuid, p_ref text, p_meta jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform hh_private.check_secret(p_secret);
  update public.hh_payments set provider_ref = p_ref, meta = meta || coalesce(p_meta, '{}'::jsonb) where id = p_id;
end $$;

create or replace function public.hh_get_payment(p_secret text, p_id uuid default null, p_ref text default null)
returns table (id uuid, user_id uuid, provider text, amount numeric, currency text, status text, provider_ref text, meta jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  perform hh_private.check_secret(p_secret);
  return query select p.id, p.user_id, p.provider, p.amount, p.currency, p.status, p.provider_ref, p.meta
    from public.hh_payments p
    where (p_id is not null and p.id = p_id) or (p_id is null and p_ref is not null and p.provider_ref = p_ref)
    limit 1;
end $$;

create or replace function public.hh_settle_payment(p_secret text, p_id uuid, p_status text, p_meta jsonb default '{}'::jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_provider text; v_prev text;
begin
  perform hh_private.check_secret(p_secret);
  if p_status not in ('paid','failed','canceled') then raise exception 'bad status'; end if;
  select user_id, provider, status into v_user, v_provider, v_prev from public.hh_payments where id = p_id for update;
  if v_user is null then return 'not_found'; end if;
  if v_prev <> 'pending' then return v_prev; end if;
  update public.hh_payments
     set status = p_status, meta = meta || coalesce(p_meta, '{}'::jsonb),
         paid_at = case when p_status = 'paid' then now() else null end
   where id = p_id;
  if p_status = 'paid' then
    insert into public.hh_subscriptions (user_id, plan, current_period_end, last_provider, updated_at)
    values (v_user, 'premium', now() + interval '30 days', v_provider, now())
    on conflict (user_id) do update
      set current_period_end = greatest(public.hh_subscriptions.current_period_end, now()) + interval '30 days',
          last_provider = excluded.last_provider, updated_at = now();
  end if;
  return p_status;
end $$;

revoke all on function public.hh_set_payment_ref(text, uuid, text, jsonb) from public;
revoke all on function public.hh_get_payment(text, uuid, text) from public;
revoke all on function public.hh_settle_payment(text, uuid, text, jsonb) from public;
grant execute on function public.hh_set_payment_ref(text, uuid, text, jsonb) to anon, authenticated;
grant execute on function public.hh_get_payment(text, uuid, text) to anon, authenticated;
grant execute on function public.hh_settle_payment(text, uuid, text, jsonb) to anon, authenticated;
