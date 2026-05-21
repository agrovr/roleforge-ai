revoke all on table public.roleforge_profiles from authenticated;
revoke all on table public.resume_projects from authenticated;
revoke all on table public.resume_runs from authenticated;

revoke all on table public.roleforge_profiles from anon;
revoke all on table public.resume_projects from anon;
revoke all on table public.resume_runs from anon;

grant usage on schema public to authenticated;
grant select, insert, update on table public.roleforge_profiles to authenticated;
grant select, insert, update, delete on table public.resume_projects to authenticated;
grant select, insert, delete on table public.resume_runs to authenticated;
