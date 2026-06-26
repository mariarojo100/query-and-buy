-- ============================================================================
-- 20260624110015_reports
-- Trust & Safety foundation: reports table (Sprint 7A Part 1).
--
-- Replaces the original polymorphic `reports` table (target_type/target_id,
-- enum reason/status) with an explicit-column design. The old table was unused
-- by any application code, so dropping it is safe. The report_target /
-- report_reason / report_status enums are left in place (report_target is still
-- referenced by admin_actions.target_type).
-- ============================================================================

drop table if exists public.reports cascade;

create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references public.profiles(id) on delete cascade,
  listing_id       uuid references public.listings(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete set null,
  reason           text not null,
  description      text,
  status           text not null default 'open',
  created_at       timestamptz not null default now(),
  -- A report must target a listing and/or a user (not nothing).
  constraint reports_has_target check (listing_id is not null or reported_user_id is not null)
);

-- Moderation/query indexes.
create index idx_reports_status        on public.reports(status, created_at desc);
create index idx_reports_reporter      on public.reports(reporter_id);
create index idx_reports_listing       on public.reports(listing_id)
                                        where listing_id is not null;
create index idx_reports_reported_user on public.reports(reported_user_id)
                                        where reported_user_id is not null;

-- ---------- Row Level Security ----------
-- reporter_id is a profiles.id, which equals auth.uid() (profiles.id = users.id
-- = auth.users.id), so auth.uid() comparisons work directly.
alter table public.reports enable row level security;

-- Users can create reports (only as themselves).
create policy reports_insert on public.reports
  for insert with check (reporter_id = auth.uid());

-- Users can view their own reports.
create policy reports_select_own on public.reports
  for select using (reporter_id = auth.uid());

-- service_role bypasses RLS by design, so it can view/manage ALL reports with no
-- extra policy. No staff/admin client-side policy is defined here on purpose —
-- moderation reads run via service_role (the moderation UI lands in a later sprint).
