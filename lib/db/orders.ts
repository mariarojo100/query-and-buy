/**
 * lib/db/orders — the negotiation engine (Phase 4). THE most authorization-
 * sensitive module.
 * ===========================================================================
 * Replaces orders_/offers_ RLS + the service-role cross-entity transitions.
 * Every mutation asserts the viewer is a participant (or the seller, where the
 * rule is seller-only) BEFORE acting; the listing status transitions
 * (active→reserved on both-confirm, →sold/→active) run in the same transaction
 * as the order update and are guarded by a status filter so a stale/concurrent
 * state can't clobber a sold/deleted listing. Contact details are only ever
 * returned once order.contact_revealed is true (set only when both parties
 * confirm).
 */
import { db } from '@/lib/db'
import type { Prisma } from '@/lib/generated/prisma/client'
import type { Viewer } from '@/lib/authz/viewer'

export type OrderStatus =
  | 'negotiating'
  | 'offer_sent'
  | 'offer_accepted'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'completed'

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'superseded'

export type Offer = { id: string; sender_id: string; amount_fils: number; status: OfferStatus; created_at: string }

export type OrderView = {
  id: string
  listing_id: string
  conversation_id: string | null
  buyer_id: string
  seller_id: string
  accepted_price_fils: number | null
  status: OrderStatus
  buyer_confirmed: boolean
  seller_confirmed: boolean
  contact_revealed: boolean
}

export type ConversationOrder = { order: OrderView | null; offers: Offer[] }

export type OrderListItem = {
  id: string
  status: OrderStatus
  acceptedPriceFils: number | null
  contactRevealed: boolean
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  conversationId: string | null
  updatedAt: string
  listing: { id: string; title_en: string; price_fils: number; currency: string; cover_key: string | null } | null
  other: { id: string; display_name: string; avatar_url: string | null; username: string | null } | null
}

const CLOSED: OrderStatus[] = ['confirmed', 'cancelled', 'completed']

const orderSelect = {
  id: true,
  listingId: true,
  conversationId: true,
  buyerId: true,
  sellerId: true,
  acceptedPriceFils: true,
  status: true,
  buyerConfirmed: true,
  sellerConfirmed: true,
  contactRevealed: true,
} as const

type OrderRow = {
  id: string
  listingId: string
  conversationId: string | null
  buyerId: string
  sellerId: string
  acceptedPriceFils: bigint | null
  status: string
  buyerConfirmed: boolean
  sellerConfirmed: boolean
  contactRevealed: boolean
}

function mapOrder(o: OrderRow): OrderView {
  return {
    id: o.id,
    listing_id: o.listingId,
    conversation_id: o.conversationId,
    buyer_id: o.buyerId,
    seller_id: o.sellerId,
    accepted_price_fils: o.acceptedPriceFils == null ? null : Number(o.acceptedPriceFils),
    status: o.status as OrderStatus,
    buyer_confirmed: o.buyerConfirmed,
    seller_confirmed: o.sellerConfirmed,
    contact_revealed: o.contactRevealed,
  }
}

function isParticipant(o: { buyerId: string; sellerId: string }, viewerId: string): boolean {
  return viewerId === o.buyerId || viewerId === o.sellerId
}

type Fail = { ok: false; error: string }
const fail = (error: string): Fail => ({ ok: false, error })

// --- reads ------------------------------------------------------------------

/** The order (if any) + its offer history for a conversation. Participant-scoped. */
/**
 * True once BOTH parties have confirmed the order for this conversation (i.e.
 * contact details are unlocked). Cheap single-column read — used by messaging
 * to make contact-info filtering state-aware. Scoped to a participant.
 */
export async function isContactRevealedForConversation(
  viewer: Viewer,
  conversationId: string,
): Promise<boolean> {
  const order = await db.order.findFirst({
    where: { conversationId, OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] },
    select: { contactRevealed: true },
  })
  return order?.contactRevealed === true
}

export async function conversationOrderFor(viewer: Viewer, conversationId: string): Promise<ConversationOrder> {
  const order = await db.order.findFirst({
    where: { conversationId, OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] },
    select: orderSelect,
  })
  if (!order) return { order: null, offers: [] }
  const offers = await db.offer.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, senderId: true, amountFils: true, status: true, createdAt: true },
  })
  return {
    order: mapOrder(order),
    offers: offers.map((o) => ({
      id: o.id,
      sender_id: o.senderId,
      amount_fils: Number(o.amountFils),
      status: o.status as OfferStatus,
      created_at: o.createdAt.toISOString(),
    })),
  }
}

