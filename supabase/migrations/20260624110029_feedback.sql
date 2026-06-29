-- ============================================================================
-- 20260624110029_feedback
-- In-app beta feedback (bug / feature / general). Anyone may submit (auth or
-- anon); only admins can read. No external integrations.
-- ============================================================================

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  kind       text not null check (kind in ('bug', 'feature', 'general')),
  message    text not null check (char_length(message) between 1 and 2000),
  path       text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_feedback_created on public.feedback(created_at desc);

alter table public.feedback enable row level security;

-- Submit from anywhere; a signed-in user may only attribute it to themselves.
create policy feedback_insert on public.feedback
  for insert with check (user_id is null or user_id = auth.uid());

-- Only admins/staff read the feedback inbox.
create policy feedback_admin_read on public.feedback
  for select using (public.is_admin());
