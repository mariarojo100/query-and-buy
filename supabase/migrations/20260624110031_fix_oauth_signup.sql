-- ============================================================================
-- 20260624110031_fix_oauth_signup
-- FIX: migration 110030 recreated handle_new_user but dropped the username
-- generation (profiles.username is NOT NULL UNIQUE), so the profile insert
-- failed for brand-new users → auth.users creation rolled back → OAuth signup
-- failed with "Unable to exchange external code". Existing users were fine
-- (on conflict skip). This restores full username + email_verified logic,
-- ADDS the Google name/photo metadata, and hardens the trigger so it can NEVER
-- block account creation. A self-heal RPC guarantees a profile always exists.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display  text;
  v_base     text;
  v_username text;
  v_suffix   int := 0;
begin
  insert into public.users (id, phone_e164, email, has_mobile_verified, has_email_verified)
  values (
    new.id, new.phone, new.email,
    new.phone_confirmed_at is not null,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  -- Display name: app metadata, then Google (full_name/name), then fallbacks.
  v_display := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'name', ''),
    new.phone, split_part(new.email, '@', 1), 'New User'
  );

  -- Unique username (profiles.username is NOT NULL UNIQUE).
  v_base := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
             nullif(new.raw_user_meta_data->>'full_name', ''),
             split_part(new.email, '@', 1), 'user'),
    '[^a-zA-Z0-9]+', '_', 'g'));
  v_base := trim(both '_' from v_base);
  if v_base is null or v_base = '' then v_base := 'user'; end if;
  if length(v_base) < 3 then v_base := v_base || '_user'; end if;
  v_base := left(v_base, 24);

  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := v_base || '_' || v_suffix::text;
    if v_suffix > 50 then
      v_username := v_base || '_' || substr(replace(new.id::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  insert into public.profiles (id, display_name, username, email_verified, avatar_url)
  values (
    new.id, v_display, v_username,
    new.email_confirmed_at is not null,        -- OAuth emails arrive confirmed
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    )
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
exception
  when others then
    -- Never block auth creation; the profile is self-healed on first login.
    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Self-heal: ensure the CURRENT authenticated user has users/profile/role rows.
-- Called from the OAuth callback so "Profile missing" can never surface, even
-- if the trigger's profile insert was skipped for any reason.
-- ----------------------------------------------------------------------------
create or replace function public.ensure_self_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  au  auth.users%rowtype;
  v_display  text;
  v_base     text;
  v_username text;
  v_suffix   int := 0;
begin
  if uid is null then return; end if;
  select * into au from auth.users where id = uid;
  if not found then return; end if;

  insert into public.users (id, phone_e164, email, has_mobile_verified, has_email_verified)
  values (uid, au.phone, au.email,
          au.phone_confirmed_at is not null, au.email_confirmed_at is not null)
  on conflict (id) do nothing;

  if not exists (select 1 from public.profiles where id = uid) then
    v_display := coalesce(
      nullif(au.raw_user_meta_data->>'display_name', ''),
      nullif(au.raw_user_meta_data->>'full_name', ''),
      nullif(au.raw_user_meta_data->>'name', ''),
      au.phone, split_part(au.email, '@', 1), 'New User'
    );
    v_base := lower(regexp_replace(
      coalesce(nullif(au.raw_user_meta_data->>'display_name', ''),
               nullif(au.raw_user_meta_data->>'full_name', ''),
               split_part(au.email, '@', 1), 'user'),
      '[^a-zA-Z0-9]+', '_', 'g'));
    v_base := trim(both '_' from v_base);
    if v_base is null or v_base = '' then v_base := 'user'; end if;
    if length(v_base) < 3 then v_base := v_base || '_user'; end if;
    v_base := left(v_base, 24);

    v_username := v_base;
    while exists (select 1 from public.profiles where username = v_username) loop
      v_suffix := v_suffix + 1;
      v_username := v_base || '_' || v_suffix::text;
      if v_suffix > 50 then
        v_username := v_base || '_' || substr(replace(uid::text, '-', ''), 1, 8);
        exit;
      end if;
    end loop;

    insert into public.profiles (id, display_name, username, email_verified, avatar_url)
    values (uid, v_display, v_username, au.email_confirmed_at is not null,
            coalesce(nullif(au.raw_user_meta_data->>'avatar_url', ''),
                     nullif(au.raw_user_meta_data->>'picture', '')))
    on conflict (id) do nothing;
  end if;

  insert into public.user_roles (user_id, role)
  values (uid, 'user')
  on conflict (user_id, role) do nothing;
end;
$$;

grant execute on function public.ensure_self_profile() to authenticated;
