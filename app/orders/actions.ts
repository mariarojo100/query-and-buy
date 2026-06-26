'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { getProvider } from '@/lib/ai/provider'
import { aedToFils, formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { dispatch, dispatchAll, type DispatchInput } from '@/lib/notifications/dispatch'
import { getConversationOrder, type OrderView } from '@/lib/orders/queries'
import { track } from '@/lib/analytics'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

type NotifyCtx = {
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
  imageUrl: string | null
  conversationId: string | null
  link: string
}

/** Gather names/listing/image once for building notifications + emails. */
async function notifyContext(orderId: string): Promise<NotifyCtx | null> {
  let admin
  try {
    admin = createServiceClient()
  } catch {
    return null
  }
  const { data: order } = await admin
    .from('orders')
    .select('listing_id, conversation_id, buyer_id, seller_id')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return null
  const o = order as {
    listing_id: string
    conversation_id: string | null
    buyer_id: string
    seller_id: string
  }
  const [{ data: listing }, { data: profs }, { data: usrs }, { data: img }] = await Promise.all([
    admin.from('listings').select('title_en, currency').eq('id', o.listing_id).maybeSingle(),
    admin.from('profiles').select('id, display_name').in('id', [o.buyer_id, o.seller_id]),
    admin.from('users').select('id, email, phone_e164').in('id', [o.buyer_id, o.seller_id]),
    admin
      .from('listing_images')
      .select('storage_key')
      .eq('listing_id', o.listing_id)
      .order('position')
      .limit(1)
      .maybeSingle(),
  ])
  const names = new Map(
    ((profs ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
  )
  const contacts = new Map(
    ((usrs ?? []) as { id: string; email: string | null; phone_e164: string | null }[]).map((u) => [
      u.id,
      u,
    ]),
  )
  const key = (img as { storage_key?: string } | null)?.storage_key
  return {
    buyerId: o.buyer_id,
    sellerId: o.seller_id,
    buyerName: names.get(o.buyer_id) ?? 'Buyer',
    sellerName: names.get(o.seller_id) ?? 'Seller',
    buyerEmail: contacts.get(o.buyer_id)?.email ?? null,
    buyerPhone: contacts.get(o.buyer_id)?.phone_e164 ?? null,
    sellerEmail: contacts.get(o.seller_id)?.email ?? null,
    sellerPhone: contacts.get(o.seller_id)?.phone_e164 ?? null,
    listingTitle: (listing as { title_en?: string } | null)?.title_en ?? 'your listing',
    currency: (listing as { currency?: string } | null)?.currency ?? 'AED',
    imageUrl: key ? publicUrl(LISTING_IMAGES_BUCKET, key) : null,
    conversationId: o.conversation_id,
    link: o.conversation_id ? `${APP_URL}/messages/${o.conversation_id}` : APP_URL,
  }
}

function convLink(ctx: NotifyCtx): string {
  return ctx.conversationId ? `/messages/${ctx.conversationId}` : '/messages'
}

type Result = { ok?: boolean; error?: string }

const ORDER_COLS =
  'id, listing_id, conversation_id, buyer_id, seller_id, accepted_price_fils, status, buyer_confirmed, seller_confirmed, contact_revealed'
const MAX_FILS = 100_000_000_00 // AED 100,000,000 sanity cap
const CLOSED: string[] = ['confirmed', 'cancelled', 'completed']

type Conv = { id: string; listing_id: string; buyer_id: string; seller_id: string }

async function authed() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

async function loadConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
): Promise<Conv | null> {
  const { data } = await supabase
    .from('conversations')
    .select('id, listing_id, buyer_id, seller_id')
    .eq('id', conversationId)
    .maybeSingle()
  return (data as Conv) ?? null
}

/** Get-or-create the order for a conversation. Only the buyer may create it (RLS). */
async function ensureOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conv: Conv,
  userId: string,
): Promise<{ order?: OrderView; error?: string }> {
  const { data: existing } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .eq('conversation_id', conv.id)
    .maybeSingle()
  if (existing) return { order: existing as OrderView }

  if (userId !== conv.buyer_id)
    return { error: 'The buyer needs to start the negotiation first.' }

  const { data: created, error } = await supabase
    .from('orders')
    .insert({
      listing_id: conv.listing_id,
      conversation_id: conv.id,
      buyer_id: conv.buyer_id,
      seller_id: conv.seller_id,
      status: 'negotiating',
    })
    .select(ORDER_COLS)
    .single()
  if (error || !created) return { error: error?.message ?? 'Could not start the order.' }
  return { order: created as OrderView }
}

function touchAndRevalidate(conversationId: string | null) {
  if (conversationId) revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  revalidatePath('/account/orders')
  revalidatePath('/account/purchases')
}

/** Buyer or seller proposes a price. Supersedes any pending offer. */
export async function makeOffer(conversationId: string, amountAed: string | number): Promise<Result> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const fils = aedToFils(amountAed)
  if (fils == null || fils <= 0) return { error: 'Enter a valid amount.' }
  if (fils > MAX_FILS) return { error: 'That amount is too large.' }

  const conv = await loadConversation(supabase, conversationId)
  if (!conv) return { error: 'Conversation not found.' }
  if (user.id !== conv.buyer_id && user.id !== conv.seller_id) return { error: 'Not allowed.' }

  const { order, error } = await ensureOrder(supabase, conv, user.id)
  if (error || !order) return { error: error ?? 'Could not start the order.' }
  if (CLOSED.includes(order.status)) return { error: 'This order is closed.' }

  await supabase
    .from('offers')
    .update({ status: 'superseded' })
    .eq('order_id', order.id)
    .eq('status', 'pending')

  const { error: offErr } = await supabase.from('offers').insert({
    order_id: order.id,
    conversation_id: conv.id,
    sender_id: user.id,
    amount_fils: fils,
    status: 'pending',
  })
  if (offErr) return { error: offErr.message }
  track('offer_sent', { orderId: order.id })

  await supabase
    .from('orders')
    .update({ status: 'offer_sent', buyer_confirmed: false, seller_confirmed: false })
    .eq('id', order.id)
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conv.id)

  const ctx = await notifyContext(order.id)
  if (ctx) {
    const senderIsBuyer = user.id === ctx.buyerId
    const recipientId = senderIsBuyer ? ctx.sellerId : ctx.buyerId
    const kind = senderIsBuyer ? 'offer_received' : 'counter_received'
    const priceLabel = formatPrice(fils, ctx.currency)
    await dispatch({
      recipientId,
      type: kind,
      title: senderIsBuyer ? `New offer · ${priceLabel}` : `Counter offer · ${priceLabel}`,
      body: `${senderIsBuyer ? ctx.buyerName : ctx.sellerName} · ${ctx.listingTitle}`,
      link: convLink(ctx),
      email: {
        kind,
        data: {
          listingTitle: ctx.listingTitle,
          listingImageUrl: ctx.imageUrl,
          priceLabel,
          buyerName: ctx.buyerName,
          sellerName: ctx.sellerName,
          ctaUrl: ctx.link,
        },
      },
    })
  }

  touchAndRevalidate(conversationId)
  return { ok: true }
}

