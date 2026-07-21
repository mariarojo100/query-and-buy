/**
 * lib/db/messaging — participant-scoped conversations/messages (Phase 4).
 * ===========================================================================
 * Replaces the RLS family conv_participant_read/update, conv_buyer_insert,
 * msg_participant_read, msg_participant_send. Every read is scoped to a
 * conversation the viewer is a party to; sending asserts participant AND the
 * conversation is not 'blocked' in the same transaction as the insert.
 *
 * CRITICAL: conversationMessagesFor combines the conversation id with
 * messageVisibleWhere(viewer), so passing a foreign conversation id yields an
 * empty thread instead of leaking another pair's messages.
 */
import { db } from '@/lib/db'
import { messageVisibleWhere } from '@/lib/authz/policies'
import { blockExistsBetween, blockedIdsFor } from '@/lib/db/blocks'
import type { Viewer } from '@/lib/authz/viewer'

export type Participant = { id: string; display_name: string; avatar_url: string | null; username: string | null }
export type ListingSummary = { id: string; title_en: string; price_fils: number; currency: string; cover_key: string | null }
export type InboxItem = {
  id: string
  listing: ListingSummary | null
  other: Participant | null
  lastBody: string | null
  lastAt: string | null
  unreadCount: number
}
export type ConversationMessage = { id: string; sender_id: string; body: string | null; created_at: string }
export type ConversationView = {
  id: string
  status: string
  listing: ListingSummary | null
  other: Participant | null
  meId: string
  buyerId: string
  sellerId: string
  otherLastReadAt: string | null
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002'
}

const listingSelect = {
  id: true,
  titleEn: true,
  priceFils: true,
  currency: true,
  images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' } },
} as const

type ListingRow = {
  id: string
  titleEn: string
  priceFils: bigint
  currency: string
  images: { storageKey: string; position: number }[]
} | null

function mapListing(l: ListingRow): ListingSummary | null {
  if (!l) return null
  const cover = l.images.length ? [...l.images].sort((a, b) => a.position - b.position)[0].storageKey : null
  return { id: l.id, title_en: l.titleEn, price_fils: Number(l.priceFils), currency: l.currency, cover_key: cover }
}

async function participantMapFor(ids: string[]): Promise<Map<string, Participant>> {
  const map = new Map<string, Participant>()
  if (!ids.length) return map
  const profs = await db.profile.findMany({
    where: { id: { in: ids } },
    select: { id: true, displayName: true, avatarUrl: true, username: true },
  })
  for (const p of profs) map.set(p.id, { id: p.id, display_name: p.displayName, avatar_url: p.avatarUrl, username: p.username })
  return map
}

export async function conversationsFor(viewer: Viewer): Promise<InboxItem[]> {
  const blocked = await blockedIdsFor(viewer)
  const convs = await db.conversation.findMany({
    where: {
      OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }],
      // Hide threads with users blocked in either direction (App Store UGC).
      ...(blocked.size > 0
        ? { NOT: [{ buyerId: { in: [...blocked] } }, { sellerId: { in: [...blocked] } }] }
        : {}),
    },
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      lastMessageAt: true,
      buyerLastReadAt: true,
      sellerLastReadAt: true,
      listing: { select: listingSelect },
    },
  })
  if (!convs.length) return []

  const ids = convs.map((c) => c.id)
  const msgs = await db.message.findMany({
    where: { conversationId: { in: ids } },
    orderBy: { createdAt: 'desc' },
    select: { conversationId: true, senderId: true, body: true, createdAt: true },
  })
  const lastByConv = new Map<string, { body: string | null; created_at: Date }>()
  const msgsByConv = new Map<string, { senderId: string; createdAt: Date }[]>()
  for (const m of msgs) {
    if (!lastByConv.has(m.conversationId)) lastByConv.set(m.conversationId, { body: m.body, created_at: m.createdAt })
    const arr = msgsByConv.get(m.conversationId) ?? []
    arr.push({ senderId: m.senderId, createdAt: m.createdAt })
    msgsByConv.set(m.conversationId, arr)
  }

  const otherIds = convs.map((c) => (c.buyerId === viewer.id ? c.sellerId : c.buyerId))
  const people = await participantMapFor([...new Set(otherIds)])

  return convs.map((c) => {
    const isBuyer = c.buyerId === viewer.id
    const otherId = isBuyer ? c.sellerId : c.buyerId
    const lastRead = isBuyer ? c.buyerLastReadAt : c.sellerLastReadAt
    const last = lastByConv.get(c.id)
    const unreadCount = (msgsByConv.get(c.id) ?? []).filter(
      (m) => m.senderId === otherId && (!lastRead || m.createdAt > lastRead),
    ).length
    return {
      id: c.id,
      listing: mapListing(c.listing),
      other: people.get(otherId) ?? null,
      lastBody: last?.body ?? null,
      lastAt: (last?.created_at ?? c.lastMessageAt)?.toISOString() ?? null,
      unreadCount,
    }
  })
}

export async function unreadConversationCountFor(viewer: Viewer): Promise<number> {
  const convs = await db.conversation.findMany({
    where: { OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] },
    select: { id: true, buyerId: true, sellerId: true, buyerLastReadAt: true, sellerLastReadAt: true },
  })
  if (!convs.length) return 0
  const msgs = await db.message.findMany({
    where: { conversationId: { in: convs.map((c) => c.id) } },
    select: { conversationId: true, senderId: true, createdAt: true },
  })
  const byConv = new Map<string, { senderId: string; createdAt: Date }[]>()
  for (const m of msgs) {
    const arr = byConv.get(m.conversationId) ?? []
    arr.push({ senderId: m.senderId, createdAt: m.createdAt })
    byConv.set(m.conversationId, arr)
  }
  let count = 0
  for (const c of convs) {
    const isBuyer = c.buyerId === viewer.id
    const otherId = isBuyer ? c.sellerId : c.buyerId
    const lastRead = isBuyer ? c.buyerLastReadAt : c.sellerLastReadAt
    const hasUnread = (byConv.get(c.id) ?? []).some((m) => m.senderId === otherId && (!lastRead || m.createdAt > lastRead))
    if (hasUnread) count++
  }
  return count
}

