import { createClient } from '@/utils/supabase/server'

export type Participant = {
  id: string
  display_name: string
  avatar_url: string | null
  username: string | null
}

export type ListingSummary = {
  id: string
  title_en: string
  price_fils: number
  currency: string
  cover_key: string | null
}

export type InboxItem = {
  id: string
  listing: ListingSummary | null
  other: Participant | null
  lastBody: string | null
  lastAt: string | null
  unreadCount: number
}

export type ConversationMessage = {
  id: string
  sender_id: string
  body: string | null
  created_at: string
}

export type ConversationView = {
  id: string
  status: string
  listing: ListingSummary | null
  other: Participant | null
  meId: string
}

type RawImage = { storage_key: string; position: number }

function coverKey(images: RawImage[] | null | undefined): string | null {
  if (!images?.length) return null
  return [...images].sort((a, b) => a.position - b.position)[0].storage_key
}

function asListing(raw: unknown): ListingSummary | null {
  const l = (Array.isArray(raw) ? raw[0] : raw) as
    | {
        id: string
        title_en: string
        price_fils: number
        currency: string
        images: RawImage[] | null
      }
    | null
    | undefined
  if (!l) return null
  return {
    id: l.id,
    title_en: l.title_en,
    price_fils: l.price_fils,
    currency: l.currency,
    cover_key: coverKey(l.images),
  }
}

async function participantMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, Participant>> {
  const map = new Map<string, Participant>()
  if (ids.length === 0) return map
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, username')
    .in('id', ids)
  for (const row of (data ?? []) as (Participant & { id: string })[]) map.set(row.id, row)
  return map
}

const LISTING_EMBED =
  'listing:listings(id, title_en, price_fils, currency, images:listing_images(storage_key, position))'

/** All conversations for the current user, newest activity first. RLS scopes to participant. */
export async function getUserConversations(): Promise<InboxItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('conversations')
    .select(
      `id, buyer_id, seller_id, last_message_at, created_at, buyer_last_read_at, seller_last_read_at, ${LISTING_EMBED}`,
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  const convs = (data ?? []) as Array<{
    id: string
    buyer_id: string
    seller_id: string
    last_message_at: string | null
    created_at: string
    buyer_last_read_at: string | null
    seller_last_read_at: string | null
    listing: unknown
  }>

  // All messages for the user's conversations (one query; RLS scopes to them).
  const ids = convs.map((c) => c.id)
  const lastByConv = new Map<string, { body: string | null; created_at: string }>()
  const msgsByConv = new Map<string, { sender_id: string; created_at: string }[]>()
  if (ids.length > 0) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('conversation_id, sender_id, body, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: false })
    for (const m of (msgs ?? []) as {
      conversation_id: string
      sender_id: string
      body: string | null
      created_at: string
    }[]) {
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, { body: m.body, created_at: m.created_at })
      }
      const arr = msgsByConv.get(m.conversation_id) ?? []
      arr.push({ sender_id: m.sender_id, created_at: m.created_at })
      msgsByConv.set(m.conversation_id, arr)
    }
  }

  const otherIds = convs.map((c) => (c.buyer_id === user.id ? c.seller_id : c.buyer_id))
  const people = await participantMap(supabase, [...new Set(otherIds)])

  return convs.map((c) => {
    const isBuyer = c.buyer_id === user.id
    const otherId = isBuyer ? c.seller_id : c.buyer_id
    const lastRead = isBuyer ? c.buyer_last_read_at : c.seller_last_read_at
    const last = lastByConv.get(c.id)
    const unreadCount = (msgsByConv.get(c.id) ?? []).filter(
      (m) => m.sender_id === otherId && (!lastRead || new Date(m.created_at) > new Date(lastRead)),
    ).length
    return {
      id: c.id,
      listing: asListing(c.listing),
      other: people.get(otherId) ?? null,
      lastBody: last?.body ?? null,
      lastAt: last?.created_at ?? c.last_message_at,
      unreadCount,
    }
  })
}

/** Number of conversations with at least one unread message for the current user. */
export async function getUnreadConversationCount(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { data: convs } = await supabase
    .from('conversations')
    .select('id, buyer_id, seller_id, buyer_last_read_at, seller_last_read_at')
  const rows = (convs ?? []) as Array<{
    id: string
    buyer_id: string
    seller_id: string
    buyer_last_read_at: string | null
    seller_last_read_at: string | null
  }>
  if (rows.length === 0) return 0

  const { data: msgs } = await supabase
    .from('messages')
    .select('conversation_id, sender_id, created_at')
    .in(
      'conversation_id',
      rows.map((r) => r.id),
    )
  const byConv = new Map<string, { sender_id: string; created_at: string }[]>()
  for (const m of (msgs ?? []) as { conversation_id: string; sender_id: string; created_at: string }[]) {
    const arr = byConv.get(m.conversation_id) ?? []
    arr.push({ sender_id: m.sender_id, created_at: m.created_at })
    byConv.set(m.conversation_id, arr)
  }

  let count = 0
  for (const c of rows) {
    const isBuyer = c.buyer_id === user.id
    const otherId = isBuyer ? c.seller_id : c.buyer_id
    const lastRead = isBuyer ? c.buyer_last_read_at : c.seller_last_read_at
    const hasUnread = (byConv.get(c.id) ?? []).some(
      (m) => m.sender_id === otherId && (!lastRead || new Date(m.created_at) > new Date(lastRead)),
    )
    if (hasUnread) count++
  }
  return count
}

/** Header data + access check for a conversation. Null if not a participant. */
export async function getConversationView(
  conversationId: string,
): Promise<ConversationView | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('conversations')
    .select(`id, buyer_id, seller_id, status, ${LISTING_EMBED}`)
    .eq('id', conversationId)
    .maybeSingle()
  if (!data) return null // RLS: not a participant, or not found

  const conv = data as {
    id: string
    buyer_id: string
    seller_id: string
    status: string
    listing: unknown
  }
  const otherId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
  const people = await participantMap(supabase, [otherId])

  return {
    id: conv.id,
    status: conv.status,
    listing: asListing(conv.listing),
    other: people.get(otherId) ?? null,
    meId: user.id,
  }
}

/** Ordered message thread for a conversation. RLS scopes to participants. */
export async function getConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return (data ?? []) as ConversationMessage[]
}
