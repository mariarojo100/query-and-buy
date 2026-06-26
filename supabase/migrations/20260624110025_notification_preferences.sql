-- ============================================================================
-- 20260624110025_notification_preferences
-- Per-user email category toggles. Critical transactional emails (order
-- confirmed, contact unlocked, reservation updates) bypass these in code for
-- account safety. Missing row == defaults (everything but marketing on).
-- ============================================================================

create table public.notification_preferences (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  offer_emails     boolean not null default true,
  chat_emails      boolean not null default true,
  order_emails     boolean not null default true,
  review_emails    boolean not null default true,
  marketing_emails boolean not null default false,
  updated_at       timestamptz not null default now()
);

create trigger trg_notif_prefs_touch before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

alter table public.notification_preferences enable row level security;

create policy notif_prefs_owner_read on public.notification_preferences
  for select using (user_id = auth.uid());

create policy notif_prefs_owner_insert on public.notification_preferences
  for insert with check (user_id = auth.uid());

create policy notif_prefs_owner_update on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
