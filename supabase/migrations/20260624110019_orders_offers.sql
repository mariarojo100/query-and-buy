-- ============================================================================
-- 20260624110019_orders_offers
-- Sprint 9 — in-app negotiation + order confirmation.
--   orders : one per (listing, buyer); tracks negotiation → confirmation.
--   offers : structured price offers exchanged inside a conversation.
-- RLS: strictly the two participants (buyer/seller). No one else.
-- ============================================================================

-- ---------- orders ----------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings(id) on delete cascade,
  conversation_id  uuid references public.conversations(id) on delete set null,
  buyer_id         uuid not null references public.profiles(id) on delete cascade,
  seller_id        uuid not null references public.profiles(id) on delete cascade,
  accepted_price_fils bigint,
  -- negotiating | offer_sent | offer_accepted | awaiting_confirmation | confirmed | cancelled | completed
  status           text not null default 'negotiating',
  buyer_confirmed  boolean not null default false,
  seller_confirmed boolean not null default false,
  contact_revealed boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (listing_id, buyer_id),
  constraint orders_distinct check (buyer_id <> seller_id)
);

create index idx_orders_buyer  on public.orders(buyer_id, updated_at desc);
create index idx_orders_seller on public.orders(seller_id, updated_at desc);
create index idx_orders_conv   on public.orders(conversation_id);

create trigger trg_orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------- offers ----------
create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  amount_fils     bigint not null check (amount_fils >= 0),
  -- pending | accepted | declined | countered | superseded
  status          text not null default 'pending',
  created_at      timestamptz not null default now()
);

create index idx_offers_order on public.offers(order_id, created_at);
create index idx_offers_conv  on public.offers(conversation_id, created_at);

-- ---------- RLS ----------
alter table public.orders enable row level security;
alter table public.offers enable row level security;

-- orders: only the two participants.
create policy orders_participant_read on public.orders
  for select using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy orders_buyer_insert on public.orders
  for insert with check (buyer_id = auth.uid() and buyer_id <> seller_id);

create policy orders_participant_update on public.orders
  for update using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- offers: visible/insertable/updatable by the order's participants.
create policy offers_participant_read on public.offers
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
  );

create policy offers_participant_insert on public.offers
  for insert with check (
    sender_id = auth.uid()
    and exists (select 1 from public.orders o
                where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
  );

create policy offers_participant_update on public.offers
  for update using (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
  ) with check (
    exists (select 1 from public.orders o
            where o.id = order_id and (o.buyer_id = auth.uid() or o.seller_id = auth.uid()))
  );
