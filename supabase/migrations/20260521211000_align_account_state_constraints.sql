do $$
begin
  if to_regclass('public.resume_projects') is not null then
    alter table public.resume_projects
      drop constraint if exists resume_projects_status_check;

    alter table public.resume_projects
      add constraint resume_projects_status_check
      check (status in ('active', 'draft', 'generated', 'tailored', 'exported', 'archived'));
  end if;

  if to_regclass('public.account_entitlements') is not null then
    alter table public.account_entitlements
      drop constraint if exists account_entitlements_billing_status_check;

    alter table public.account_entitlements
      add constraint account_entitlements_billing_status_check
      check (
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
      );
  end if;
end
$$;
