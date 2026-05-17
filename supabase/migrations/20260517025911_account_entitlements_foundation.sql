create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from anon, authenticated, public;

create table if not exists public.account_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  billing_status text not null default 'none',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_entitlements_plan_check
    check (plan in ('free', 'premium')),
  constraint account_entitlements_billing_status_check
    check (billing_status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'))
);

alter table public.account_entitlements
  add column if not exists plan text not null default 'free',
  add column if not exists billing_status text not null default 'none',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists features jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'account_entitlements_plan_check'
      and conrelid = 'public.account_entitlements'::regclass
  ) then
    alter table public.account_entitlements
      add constraint account_entitlements_plan_check
      check (plan in ('free', 'premium'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'account_entitlements_billing_status_check'
      and conrelid = 'public.account_entitlements'::regclass
  ) then
    alter table public.account_entitlements
      add constraint account_entitlements_billing_status_check
      check (billing_status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete'));
  end if;
end
$$;

create unique index if not exists account_entitlements_stripe_customer_idx
  on public.account_entitlements(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists account_entitlements_stripe_subscription_idx
  on public.account_entitlements(stripe_subscription_id)
  where stripe_subscription_id is not null;

drop trigger if exists set_account_entitlements_updated_at on public.account_entitlements;
create trigger set_account_entitlements_updated_at
before update on public.account_entitlements
for each row execute function public.set_updated_at();

alter table public.account_entitlements enable row level security;

drop policy if exists account_entitlements_select_own on public.account_entitlements;
create policy account_entitlements_select_own on public.account_entitlements
  for select to authenticated
  using (user_id = auth.uid());

revoke all on public.account_entitlements from anon;
revoke all on public.account_entitlements from authenticated;
grant select on public.account_entitlements to authenticated;