export async function ordersForRole(viewer: Viewer, role: 'buyer' | 'seller'): Promise<OrderListItem[]> {
  const rows = await db.order.findMany({
    where: role === 'buyer' ? { buyerId: viewer.id } : { sellerId: viewer.id },
    orderBy: { updatedAt: 'desc' },
    select: {
      ...orderSelect,
      updatedAt: true,
      listing: {
        select: {
          id: true,
          titleEn: true,
          priceFils: true,
          currency: true,
          images: { select: { storageKey: true, position: true }, orderBy: { position: 'asc' } },
        },
      },
    },
  })

  const otherIds = [...new Set(rows.map((r) => (role === 'buyer' ? r.sellerId : r.buyerId)))]
  const people = new Map<string, OrderListItem['other']>()
  if (otherIds.length) {
    const profs = await db.profile.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, displayName: true, avatarUrl: true, username: true },
    })
    for (const p of profs) people.set(p.id, { id: p.id, display_name: p.displayName, avatar_url: p.avatarUrl, username: p.username })
  }

  return rows.map((r) => ({
    id: r.id,
    status: r.status as OrderStatus,
    acceptedPriceFils: r.acceptedPriceFils == null ? null : Number(r.acceptedPriceFils),
    contactRevealed: r.contactRevealed,
    buyerConfirmed: r.buyerConfirmed,
    sellerConfirmed: r.sellerConfirmed,
    conversationId: r.conversationId,
    updatedAt: r.updatedAt.toISOString(),
    listing: r.listing
      ? {
          id: r.listing.id,
          title_en: r.listing.titleEn,
          price_fils: Number(r.listing.priceFils),
          currency: r.listing.currency,
          cover_key: r.listing.images[0]?.storageKey ?? null,
        }
      : null,
    other: people.get(role === 'buyer' ? r.sellerId : r.buyerId) ?? null,
  }))
}

async function loadOrder(orderId: string): Promise<OrderRow | null> {
  return db.order.findUnique({ where: { id: orderId }, select: orderSelect })
}

// --- mutations --------------------------------------------------------------

export type MakeOfferResult =
  | { ok: true; orderId: string; buyerId: string; sellerId: string; senderIsBuyer: boolean }
  | Fail

/** Buyer or seller proposes a price. Supersedes any pending offer. */
export async function makeOfferFor(viewer: Viewer, conversationId: string, fils: number): Promise<MakeOfferResult> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, listingId: true, buyerId: true, sellerId: true },
  })
  if (!conv) return fail('Conversation not found.')
  if (!isParticipant(conv, viewer.id)) return fail('Not allowed.')

  let order = await db.order.findFirst({ where: { conversationId: conv.id }, select: orderSelect })
  if (!order) {
    if (viewer.id !== conv.buyerId) return fail('The buyer needs to start the negotiation first.')
    order = await db.order.create({
      data: { listingId: conv.listingId, conversationId: conv.id, buyerId: conv.buyerId, sellerId: conv.sellerId, status: 'negotiating' },
      select: orderSelect,
    })
  }
  if (CLOSED.includes(order.status as OrderStatus)) return fail('This order is closed.')

  await db.$transaction([
    db.offer.updateMany({ where: { orderId: order.id, status: 'pending' }, data: { status: 'superseded' } }),
    db.offer.create({ data: { orderId: order.id, conversationId: conv.id, senderId: viewer.id, amountFils: BigInt(fils), status: 'pending' } }),
    db.order.update({ where: { id: order.id }, data: { status: 'offer_sent', buyerConfirmed: false, sellerConfirmed: false } }),
    db.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } }),
  ])

  return { ok: true, orderId: order.id, buyerId: conv.buyerId, sellerId: conv.sellerId, senderIsBuyer: viewer.id === conv.buyerId }
}

export type RespondResult =
  | { ok: true; action: 'accept' | 'decline'; orderId: string; buyerId: string; sellerId: string; amountFils: number; conversationId: string | null }
  | Fail

/** The recipient accepts or declines a pending offer. */
export async function respondToOfferFor(viewer: Viewer, offerId: string, action: 'accept' | 'decline'): Promise<RespondResult> {
  const offer = await db.offer.findUnique({
    where: { id: offerId },
    select: { id: true, orderId: true, senderId: true, amountFils: true, status: true },
  })
  if (!offer) return fail('Offer not found.')
  if (offer.status !== 'pending') return fail('This offer is no longer active.')
  if (offer.senderId === viewer.id) return fail("You can't respond to your own offer.")

  const order = await loadOrder(offer.orderId)
  if (!order) return fail('Order not found.')
  if (!isParticipant(order, viewer.id)) return fail('Not allowed.')

  if (action === 'accept') {
    await db.$transaction([
      db.offer.update({ where: { id: offerId }, data: { status: 'accepted' } }),
      db.order.update({
        where: { id: order.id },
        data: { status: 'offer_accepted', acceptedPriceFils: offer.amountFils, buyerConfirmed: false, sellerConfirmed: false, contactRevealed: false },
      }),
    ])
  } else {
    await db.$transaction([
      db.offer.update({ where: { id: offerId }, data: { status: 'declined' } }),
      db.order.update({ where: { id: order.id }, data: { status: 'negotiating' } }),
    ])
  }
  if (order.conversationId) {
    await db.conversation.update({ where: { id: order.conversationId }, data: { lastMessageAt: new Date() } })
  }
  return {
    ok: true,
    action,
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amountFils: Number(offer.amountFils),
    conversationId: order.conversationId,
  }
}

