-- ============================================================================
-- 20260624110030_oauth_profile_metadata
-- Extend handle_new_user so OAuth (Google) signups get a real display name and
-- profile photo from the provider's metadata. INSERT-only (on conflict do
-- nothing), so existing profiles are NEVER overwritten on later logins.
-- Google puts the name in full_name/name and the photo in avatar_url/picture.
-- Email/password signup behaviour is unchanged (it has no such metadata).
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

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      new.phone,
      split_part(new.email, '@', 1),
      'New User'
    ),
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
end;
$$;
