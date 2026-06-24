-- ============================================================================
-- 20260624110005_messaging
-- Conversations + messages, then the participant helper used by RLS.
-- Source: database-design.md §2.9, §5.8
-- ============================================================================

-- ---------- 2.9 conversations ----------
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  buyer_id        uuid not null references public.users(id) on delete cascade,
  seller_id       uuid not null references public.users(id) on delete cascade,
  status          conversation_status not null default 'open',
  last_message_at timestamptz,
  buyer_unread    smallint not null default 0,
  seller_unread   smallint not null default 0,
  created_at      timestamptz not null default now(),
  unique (listing_id, buyer_id)                       -- one thread per buyer per listing
);

-- ---------- 2.9 messages ----------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.users(id) on delete cascade,
  body            text,
  attachments     jsonb,                              -- [{key,type}]
  flagged         bool not null default false,        -- scam/abuse detector
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- participant helper (created AFTER conversations exists) ----------
-- SECURITY DEFINER so message policies can check membership without granting
-- direct SELECT on conversations and without correlated-subquery duplication.
create or replace function public.is_conversation_participant(_conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversations c
                 where c.id = _conv
                   and (c.buyer_id = auth.uid() or c.seller_id = auth.uid()));
$$;
