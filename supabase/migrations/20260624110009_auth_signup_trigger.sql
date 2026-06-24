-- ============================================================================
-- 20260624110009_auth_signup_trigger
-- Signup bootstrap (§7.1): when Supabase Auth creates an auth.users row,
-- create the matching public.users + profiles + default user_roles('user')
-- rows in one transaction.
--
-- SECURITY DEFINER (owner = postgres) so it can write public.* despite RLS and
-- despite running in the supabase_auth_admin context. Defensive on_conflict
-- guards make it safe to re-run / replay.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, phone_e164, email, has_mobile_verified, has_email_verified)
  values (
    new.id,
    new.phone,
    new.email,
    new.phone_confirmed_at is not null,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      new.phone,
      split_part(new.email, '@', 1),
      'New User'
    )
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Fire after a new auth user is created. Drop-if-exists keeps the migration
-- idempotent if re-applied against a database that already has the trigger.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