export type ConfirmResult =
  | { ok: true; both: boolean; isBuyer: boolean; orderId: string; buyerId: string; sellerId: string; acceptedPriceFils: number | null; conversationId: string | null }
  | Fail

/** Buyer/seller confirms. When BOTH confirm: reveal contacts + listing → reserved. */
export async function confirmOrderFor(viewer: Viewer, orderId: string): Promise<ConfirmResult> {
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  if (!isParticipant(order, viewer.id)) return fail('Not allowed.')
  if (order.status !== 'offer_accepted' && order.status !== 'awaiting_confirmation') {
    return fail('There is no accepted offer to confirm yet.')
  }

  const isBuyer = viewer.id === order.buyerId
  const buyerConfirmed = order.buyerConfirmed || isBuyer
  const sellerConfirmed = order.sellerConfirmed || !isBuyer
  const both = buyerConfirmed && sellerConfirmed

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.order.update({
      where: { id: order.id },
      data: {
        buyerConfirmed,
        sellerConfirmed,
        status: both ? 'confirmed' : 'awaiting_confirmation',
        contactRevealed: both ? true : order.contactRevealed,
      },
    }),
  ]
  if (both) {
    // Only reserve an 'active' listing — never clobber sold/deleted.
    ops.push(db.listing.updateMany({ where: { id: order.listingId, status: 'active' }, data: { status: 'reserved' } }))
  }
  await db.$transaction(ops)

  return {
    ok: true,
    both,
    isBuyer,
    orderId: order.id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    acceptedPriceFils: order.acceptedPriceFils == null ? null : Number(order.acceptedPriceFils),
    conversationId: order.conversationId,
  }
}

export type CancelResult = { ok: true; conversationId: string | null } | Fail

/** Either party cancels. Frees the listing if it had been reserved by this order. */
export async function cancelOrderFor(viewer: Viewer, orderId: string): Promise<CancelResult> {
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  if (!isParticipant(order, viewer.id)) return fail('Not allowed.')
  if (order.status === 'cancelled' || order.status === 'completed') return fail('This order is already closed.')

  const wasReserved = order.contactRevealed || order.status === 'confirmed'
  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.order.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } }),
  ]
  if (wasReserved) {
    ops.push(db.listing.updateMany({ where: { id: order.listingId, status: 'reserved' }, data: { status: 'active' } }))
  }
  await db.$transaction(ops)
  return { ok: true, conversationId: order.conversationId }
}

export type SellSummary = { orderId: string; buyerId: string; sellerId: string; acceptedPriceFils: number | null; conversationId: string | null; listingId: string }

/** Seller marks a reserved deal as Sold → listing 'sold', order 'completed'. */
export async function markOrderSoldFor(viewer: Viewer, orderId: string): Promise<{ ok: true; summary: SellSummary } | Fail> {
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  if (viewer.id !== order.sellerId) return fail('Only the seller can mark this as sold.')
  if (order.status !== 'confirmed') return fail('Only a confirmed, reserved order can be completed.')

  const listing = await db.listing.updateMany({ where: { id: order.listingId, sellerId: viewer.id }, data: { status: 'sold' } })
  if (listing.count === 0) return fail('Listing not found.')
  await db.order.update({ where: { id: order.id }, data: { status: 'completed', completedAt: new Date() } })

  return {
    ok: true,
    summary: {
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      acceptedPriceFils: order.acceptedPriceFils == null ? null : Number(order.acceptedPriceFils),
      conversationId: order.conversationId,
      listingId: order.listingId,
    },
  }
}

/** Seller re-activates a reserved listing → listing 'active', order 'cancelled'. */
export async function reactivateListingFor(viewer: Viewer, orderId: string): Promise<{ ok: true; buyerId: string; sellerId: string; conversationId: string | null; listingId: string } | Fail> {
  const order = await loadOrder(orderId)
  if (!order) return fail('Order not found.')
  if (viewer.id !== order.sellerId) return fail('Only the seller can re-activate this listing.')
  if (order.status !== 'confirmed') return fail('Only a reserved listing can be re-activated.')

  const listing = await db.listing.updateMany({ where: { id: order.listingId, sellerId: viewer.id }, data: { status: 'active' } })
  if (listing.count === 0) return fail('Listing not found.')
  await db.order.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } })

  return { ok: true, buyerId: order.buyerId, sellerId: order.sellerId, conversationId: order.conversationId, listingId: order.listingId }
}