/** The recipient accepts or declines a pending offer. Counter = makeOffer again. */
export async function respondToOffer(
  offerId: string,
  action: 'accept' | 'decline',
): Promise<Result> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const { data: offerRow } = await supabase
    .from('offers')
    .select('id, order_id, sender_id, amount_fils, status')
    .eq('id', offerId)
    .maybeSingle()
  const offer = offerRow as
    | { id: string; order_id: string; sender_id: string; amount_fils: number; status: string }
    | null
  if (!offer) return { error: 'Offer not found.' }
  if (offer.status !== 'pending') return { error: 'This offer is no longer active.' }
  if (offer.sender_id === user.id) return { error: "You can't respond to your own offer." }

  const { data: orderRow } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .eq('id', offer.order_id)
    .maybeSingle()
  const order = orderRow as OrderView | null
  if (!order) return { error: 'Order not found.' }
  if (user.id !== order.buyer_id && user.id !== order.seller_id) return { error: 'Not allowed.' }

  if (action === 'accept') {
    await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId)
    await supabase
      .from('orders')
      .update({
        status: 'offer_accepted',
        accepted_price_fils: offer.amount_fils,
        buyer_confirmed: false,
        seller_confirmed: false,
        contact_revealed: false,
      })
      .eq('id', order.id)
    track('offer_accepted', { orderId: order.id })
  } else {
    await supabase.from('offers').update({ status: 'declined' }).eq('id', offerId)
    await supabase.from('orders').update({ status: 'negotiating' }).eq('id', order.id)
  }

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', order.conversation_id ?? '')

  if (action === 'accept') {
    const ctx = await notifyContext(order.id)
    if (ctx) {
      const priceLabel = formatPrice(offer.amount_fils, ctx.currency)
      const data = {
        listingTitle: ctx.listingTitle,
        listingImageUrl: ctx.imageUrl,
        priceLabel,
        buyerName: ctx.buyerName,
        sellerName: ctx.sellerName,
        ctaUrl: ctx.link,
      }
      await dispatchAll(
        [ctx.buyerId, ctx.sellerId].map((rid) => ({
          recipientId: rid,
          type: 'offer_accepted',
          title: `Offer accepted · ${priceLabel}`,
          body: ctx.listingTitle,
          link: convLink(ctx),
          email: { kind: 'offer_accepted', data },
        })),
      )
    }
  }

  touchAndRevalidate(order.conversation_id)
  return { ok: true }
}

