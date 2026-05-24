do $$
begin
  if to_regclass('public.tailor_runs') is not null then
    alter table public.tailor_runs
      add column if not exists export_template text not null default 'classic';

    alter table public.tailor_runs
      drop constraint if exists tailor_runs_export_template_check;

    alter table public.tailor_runs
      add constraint tailor_runs_export_template_check
      check (export_template in ('classic', 'modern', 'editorial', 'compact', 'executive', 'engineer'));
  end if;
end
$$;
