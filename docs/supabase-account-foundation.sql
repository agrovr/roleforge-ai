-- RoleForge AI account foundation.
-- Apply this in the roleforge-ai Supabase project before enabling saved projects,
-- usage limits, and Stripe-backed entitlements.
-- Do not expose service-role keys in frontend NEXT_PUBLIC_* variables.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  billing_status text not null default 'none' check (
    billing_status in (
      'none',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'unpaid',
      'paused'
    )
  ),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  features jsonb not null default '{
    "export_pdf": true,
    "export_docx": false,
    "export_txt": false,
    "project_storage": true,
    "monthly_run_limit": 5
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled resume',
  status text not null default 'draft' check (status in ('active', 'draft', 'generated', 'tailored', 'exported', 'archived')),
  source_filename text,
  source_name text,
  source_mime_type text,
  target_title text,
  target_source text,
  last_target_summary text,
  latest_run_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tailor_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.resume_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_history_id text,
  source_resume_name text,
  job_target text,
  company_url text,
  mode text not null default 'balanced' check (mode in ('conservative', 'balanced', 'aggressive')),
  fit_score integer check (fit_score between 0 and 100),
  ats_score integer check (ats_score between 0 and 100),
  keyword_match_count integer,
  read_time_seconds integer,
  download_format text not null default 'pdf' check (download_format in ('pdf', 'docx', 'txt')),
  download_url text,
  download_filename text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.resume_projects
  drop constraint if exists resume_projects_latest_run_id_fkey;

alter table public.resume_projects
  add constraint resume_projects_latest_run_id_fkey
  foreign key (latest_run_id) references public.tailor_runs(id) on delete set null;

create unique index if not exists tailor_runs_user_client_history_idx
  on public.tailor_runs (user_id, client_history_id)
  where client_history_id is not null;

create index if not exists account_entitlements_stripe_customer_idx
  on public.account_entitlements (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists account_entitlements_stripe_subscription_idx
  on public.account_entitlements (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists resume_projects_user_updated_idx
  on public.resume_projects (user_id, updated_at desc);

create index if not exists tailor_runs_project_created_idx
  on public.tailor_runs (project_id, created_at desc);

create index if not exists tailor_runs_user_created_idx
  on public.tailor_runs (user_id, created_at desc);

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

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_account_entitlements_updated_at on public.account_entitlements;
create trigger set_account_entitlements_updated_at
before update on public.account_entitlements
for each row execute function public.set_updated_at();

drop trigger if exists set_resume_projects_updated_at on public.resume_projects;
create trigger set_resume_projects_updated_at
before update on public.resume_projects
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.account_entitlements enable row level security;
alter table public.resume_projects enable row level security;
alter table public.tailor_runs enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.account_entitlements from anon;
revoke all on table public.resume_projects from anon;
revoke all on table public.tailor_runs from anon;

revoke all on table public.profiles from authenticated;
revoke all on table public.account_entitlements from authenticated;
revoke all on table public.resume_projects from authenticated;
revoke all on table public.tailor_runs from authenticated;

grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.account_entitlements to authenticated;
grant select, insert, update, delete on table public.resume_projects to authenticated;
grant select, insert, update, delete on table public.tailor_runs to authenticated;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
using ((select auth.uid()) = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
on public.profiles for insert
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can read their entitlement" on public.account_entitlements;
create policy "Users can read their entitlement"
on public.account_entitlements for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their projects" on public.resume_projects;
create policy "Users can read their projects"
on public.resume_projects for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their projects" on public.resume_projects;
create policy "Users can insert their projects"
on public.resume_projects for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their projects" on public.resume_projects;
create policy "Users can update their projects"
on public.resume_projects for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their projects" on public.resume_projects;
create policy "Users can delete their projects"
on public.resume_projects for delete
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their runs" on public.tailor_runs;
create policy "Users can read their runs"
on public.tailor_runs for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their runs" on public.tailor_runs;
create policy "Users can insert their runs"
on public.tailor_runs for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their runs" on public.tailor_runs;
create policy "Users can update their runs"
on public.tailor_runs for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their runs" on public.tailor_runs;
create policy "Users can delete their runs"
on public.tailor_runs for delete
using ((select auth.uid()) = user_id);
