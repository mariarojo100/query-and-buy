-- ============================================================================
-- 20260624110028_search_log
-- Records search queries so Trending Searches and suggestions are computed from
-- REAL frequency (Sprint 13), not hardcoded. Written/read only by the service
-- role from server actions — no client policies (like email_failures).
-- ============================================================================

create table public.search_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  query      text not null,
  created_at timestamptz not null default now()
);

create index idx_search_log_created on public.search_log(created_at desc);
create index idx_search_log_query_lower on public.search_log(lower(query));

alter table public.search_log enable row level security;
-- No policies: only the service role (bypasses RLS) writes/reads this table.
