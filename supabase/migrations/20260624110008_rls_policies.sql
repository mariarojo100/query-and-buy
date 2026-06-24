-- ============================================================================
-- 20260624110008_rls_policies
-- Enable Row Level Security on every table and define access policies.
-- RLS is THE authorization layer (clients hit PostgREST directly).
-- Default with RLS on and no matching policy = deny. Source: §5
-- ============================================================================

-- ---------- enable RLS everywhere ----------
alter table public.users                 enable row level security;
alter table public.profiles              enable row level security;
alter table public.user_roles            enable row level security;
alter table public.categories            enable row level security;
alter table public.listings              enable row level security;
alter table public.listing_images        enable row level security;
alter table public.listing_embeddings    enable row level security;
alter table public.price_suggestions     enable row level security;
alter table public.conversations         enable row level security;
alter table public.messages              enable row level security;
alter table public.saved_searches        enable row level security;
alter table public.favorites             enable row level security;
alter table public.verification_requests enable row level security;
alter table public.reports               enable row level security;
alter table public.admin_actions         enable row level security;

-- 5.1 users — owner + staff read, owner-limited write
create policy users_self_read on public.users
  for select using (id = auth.uid() or public.is_staff());
create policy users_self_update on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- 5.2 profiles — public read, owner write
create policy profiles_public_read on public.profiles
  for select using (true);
create policy profiles_owner_write on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner_insert on public.profiles
  for insert with check (id = auth.uid());

-- 5.3 user_roles — read own, only admins mutate
create policy roles_read on public.user_roles
  for select using (user_id = auth.uid() or public.is_staff());
create policy roles_admin_write on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

-- 5.4 categories — public read (active), admin write
create policy categories_public_read on public.categories
  for select using (is_active or public.is_staff());
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- 5.5 listings — public sees active; owner sees own; staff sees all
create policy listings_read on public.listings
  for select using (
    (status = 'active' and deleted_at is null)
    or seller_id = auth.uid()
    or public.is_staff()
  );
create policy listings_owner_insert on public.listings
  for insert with check (seller_id = auth.uid());
create policy listings_owner_update on public.listings
  for update using (seller_id = auth.uid() or public.is_staff())
  with check (seller_id = auth.uid() or public.is_staff());
create policy listings_owner_delete on public.listings
  for delete using (seller_id = auth.uid() or public.is_admin());

-- 5.6 listing_images — visible when the parent listing is visible
create policy images_read on public.listing_images
  for select using (
    exists (select 1 from public.listings l
            where l.id = listing_id
              and ( (l.status='active' and l.deleted_at is null)
                    or l.seller_id = auth.uid() or public.is_staff() ))
  );
create policy images_owner_write on public.listing_images
  for all using (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = auth.uid())
  ) with check (
    exists (select 1 from public.listings l
            where l.id = listing_id and l.seller_id = auth.uid())
  );

-- 5.7 price_suggestions — listing owner / requester / staff read.
-- Writes come from the AI worker via service_role (bypasses RLS) — no client write policy.
create policy price_read on public.price_suggestions
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.listings l
               where l.id = listing_id and l.seller_id = auth.uid())
    or public.is_staff()
  );

-- 5.8 conversations + messages — strictly the two participants
create policy conv_participant_read on public.conversations
  for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_staff());
create policy conv_buyer_insert on public.conversations
  for insert with check (buyer_id = auth.uid() and buyer_id <> seller_id);
create policy conv_participant_update on public.conversations
  for update using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

create policy msg_participant_read on public.messages
  for select using (public.is_conversation_participant(conversation_id) or public.is_staff());
create policy msg_participant_send on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and not exists (select 1 from public.conversations c
                    where c.id = conversation_id and c.status = 'blocked')
  );

-- 5.9 saved_searches & favorites — private to owner
create policy saved_owner_all on public.saved_searches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fav_owner_all on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 5.10 verification_requests — owner submits, staff reviews
create policy verif_owner_read on public.verification_requests
  for select using (user_id = auth.uid() or public.is_staff());
create policy verif_owner_insert on public.verification_requests
  for insert with check (user_id = auth.uid());
create policy verif_staff_update on public.verification_requests
  for update using (public.is_staff()) with check (public.is_staff());

-- 5.11 reports — authenticated files; staff manages
create policy reports_insert on public.reports
  for insert with check (reporter_id = auth.uid());
create policy reports_read on public.reports
  for select using (reporter_id = auth.uid() or public.is_staff());
create policy reports_staff_update on public.reports
  for update using (public.is_staff()) with check (public.is_staff());

-- 5.12 admin_actions — staff read, append-only (NO update/delete policy)
create policy admin_actions_read on public.admin_actions
  for select using (public.is_staff());
create policy admin_actions_insert on public.admin_actions
  for insert with check (public.is_staff() and admin_id = auth.uid());

-- Note: listing_embeddings has RLS enabled but NO policy → deny-all to clients.
-- Embeddings are written/read by the AI worker via service_role (bypasses RLS)
-- and surfaced to clients through an RPC, never by direct table select.
