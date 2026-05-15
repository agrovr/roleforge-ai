alter table public.tailor_runs
  add column if not exists client_history_id text;

create unique index if not exists tailor_runs_user_client_history_idx
  on public.tailor_runs(user_id, client_history_id)
  where client_history_id is not null;
