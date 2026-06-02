create extension if not exists pgcrypto with schema extensions;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  category text not null,
  subject text not null,
  message text not null,
  context_url text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_requests_category_check
    check (category in ('workflow', 'exports', 'billing', 'account', 'saved-projects', 'other')),
  constraint support_requests_status_check
    check (status in ('open', 'reviewing', 'closed')),
  constraint support_requests_subject_length_check
    check (char_length(subject) between 4 and 120),
  constraint support_requests_message_length_check
    check (char_length(message) between 20 and 2000),
  constraint support_requests_context_length_check
    check (context_url is null or char_length(context_url) <= 300)
);

create index if not exists support_requests_user_created_idx
  on public.support_requests (user_id, created_at desc);

create index if not exists support_requests_status_created_idx
  on public.support_requests (status, created_at desc);

alter table public.support_requests enable row level security;

drop policy if exists "support_requests_select_own" on public.support_requests;
create policy "support_requests_select_own"
  on public.support_requests for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "support_requests_insert_own" on public.support_requests;
create policy "support_requests_insert_own"
  on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on table public.support_requests from anon;
revoke all on table public.support_requests from authenticated;
grant select, insert on table public.support_requests to authenticated;
grant select, insert, update, delete on table public.support_requests to service_role;
