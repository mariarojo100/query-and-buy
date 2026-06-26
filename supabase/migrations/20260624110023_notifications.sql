-- ============================================================================
-- 20260624110023_notifications
-- In-app notification center + an email-failure log for future retries.
-- Notifications are READ/updated by their owner; they are INSERTED by the
-- server (service role) on behalf of the recipient — so there is no client
-- insert policy (the actor is usually the OTHER party).
-- ============================================================================

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_owner_read on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_owner_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- email failure log (service-role only) ----------
create table public.email_failures (
  id         uuid primary key default gen_random_uuid(),
  to_email   text,
  template   text,
  error      text,
  payload    jsonb,
  created_at timestamptz not null default now()
);

alter table public.email_failures enable row level security;
-- No policies: only the service role (which bypasses RLS) reads/writes this.
