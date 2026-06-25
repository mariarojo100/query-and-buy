-- ============================================================================
-- 20260624110012_profiles_username
-- Add a unique handle to profiles for public URLs (/u/[username]) and extend
-- the signup trigger to auto-generate one. citext → case-insensitive uniqueness.
-- ============================================================================

alter table public.profiles
  add column username citext unique;

-- Backfill existing rows with a guaranteed-unique placeholder (id-derived).
update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 12)
where username is null;

-- Extend handle_new_user (§7.1) to also create a friendly, unique username.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display  text;
  v_base     text;
  v_username citext;
  v_suffix   int := 0;
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

  v_display := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    new.phone,
    split_part(new.email, '@', 1),
    'New User'
  );

  -- Build a slug base from display name / email local-part.
  v_base := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
             split_part(new.email, '@', 1),
             'user'),
    '[^a-zA-Z0-9]+', '_', 'g'
  ));
  v_base := trim(both '_' from v_base);
  if v_base is null or v_base = '' then
    v_base := 'user';
  end if;
  if length(v_base) < 3 then
    v_base := v_base || '_user';
  end if;
  v_base := left(v_base, 24);

  -- Find a free username; unique constraint is the final backstop on races.
  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := v_base || '_' || v_suffix::text;
    if v_suffix > 50 then
      v_username := v_base || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  insert into public.profiles (id, display_name, username)
  values (new.id, v_display, v_username)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
