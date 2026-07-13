-- Reference SELECTs for the auth data migrated by migrate-auth.ts.
-- Run against the SOURCE Supabase database for manual inspection, or to export
-- CSVs if you prefer a file-based load. migrate-auth.ts reads these live.
--
-- Handle the encrypted_password column as a SECRET: any dump of it is a
-- credential store. Encrypt at rest and delete after the load.

-- Password credentials + verification/status state.
select
  id,
  email,
  encrypted_password,          -- bcrypt ($2a$…); loads into auth_credentials as-is
  email_confirmed_at,          -- → has_email_verified / profiles.email_verified
  phone,
  phone_confirmed_at,          -- → phone_e164 / has_mobile_verified / profiles.phone_verified
  banned_until,                -- → users.status = 'banned' (if in the future)
  deleted_at,                  -- → users.status = 'deleted'
  raw_user_meta_data           -- display_name/full_name/avatar from OAuth (already in profiles)
from auth.users
order by id;

-- Linked Google identities → auth_accounts(provider='google', provider_account_id = provider_id).
select user_id, provider, provider_id
from auth.identities
where provider = 'google'
order by user_id;
