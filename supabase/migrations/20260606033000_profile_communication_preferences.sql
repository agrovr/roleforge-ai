alter table public.profiles
  add column if not exists communication_preferences jsonb not null default '{"productUpdates": false}'::jsonb;

update public.profiles
set communication_preferences = '{"productUpdates": false}'::jsonb
where communication_preferences is null
   or jsonb_typeof(communication_preferences) <> 'object';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_communication_preferences_object'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_communication_preferences_object
      check (jsonb_typeof(communication_preferences) = 'object');
  end if;
end $$;
