-- ============================================================================
-- 20260624110002_identity
-- Identity split: users (private) + profiles (public) + user_roles (RBAC),
-- then the SECURITY DEFINER role-helper functions that read user_roles.
-- Source: database-design.md §2.1–§2.3, §2.0 (helpers, reordered after tables)
-- ============================================================================

-- ---------- 2.1 users: private account state (1:1 with auth.users) ----------
create table public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  phone_e164     text unique,                       -- mirrored from auth for app queries
  email          citext unique,
  status         user_status not null default 'active',
  locale         text not null default 'en',        -- 'en' | 'ar'
  trust_score    smallint not null default 0,       -- derived, cached
  has_mobile_verified bool not null default false,
  has_email_verified  bool not null default false,
  has_eid_verified    bool not null default false,
  flagged        bool not null default false,        -- safety hold
  last_active_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create trigger trg_users_touch before update on public.users
  for each row execute function public.touch_updated_at();

-- ---------- 2.2 profiles: public seller card (1:1 with users) ----------
create table public.profiles (
  id            uuid primary key references public.users(id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  bio           text,
  emirate       emirate,
  badge_level   text not null default 'none',        -- none | basic | verified
  rating_avg    numeric(2,1) not null default 0,     -- 0.0–5.0
  rating_count  integer not null default 0,
  listings_count integer not null default 0,         -- denormalized counter
  member_since  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- 2.3 user_roles: RBAC ----------
create table public.user_roles (
  user_id    uuid not null references public.users(id) on delete cascade,
  role       app_role not null default 'user',
  granted_by uuid references public.users(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------- role helpers (created AFTER user_roles exists) ----------
-- SECURITY DEFINER + fixed search_path avoids RLS recursion: a policy on
-- user_roles must not re-enter these functions' own table reads.
create or replace function public.has_role(_role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles
                 where user_id = auth.uid() and role = _role);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles
                 where user_id = auth.uid()
                   and role in ('moderator','admin','super_admin'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles
                 where user_id = auth.uid()
                   and role in ('admin','super_admin'));
$$;