/** Buyer/seller confirms. When BOTH confirm: reveal contacts + listing → reserved. */
export async function confirmOrder(orderId: string): Promise<Result> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const { data: orderRow } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .eq('id', orderId)
    .maybeSingle()
  const order = orderRow as OrderView | null
  if (!order) return { error: 'Order not found.' }
  if (user.id !== order.buyer_id && user.id !== order.seller_id) return { error: 'Not allowed.' }
  if (order.status !== 'offer_accepted' && order.status !== 'awaiting_confirmation')
    return { error: 'There is no accepted offer to confirm yet.' }

  const isBuyer = user.id === order.buyer_id
  const buyerConfirmed = order.buyer_confirmed || isBuyer
  const sellerConfirmed = order.seller_confirmed || !isBuyer
  const both = buyerConfirmed && sellerConfirmed

  await supabase
    .from('orders')
    .update({
      buyer_confirmed: buyerConfirmed,
      seller_confirmed: sellerConfirmed,
      status: both ? 'confirmed' : 'awaiting_confirmation',
      contact_revealed: both ? true : order.contact_revealed,
    })
    .eq('id', order.id)

  if (both) {
    // The confirming party may be the buyer (not the listing owner), so the
    // listing→reserved transition is done with the service client. Only an
    // 'active' listing is reserved — never clobber sold/deleted.
    const admin = createServiceClient()
    await admin
      .from('listings')
      .update({ status: 'reserved' })
      .eq('id', order.listing_id)
      .eq('status', 'active')
    track('order_confirmed', { orderId: order.id })
  }

  const ctx = await notifyContext(order.id)
  if (ctx) {
    if (both) {
      const priceLabel =
        order.accepted_price_fils != null
          ? formatPrice(order.accepted_price_fils, ctx.currency)
          : null
      const baseData = {
        listingTitle: ctx.listingTitle,
        listingImageUrl: ctx.imageUrl,
        priceLabel,
        buyerName: ctx.buyerName,
        sellerName: ctx.sellerName,
        ctaUrl: ctx.link,
      }
      const inputs: DispatchInput[] = []
      for (const rid of [ctx.buyerId, ctx.sellerId]) {
        const buyerRecipient = rid === ctx.buyerId
        inputs.push({
          recipientId: rid,
          type: 'order_confirmed',
          title: 'Deal confirmed',
          body: `${ctx.listingTitle}${priceLabel ? ` · ${priceLabel}` : ''}`,
          link: convLink(ctx),
          email: { kind: 'order_confirmed', data: baseData },
        })
        inputs.push({
          recipientId: rid,
          type: 'contact_unlocked',
          title: 'Contact details unlocked',
          body: ctx.listingTitle,
          link: convLink(ctx),
          email: {
            kind: 'contact_unlocked',
            data: {
              listingTitle: ctx.listingTitle,
              listingImageUrl: ctx.imageUrl,
              ctaUrl: ctx.link,
              // each party sees the OTHER party's contact
              contactPhone: buyerRecipient ? ctx.sellerPhone : ctx.buyerPhone,
              contactEmail: buyerRecipient ? ctx.sellerEmail : ctx.buyerEmail,
            },
          },
        })
      }
      await dispatchAll(inputs)
    } else {
      const recipientId = isBuyer ? ctx.sellerId : ctx.buyerId
      const kind = isBuyer ? 'buyer_confirmed' : 'seller_confirmed'
      await dispatch({
        recipientId,
        type: kind,
        title: isBuyer ? 'The buyer confirmed' : 'The seller confirmed',
        body: ctx.listingTitle,
        link: convLink(ctx),
        email: {
          kind,
          data: { listingTitle: ctx.listingTitle, listingImageUrl: ctx.imageUrl, ctaUrl: ctx.link },
        },
      })
    }
  }

  touchAndRevalidate(order.conversation_id)
  return { ok: true }
}