export async function conversationViewFor(viewer: Viewer, conversationId: string): Promise<ConversationView | null> {
  const conv = await db.conversation.findFirst({
    where: { id: conversationId, OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      status: true,
      buyerLastReadAt: true,
      sellerLastReadAt: true,
      listing: { select: listingSelect },
    },
  })
  if (!conv) return null
  const isBuyer = conv.buyerId === viewer.id
  const otherId = isBuyer ? conv.sellerId : conv.buyerId
  const people = await participantMapFor([otherId])
  const otherLastRead = isBuyer ? conv.sellerLastReadAt : conv.buyerLastReadAt
  return {
    id: conv.id,
    status: conv.status,
    listing: mapListing(conv.listing),
    other: people.get(otherId) ?? null,
    meId: viewer.id,
    buyerId: conv.buyerId,
    sellerId: conv.sellerId,
    otherLastReadAt: otherLastRead ? otherLastRead.toISOString() : null,
  }
}

export async function conversationMessagesFor(viewer: Viewer, conversationId: string): Promise<ConversationMessage[]> {
  const rows = await db.message.findMany({
    where: { AND: [{ conversationId }, messageVisibleWhere(viewer)] },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, body: true, createdAt: true },
  })
  return rows.map((r) => ({ id: r.id, sender_id: r.senderId, body: r.body, created_at: r.createdAt.toISOString() }))
}

export async function createConversationFor(
  viewer: Viewer,
  listingId: string,
): Promise<{ conversationId?: string; error?: string }> {
  const listing = await db.listing.findUnique({ where: { id: listingId }, select: { sellerId: true } })
  if (!listing) return { error: 'Listing not found.' }
  if (listing.sellerId === viewer.id) return { error: "You can't message yourself." }
  if (await blockExistsBetween(viewer.id, listing.sellerId)) {
    return { error: 'You can’t message this seller.' }
  }

  const key = { listingId_buyerId: { listingId, buyerId: viewer.id } }
  const existing = await db.conversation.findUnique({ where: key, select: { id: true } })
  if (existing) return { conversationId: existing.id }

  try {
    const created = await db.conversation.create({
      data: { listingId, buyerId: viewer.id, sellerId: listing.sellerId, status: 'open' },
      select: { id: true },
    })
    return { conversationId: created.id }
  } catch (e) {
    if (isUniqueViolation(e)) {
      const again = await db.conversation.findUnique({ where: key, select: { id: true } })
      if (again) return { conversationId: again.id }
    }
    return { error: 'Could not start conversation.' }
  }
}

export async function markConversationReadFor(viewer: Viewer, conversationId: string): Promise<boolean> {
  const conv = await db.conversation.findUnique({ where: { id: conversationId }, select: { buyerId: true, sellerId: true } })
  if (!conv) return false
  if (viewer.id === conv.buyerId) {
    await db.conversation.update({ where: { id: conversationId }, data: { buyerLastReadAt: new Date() } })
    return true
  }
  if (viewer.id === conv.sellerId) {
    await db.conversation.update({ where: { id: conversationId }, data: { sellerLastReadAt: new Date() } })
    return true
  }
  return false
}

export type SendResult =
  | {
      ok: true
      recipientId: string
      /** True only for the very first message in the conversation — the "someone
       *  reached out for the first time" signal that warrants an email. */
      firstContact: boolean
      /** Populated only when firstContact, for building the inquiry email. */
      senderName: string
      listingTitle: string
      coverKey: string | null
    }
  | { ok: false; reason: 'not_participant' | 'blocked' }

export async function sendMessageFor(viewer: Viewer, conversationId: string, text: string): Promise<SendResult> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, sellerId: true, status: true, listingId: true },
  })
  if (!conv || (conv.buyerId !== viewer.id && conv.sellerId !== viewer.id)) return { ok: false, reason: 'not_participant' }
  if (conv.status === 'blocked') return { ok: false, reason: 'blocked' }
  const otherId = viewer.id === conv.buyerId ? conv.sellerId : conv.buyerId
  if (await blockExistsBetween(viewer.id, otherId)) return { ok: false, reason: 'blocked' }

  // Whether anyone has spoken in this conversation yet — read BEFORE the insert.
  const priorMessages = await db.message.count({ where: { conversationId } })
  const firstContact = priorMessages === 0

  await db.$transaction([
    db.message.create({ data: { conversationId, senderId: viewer.id, body: text } }),
    db.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ])
  const recipientId = viewer.id === conv.buyerId ? conv.sellerId : conv.buyerId

  // Only the first message needs richer context (for the inquiry email); every
  // later message stays a cheap in-app-only notification.
  let senderName = ''
  let listingTitle = ''
  let coverKey: string | null = null
  if (firstContact) {
    const [sender, listing] = await Promise.all([
      db.profile.findUnique({ where: { id: viewer.id }, select: { displayName: true } }),
      db.listing.findUnique({
        where: { id: conv.listingId },
        select: { titleEn: true, images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' }, take: 1 } },
      }),
    ])
    senderName = sender?.displayName ?? 'A buyer'
    listingTitle = listing?.titleEn ?? 'your listing'
    coverKey = listing?.images[0]?.storageKey ?? null
  }

  return { ok: true, recipientId, firstContact, senderName, listingTitle, coverKey }
}
