-- ============================================================================
-- 20260624110016_profile_trust
-- Verification & Trust (Sprint 7B). Adds world-readable verification + a
-- denormalized reports_count to profiles so the trust score can be computed in
-- app code WITHOUT exposing the private users table or the reports table.
-- (RLS-safe: public reads only profiles; reports stays owner/service-role only.)
-- ============================================================================

alter table public.profiles
  add column email_verified boolean not null default false,
  add column phone_verified boolean not null default false,  -- placeholder (no OTP yet)
  add column reports_count  integer not null default 0;

-- Backfill email verification from Supabase Auth (profiles.id = auth.users.id).
update public.profiles p
set email_verified = (u.email_confirmed_at is not null)
from auth.users u
where u.id = p.id;

-- Backfill reports_count from existing reports.
update public.profiles p
set reports_count = (
  select count(*) from public.reports r where r.reported_user_id = p.id
);

-- ---------- signup: seed email_verified ----------
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
    new.id, new.phone, new.email,
    new.phone_confirmed_at is not null,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;

  v_display := coalesce(
    nullif(new.raw_user_meta_data->>'display_name', ''),
    new.phone, split_part(new.email, '@', 1), 'New User'
  );

  v_base := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''),
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

  insert into public.profiles (id, display_name, username, email_verified)
  values (new.id, v_display, v_username, new.email_confirmed_at is not null)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- ---------- keep email_verified in sync when a user confirms their email ----------
create or replace function public.sync_email_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set email_verified = (new.email_confirmed_at is not null)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_email_confirmed on auth.users;
create trigger on_auth_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.sync_email_verified();

-- ---------- denormalized profiles.reports_count ----------
create or replace function public.recount_user_reports(_user uuid)
returns void language sql security definer set search_path = public as $$
  update public.profiles p
  set reports_count = (
    select count(*) from public.reports r where r.reported_user_id = _user
  )
  where p.id = _user;
$$;

create or replace function public.trg_user_reports_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    if new.reported_user_id is not null then
      perform public.recount_user_reports(new.reported_user_id);
    end if;
  elsif (tg_op = 'DELETE') then
    if old.reported_user_id is not null then
      perform public.recount_user_reports(old.reported_user_id);
    end if;
  elsif (tg_op = 'UPDATE') then
    if new.reported_user_id is distinct from old.reported_user_id then
      if old.reported_user_id is not null then
        perform public.recount_user_reports(old.reported_user_id);
      end if;
      if new.reported_user_id is not null then
        perform public.recount_user_reports(new.reported_user_id);
      end if;
    end if;
  end if;
  return null;
end;
$$;

create trigger trg_user_reports_count_aiud
  after insert or update or delete on public.reports
  for each row execute function public.trg_user_reports_count();