/** Either party cancels. Frees the listing if it had been reserved by this order. */
export async function cancelOrder(orderId: string): Promise<Result> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const { data: orderRow } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .eq('id', orderId)
    .maybeSingle()
  const order = orderRow as OrderView | null
  if (!order) return { error: 'Order not found.' }
  if (user.id !== order.buyer_id && user.id !== order.seller_id) return { error: 'Not allowed.' }
  if (order.status === 'cancelled' || order.status === 'completed')
    return { error: 'This order is already closed.' }

  const wasReserved = order.contact_revealed || order.status === 'confirmed'
  await supabase
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', order.id)

  if (wasReserved) {
    const admin = createServiceClient()
    await admin
      .from('listings')
      .update({ status: 'active' })
      .eq('id', order.listing_id)
      .eq('status', 'reserved')
  }

  touchAndRevalidate(order.conversation_id)
  return { ok: true }
}

/** Seller marks a reserved deal as Sold → listing 'sold', order 'completed'. */
export async function markOrderSold(orderId: string): Promise<Result> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const { data: orderRow } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .eq('id', orderId)
    .maybeSingle()
  const order = orderRow as OrderView | null
  if (!order) return { error: 'Order not found.' }
  if (user.id !== order.seller_id) return { error: 'Only the seller can mark this as sold.' }
  if (order.status !== 'confirmed')
    return { error: 'Only a confirmed, reserved order can be completed.' }

  // Seller owns the listing → owner RLS + explicit seller filter.
  const { data: updated, error: lErr } = await supabase
    .from('listings')
    .update({ status: 'sold' })
    .eq('id', order.listing_id)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle()
  if (lErr) return { error: lErr.message }
  if (!updated) return { error: 'Listing not found.' }

  await supabase
    .from('orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', order.id)

  const ctx = await notifyContext(order.id)
  if (ctx) {
    const priceLabel =
      order.accepted_price_fils != null ? formatPrice(order.accepted_price_fils, ctx.currency) : null
    const data = {
      listingTitle: ctx.listingTitle,
      listingImageUrl: ctx.imageUrl,
      priceLabel,
      buyerName: ctx.buyerName,
      sellerName: ctx.sellerName,
      ctaUrl: ctx.link,
    }
    await dispatchAll(
      [ctx.buyerId, ctx.sellerId].map((rid) => ({
        recipientId: rid,
        type: 'item_sold',
        title: 'Transaction completed',
        body: `${ctx.listingTitle}${priceLabel ? ` · ${priceLabel}` : ''}`,
        link: convLink(ctx),
        email: { kind: 'item_sold', data },
      })),
    )
  }

  touchAndRevalidate(order.conversation_id)
  revalidatePath(`/listing/${order.listing_id}`)
  revalidatePath('/')
  return { ok: true }
}

/** Seller re-activates a reserved listing → listing 'active', order 'cancelled'. */
export async function reactivateListing(orderId: string): Promise<Result> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const { data: orderRow } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .eq('id', orderId)
    .maybeSingle()
  const order = orderRow as OrderView | null
  if (!order) return { error: 'Order not found.' }
  if (user.id !== order.seller_id) return { error: 'Only the seller can re-activate this listing.' }
  if (order.status !== 'confirmed')
    return { error: 'Only a reserved listing can be re-activated.' }

  const { data: updated, error: lErr } = await supabase
    .from('listings')
    .update({ status: 'active' })
    .eq('id', order.listing_id)
    .eq('seller_id', user.id)
    .select('id')
    .maybeSingle()
  if (lErr) return { error: lErr.message }
  if (!updated) return { error: 'Listing not found.' }

  await supabase
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', order.id)

  const ctx = await notifyContext(order.id)
  if (ctx) {
    const data = {
      listingTitle: ctx.listingTitle,
      listingImageUrl: ctx.imageUrl,
      // "Browse Similar Listings" → marketplace home
      ctaUrl: `${APP_URL}/`,
    }
    await dispatchAll(
      [ctx.buyerId, ctx.sellerId].map((rid) => ({
        recipientId: rid,
        type: 'reservation_cancelled',
        title: 'Reservation cancelled',
        body: ctx.listingTitle,
        link: '/',
        email: { kind: 'reservation_cancelled', data },
      })),
    )
  }

  touchAndRevalidate(order.conversation_id)
  revalidatePath(`/listing/${order.listing_id}`)
  revalidatePath('/')
  return { ok: true }
}

export type RevealedContact = {
  name: string
  email: string | null
  phone: string | null
}

