create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled resume project',
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resume_projects add column if not exists source_name text;
alter table public.resume_projects add column if not exists target_title text;
alter table public.resume_projects add column if not exists target_source text;
alter table public.resume_projects add column if not exists latest_run_id uuid;

create table if not exists public.tailor_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.resume_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_resume_name text,
  job_target text,
  company_url text,
  mode text not null default 'balanced' check (mode in ('conservative', 'balanced', 'aggressive')),
  fit_score integer check (fit_score is null or (fit_score >= 0 and fit_score <= 100)),
  ats_score integer check (ats_score is null or (ats_score >= 0 and ats_score <= 100)),
  keyword_match_count integer check (keyword_match_count is null or keyword_match_count >= 0),
  read_time_seconds integer check (read_time_seconds is null or read_time_seconds >= 0),
  download_url text,
  download_format text not null default 'pdf' check (download_format in ('pdf', 'docx', 'txt')),
  download_filename text,
  payload jsonb not null default '{}'::jsonb,
  exported_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.resume_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('source_resume', 'tailored_export', 'cover_letter', 'interview_prep')),
  filename text not null,
  format text,
  storage_path text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resume_projects_latest_run_id_fkey'
      and conrelid = 'public.resume_projects'::regclass
  ) then
    alter table public.resume_projects
      add constraint resume_projects_latest_run_id_fkey
      foreign key (latest_run_id) references public.tailor_runs(id) on delete set null;
  end if;
end $$;

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists resume_projects_user_updated_idx on public.resume_projects (user_id, updated_at desc);
create index if not exists resume_projects_user_status_idx on public.resume_projects (user_id, status);
create index if not exists tailor_runs_user_created_idx on public.tailor_runs (user_id, created_at desc);
create index if not exists tailor_runs_project_created_idx on public.tailor_runs (project_id, created_at desc);
create index if not exists project_files_project_idx on public.project_files (project_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.resume_projects enable row level security;
alter table public.tailor_runs enable row level security;
alter table public.project_files enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own"
  on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

drop policy if exists "resume_projects_select_own" on public.resume_projects;
create policy "resume_projects_select_own"
  on public.resume_projects for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "resume_projects_insert_own" on public.resume_projects;
create policy "resume_projects_insert_own"
  on public.resume_projects for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "resume_projects_update_own" on public.resume_projects;
create policy "resume_projects_update_own"
  on public.resume_projects for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "resume_projects_delete_own" on public.resume_projects;
create policy "resume_projects_delete_own"
  on public.resume_projects for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "tailor_runs_select_own" on public.tailor_runs;
create policy "tailor_runs_select_own"
  on public.tailor_runs for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "tailor_runs_insert_own" on public.tailor_runs;
create policy "tailor_runs_insert_own"
  on public.tailor_runs for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "tailor_runs_update_own" on public.tailor_runs;
create policy "tailor_runs_update_own"
  on public.tailor_runs for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "tailor_runs_delete_own" on public.tailor_runs;
create policy "tailor_runs_delete_own"
  on public.tailor_runs for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "project_files_select_own" on public.project_files;
create policy "project_files_select_own"
  on public.project_files for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "project_files_insert_own" on public.project_files;
create policy "project_files_insert_own"
  on public.project_files for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "project_files_update_own" on public.project_files;
create policy "project_files_update_own"
  on public.project_files for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "project_files_delete_own" on public.project_files;
create policy "project_files_delete_own"
  on public.project_files for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.resume_projects to authenticated;
grant select, insert, update, delete on public.tailor_runs to authenticated;
grant select, insert, update, delete on public.project_files to authenticated;
