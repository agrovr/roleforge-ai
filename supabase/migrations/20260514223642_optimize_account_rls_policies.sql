create index if not exists resume_runs_user_created_idx
  on public.resume_runs (user_id, created_at desc);

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
