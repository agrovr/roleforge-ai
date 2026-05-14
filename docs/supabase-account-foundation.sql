-- RoleForge AI account foundation.
-- Apply this in a Supabase project before enabling saved projects in the UI.
-- Do not expose service-role keys in the frontend.

create extension if not exists pgcrypto;

create table if not exists public.roleforge_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled resume',
  status text not null default 'draft' check (status in ('draft', 'tailored', 'exported', 'archived')),
  source_filename text,
  source_mime_type text,
  last_target_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.resume_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  backend_run_id text,
  target_title text,
  target_company text,
  tailoring_mode text not null default 'balanced' check (tailoring_mode in ('conservative', 'balanced', 'aggressive')),
  fit_score integer check (fit_score between 0 and 100),
  ats_score integer check (ats_score between 0 and 100),
  export_formats text[] not null default array['pdf']::text[],
  result_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists resume_projects_user_updated_idx
  on public.resume_projects (user_id, updated_at desc);

create index if not exists resume_runs_project_created_idx
  on public.resume_runs (project_id, created_at desc);

create index if not exists resume_runs_user_created_idx
  on public.resume_runs (user_id, created_at desc);

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

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
  end if;
end;
$$;

drop trigger if exists set_roleforge_profiles_updated_at on public.roleforge_profiles;
create trigger set_roleforge_profiles_updated_at
before update on public.roleforge_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_resume_projects_updated_at on public.resume_projects;
create trigger set_resume_projects_updated_at
before update on public.resume_projects
for each row execute function public.set_updated_at();

alter table public.roleforge_profiles enable row level security;
alter table public.resume_projects enable row level security;
alter table public.resume_runs enable row level security;

revoke all on table public.roleforge_profiles from anon;
revoke all on table public.resume_projects from anon;
revoke all on table public.resume_runs from anon;

revoke all on table public.roleforge_profiles from authenticated;
revoke all on table public.resume_projects from authenticated;
revoke all on table public.resume_runs from authenticated;

grant usage on schema public to authenticated;
grant select, insert, update on table public.roleforge_profiles to authenticated;
grant select, insert, update, delete on table public.resume_projects to authenticated;
grant select, insert, delete on table public.resume_runs to authenticated;

drop policy if exists "Users can read their profile" on public.roleforge_profiles;
create policy "Users can read their profile"
on public.roleforge_profiles for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their profile" on public.roleforge_profiles;
create policy "Users can insert their profile"
on public.roleforge_profiles for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their profile" on public.roleforge_profiles;
create policy "Users can update their profile"
on public.roleforge_profiles for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

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

drop policy if exists "Users can read their runs" on public.resume_runs;
create policy "Users can read their runs"
on public.resume_runs for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their runs" on public.resume_runs;
create policy "Users can insert their runs"
on public.resume_runs for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their runs" on public.resume_runs;
create policy "Users can delete their runs"
on public.resume_runs for delete
using ((select auth.uid()) = user_id);