/** Returns both parties' contact details — only after both confirmed. */
export async function getRevealedContacts(
  orderId: string,
): Promise<{ buyer?: RevealedContact; seller?: RevealedContact; error?: string }> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const { data: orderRow } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_id, contact_revealed')
    .eq('id', orderId)
    .maybeSingle()
  const order = orderRow as
    | { id: string; buyer_id: string; seller_id: string; contact_revealed: boolean }
    | null
  if (!order) return { error: 'Order not found.' }
  if (user.id !== order.buyer_id && user.id !== order.seller_id) return { error: 'Not allowed.' }
  if (!order.contact_revealed)
    return { error: 'Contact details unlock once both parties confirm the order.' }

  const admin = createServiceClient()
  const ids = [order.buyer_id, order.seller_id]
  const [{ data: users }, { data: profiles }] = await Promise.all([
    admin.from('users').select('id, email, phone_e164').in('id', ids),
    admin.from('profiles').select('id, display_name').in('id', ids),
  ])
  const uMap = new Map(
    ((users ?? []) as { id: string; email: string | null; phone_e164: string | null }[]).map((u) => [
      u.id,
      u,
    ]),
  )
  const pMap = new Map(
    ((profiles ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p]),
  )
  const build = (id: string): RevealedContact => ({
    name: pMap.get(id)?.display_name ?? 'User',
    email: uMap.get(id)?.email ?? null,
    phone: uMap.get(id)?.phone_e164 ?? null,
  })
  return { buyer: build(order.buyer_id), seller: build(order.seller_id) }
}

export type NegotiationSuggestion = {
  suggestedAed: number
  marketAvgAed: number | null
  reasons: string[]
  role: 'buyer' | 'seller'
}

function heuristic(role: 'buyer' | 'seller', askingAed: number, lastOfferAed: number | null): number {
  if (role === 'buyer') return Math.max(1, Math.round(askingAed * 0.88))
  if (lastOfferAed && lastOfferAed < askingAed) return Math.round((askingAed + lastOfferAed) / 2)
  return Math.round(askingAed * 0.95)
}

function defaultReasons(role: 'buyer' | 'seller', days: number): string[] {
  const base =
    role === 'buyer'
      ? ['Fair offer below asking price', 'Realistic opening position']
      : ['Close to your asking price', 'Reflects strong market value']
  if (days >= 14) base.push(`Listed ${days} days ago`)
  return base.slice(0, 3)
}

/** AI pricing guidance. Advisory only — never sends an offer. Always returns something. */
export async function suggestOffer(
  conversationId: string,
): Promise<{ suggestion?: NegotiationSuggestion; error?: string }> {
  const { supabase, user } = await authed()
  if (!user) return { error: 'You must be signed in.' }

  const conv = await loadConversation(supabase, conversationId)
  if (!conv) return { error: 'Conversation not found.' }
  if (user.id !== conv.buyer_id && user.id !== conv.seller_id) return { error: 'Not allowed.' }
  const role: 'buyer' | 'seller' = user.id === conv.buyer_id ? 'buyer' : 'seller'

  const { data: listingRow } = await supabase
    .from('listings')
    .select('title_en, price_fils, condition, published_at, created_at')
    .eq('id', conv.listing_id)
    .maybeSingle()
  const listing = listingRow as
    | {
        title_en: string
        price_fils: number
        condition: string | null
        published_at: string | null
        created_at: string | null
      }
    | null
  if (!listing) return { error: 'Listing not found.' }

  const askingAed = Math.round((listing.price_fils ?? 0) / 100)
  const start = listing.published_at ?? listing.created_at
  const daysListed = start
    ? Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86_400_000))
    : 0

  const { offers } = await getConversationOrder(conversationId)
  const lastOffer = offers.length ? offers[offers.length - 1] : null
  const lastOfferAed = lastOffer ? Math.round(lastOffer.amount_fils / 100) : null

  try {
    const raw = await getProvider().suggestNegotiation({
      role,
      listingTitle: listing.title_en,
      askingPriceAed: askingAed,
      condition: listing.condition,
      daysListed,
      lastOfferAed,
    })
    const suggested =
      raw.suggested_offer_aed && raw.suggested_offer_aed > 0
        ? Math.round(raw.suggested_offer_aed)
        : heuristic(role, askingAed, lastOfferAed)
    const reasons = (raw.reasons ?? []).map((r) => String(r).trim()).filter(Boolean).slice(0, 3)
    return {
      suggestion: {
        suggestedAed: suggested,
        marketAvgAed:
          raw.market_average_aed && raw.market_average_aed > 0
            ? Math.round(raw.market_average_aed)
            : null,
        reasons: reasons.length ? reasons : defaultReasons(role, daysListed),
        role,
      },
    }
  } catch {
    return {
      suggestion: {
        suggestedAed: heuristic(role, askingAed, lastOfferAed),
        marketAvgAed: null,
        reasons: defaultReasons(role, daysListed),
        role,
      },
    }
  }
}