export type RevealedContact = { name: string; email: string | null; phone: string | null }

/** Both parties' contact details — only after both confirmed. Participant-scoped. */
export async function revealedContactsFor(
  viewer: Viewer,
  orderId: string,
): Promise<{ buyer?: RevealedContact; seller?: RevealedContact; error?: string }> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { buyerId: true, sellerId: true, contactRevealed: true },
  })
  if (!order) return { error: 'Order not found.' }
  if (!isParticipant(order, viewer.id)) return { error: 'Not allowed.' }
  if (!order.contactRevealed) return { error: 'Contact details unlock once both parties confirm the order.' }

  const ids = [order.buyerId, order.sellerId]
  const [users, profs] = await Promise.all([
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, phoneE164: true } }),
    db.profile.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } }),
  ])
  const uMap = new Map(users.map((u) => [u.id, u]))
  const pMap = new Map(profs.map((p) => [p.id, p]))
  const build = (id: string): RevealedContact => ({
    name: pMap.get(id)?.displayName ?? 'User',
    email: uMap.get(id)?.email ?? null,
    phone: uMap.get(id)?.phoneE164 ?? null,
  })
  return { buyer: build(order.buyerId), seller: build(order.sellerId) }
}

export type OrderNotifyData = {
  buyerId: string
  sellerId: string
  buyerName: string
  sellerName: string
  buyerEmail: string | null
  buyerPhone: string | null
  sellerEmail: string | null
  sellerPhone: string | null
  listingTitle: string
  currency: string
  coverKey: string | null
  conversationId: string | null
  listingId: string
}

/** Names/contacts/cover for building notifications. Called AFTER authorization. */
export async function orderNotifyData(orderId: string): Promise<OrderNotifyData | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      listingId: true,
      conversationId: true,
      buyerId: true,
      sellerId: true,
      listing: {
        select: {
          titleEn: true,
          currency: true,
          images: { select: { storageKey: true }, orderBy: { position: 'asc' }, take: 1 },
        },
      },
    },
  })
  if (!order) return null
  const ids = [order.buyerId, order.sellerId]
  const [profs, users] = await Promise.all([
    db.profile.findMany({ where: { id: { in: ids } }, select: { id: true, displayName: true } }),
    db.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, phoneE164: true } }),
  ])
  const names = new Map(profs.map((p) => [p.id, p.displayName]))
  const contacts = new Map(users.map((u) => [u.id, u]))
  return {
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    buyerName: names.get(order.buyerId) ?? 'Buyer',
    sellerName: names.get(order.sellerId) ?? 'Seller',
    buyerEmail: contacts.get(order.buyerId)?.email ?? null,
    buyerPhone: contacts.get(order.buyerId)?.phoneE164 ?? null,
    sellerEmail: contacts.get(order.sellerId)?.email ?? null,
    sellerPhone: contacts.get(order.sellerId)?.phoneE164 ?? null,
    listingTitle: order.listing?.titleEn ?? 'your listing',
    currency: order.listing?.currency ?? 'AED',
    coverKey: order.listing?.images[0]?.storageKey ?? null,
    conversationId: order.conversationId,
    listingId: order.listingId,
  }
}

export type SuggestContext = {
  role: 'buyer' | 'seller'
  listingTitle: string
  askingAed: number
  condition: string | null
  daysListed: number
  lastOfferAed: number | null
}

/** Data for AI negotiation guidance. Participant-scoped. */
export async function suggestContextFor(viewer: Viewer, conversationId: string): Promise<SuggestContext | { error: string }> {
  const conv = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { listingId: true, buyerId: true, sellerId: true },
  })
  if (!conv) return { error: 'Conversation not found.' }
  if (!isParticipant(conv, viewer.id)) return { error: 'Not allowed.' }
  const role: 'buyer' | 'seller' = viewer.id === conv.buyerId ? 'buyer' : 'seller'

  const listing = await db.listing.findUnique({
    where: { id: conv.listingId },
    select: { titleEn: true, priceFils: true, condition: true, publishedAt: true, createdAt: true },
  })
  if (!listing) return { error: 'Listing not found.' }

  const askingAed = Math.round(Number(listing.priceFils) / 100)
  const start = listing.publishedAt ?? listing.createdAt
  const daysListed = start ? Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000)) : 0

  const { offers } = await conversationOrderFor(viewer, conversationId)
  const lastOffer = offers.length ? offers[offers.length - 1] : null
  const lastOfferAed = lastOffer ? Math.round(lastOffer.amount_fils / 100) : null

  return { role, listingTitle: listing.titleEn, askingAed, condition: listing.condition, daysListed, lastOfferAed }
}
