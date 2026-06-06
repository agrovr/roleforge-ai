alter table public.support_requests
  drop constraint if exists support_requests_category_check;

alter table public.support_requests
  add constraint support_requests_category_check
    check (category in ('workflow', 'exports', 'billing', 'privacy', 'account', 'saved-projects', 'other'));
