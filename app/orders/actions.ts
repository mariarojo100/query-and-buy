'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { getProvider } from '@/lib/ai/provider'
import { aedToFils, formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { dispatch, dispatchAll, type DispatchInput } from '@/lib/notifications/dispatch'
import { track } from '@/lib/analytics'
import * as orders from '@/lib/db/orders'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const MAX_FILS = 100_000_000_00 // AED 100,000,000 sanity cap

type Result = { ok?: boolean; error?: string }

function imageUrl(coverKey: string | null): string | null {
  return coverKey ? publicUrl(LISTING_IMAGES_BUCKET, coverKey) : null
}
function convLink(conversationId: string | null): string {
  return conversationId ? `/messages/${conversationId}` : '/messages'
}
function ctaUrl(conversationId: string | null): string {
  return conversationId ? `${APP_URL}/messages/${conversationId}` : APP_URL
}
function touchAndRevalidate(conversationId: string | null) {
  if (conversationId) revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  revalidatePath('/account/orders')
  revalidatePath('/account/purchases')
}

/** Buyer or seller proposes a price. Supersedes any pending offer. */
export async function makeOffer(conversationId: string, amountAed: string | number): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const fils = aedToFils(amountAed)
  if (fils == null || fils <= 0) return { error: 'Enter a valid amount.' }
  if (fils > MAX_FILS) return { error: 'That amount is too large.' }

  const res = await orders.makeOfferFor(viewer, conversationId, fils)
  if (!res.ok) return { error: res.error }
  track('offer_sent', { orderId: res.orderId })

  const ctx = await orders.orderNotifyData(res.orderId)
  if (ctx) {
    const senderIsBuyer = res.senderIsBuyer
    const recipientId = senderIsBuyer ? ctx.sellerId : ctx.buyerId
    const kind = senderIsBuyer ? 'offer_received' : 'counter_received'
    const priceLabel = formatPrice(fils, ctx.currency)
    await dispatch({
      recipientId,
      type: kind,
      title: senderIsBuyer ? `New offer · ${priceLabel}` : `Counter offer · ${priceLabel}`,
      body: `${senderIsBuyer ? ctx.buyerName : ctx.sellerName} · ${ctx.listingTitle}`,
      link: convLink(ctx.conversationId),
      email: {
        kind,
        data: {
          listingTitle: ctx.listingTitle,
          listingImageUrl: imageUrl(ctx.coverKey),
          priceLabel,
          buyerName: ctx.buyerName,
          sellerName: ctx.sellerName,
          ctaUrl: ctaUrl(ctx.conversationId),
        },
      },
    })
  }
  touchAndRevalidate(conversationId)
  return { ok: true }
}

/** The recipient accepts or declines a pending offer. Counter = makeOffer again. */
export async function respondToOffer(offerId: string, action: 'accept' | 'decline'): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const res = await orders.respondToOfferFor(viewer, offerId, action)
  if (!res.ok) return { error: res.error }
  if (res.action === 'accept') track('offer_accepted', { orderId: res.orderId })

  if (res.action === 'accept') {
    const ctx = await orders.orderNotifyData(res.orderId)
    if (ctx) {
      const priceLabel = formatPrice(res.amountFils, ctx.currency)
      const data = {
        listingTitle: ctx.listingTitle,
        listingImageUrl: imageUrl(ctx.coverKey),
        priceLabel,
        buyerName: ctx.buyerName,
        sellerName: ctx.sellerName,
        ctaUrl: ctaUrl(ctx.conversationId),
      }
      await dispatchAll(
        [ctx.buyerId, ctx.sellerId].map((rid) => ({
          recipientId: rid,
          type: 'offer_accepted',
          title: `Offer accepted · ${priceLabel}`,
          body: ctx.listingTitle,
          link: convLink(ctx.conversationId),
          email: { kind: 'offer_accepted', data },
        })),
      )
    }
  }
  touchAndRevalidate(res.conversationId)
  return { ok: true }
}

/** Buyer/seller confirms. When BOTH confirm: reveal contacts + listing → reserved. */
export async function confirmOrder(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const res = await orders.confirmOrderFor(viewer, orderId)
  if (!res.ok) return { error: res.error }
  if (res.both) track('order_confirmed', { orderId: res.orderId })

  const ctx = await orders.orderNotifyData(res.orderId)
  if (ctx) {
    if (res.both) {
      const priceLabel = res.acceptedPriceFils != null ? formatPrice(res.acceptedPriceFils, ctx.currency) : null
      const baseData = {
        listingTitle: ctx.listingTitle,
        listingImageUrl: imageUrl(ctx.coverKey),
        priceLabel,
        buyerName: ctx.buyerName,
        sellerName: ctx.sellerName,
        ctaUrl: ctaUrl(ctx.conversationId),
      }
      const inputs: DispatchInput[] = []
      for (const rid of [ctx.buyerId, ctx.sellerId]) {
        const buyerRecipient = rid === ctx.buyerId
        inputs.push({
          recipientId: rid,
          type: 'order_confirmed',
          title: 'Deal confirmed',
          body: `${ctx.listingTitle}${priceLabel ? ` · ${priceLabel}` : ''}`,
          link: convLink(ctx.conversationId),
          email: { kind: 'order_confirmed', data: baseData },
        })
        inputs.push({
          recipientId: rid,
          type: 'contact_unlocked',
          title: 'Contact details unlocked',
          body: ctx.listingTitle,
          link: convLink(ctx.conversationId),
          email: {
            kind: 'contact_unlocked',
            data: {
              listingTitle: ctx.listingTitle,
              listingImageUrl: imageUrl(ctx.coverKey),
              ctaUrl: ctaUrl(ctx.conversationId),
              // each party sees the OTHER party's contact
              contactPhone: buyerRecipient ? ctx.sellerPhone : ctx.buyerPhone,
              contactEmail: buyerRecipient ? ctx.sellerEmail : ctx.buyerEmail,
            },
          },
        })
      }
      await dispatchAll(inputs)
    } else {
      const recipientId = res.isBuyer ? ctx.sellerId : ctx.buyerId
      const kind = res.isBuyer ? 'buyer_confirmed' : 'seller_confirmed'
      await dispatch({
        recipientId,
        type: kind,
        title: res.isBuyer ? 'The buyer confirmed' : 'The seller confirmed',
        body: ctx.listingTitle,
        link: convLink(ctx.conversationId),
        email: { kind, data: { listingTitle: ctx.listingTitle, listingImageUrl: imageUrl(ctx.coverKey), ctaUrl: ctaUrl(ctx.conversationId) } },
      })
    }
  }
  touchAndRevalidate(res.conversationId)
  return { ok: true }
}

/** Either party cancels. Frees the listing if it had been reserved by this order. */
export async function cancelOrder(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  const res = await orders.cancelOrderFor(viewer, orderId)
  if (!res.ok) return { error: res.error }
  touchAndRevalidate(res.conversationId)
  return { ok: true }
}

/** Seller marks a reserved deal as Sold → listing 'sold', order 'completed'. */
export async function markOrderSold(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  const res = await orders.markOrderSoldFor(viewer, orderId)
  if (!res.ok) return { error: res.error }
  const { summary } = res

  const ctx = await orders.orderNotifyData(summary.orderId)
  if (ctx) {
    const priceLabel = summary.acceptedPriceFils != null ? formatPrice(summary.acceptedPriceFils, ctx.currency) : null
    const data = {
      listingTitle: ctx.listingTitle,
      listingImageUrl: imageUrl(ctx.coverKey),
      priceLabel,
      buyerName: ctx.buyerName,
      sellerName: ctx.sellerName,
      ctaUrl: ctaUrl(ctx.conversationId),
    }
    await dispatchAll(
      [ctx.buyerId, ctx.sellerId].map((rid) => ({
        recipientId: rid,
        type: 'item_sold',
        title: 'Transaction completed',
        body: `${ctx.listingTitle}${priceLabel ? ` · ${priceLabel}` : ''}`,
        link: convLink(ctx.conversationId),
        email: { kind: 'item_sold', data },
      })),
    )
  }
  touchAndRevalidate(summary.conversationId)
  revalidatePath(`/listing/${summary.listingId}`)
  revalidatePath('/')
  return { ok: true }
}

/** Seller re-activates a reserved listing → listing 'active', order 'cancelled'. */
export async function reactivateListing(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  const res = await orders.reactivateListingFor(viewer, orderId)
  if (!res.ok) return { error: res.error }

  const ctx = await orders.orderNotifyData(orderId)
  if (ctx) {
    const data = { listingTitle: ctx.listingTitle, listingImageUrl: imageUrl(ctx.coverKey), ctaUrl: `${APP_URL}/` }
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
  touchAndRevalidate(res.conversationId)
  revalidatePath(`/listing/${res.listingId}`)
  revalidatePath('/')
  return { ok: true }
}

export type RevealedContact = orders.RevealedContact

/** Returns both parties' contact details — only after both confirmed. */
export async function getRevealedContacts(
  orderId: string,
): Promise<{ buyer?: RevealedContact; seller?: RevealedContact; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return orders.revealedContactsFor(viewer, orderId)
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
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const ctx = await orders.suggestContextFor(viewer, conversationId)
  if ('error' in ctx) return { error: ctx.error }
  const { role, askingAed, daysListed, lastOfferAed } = ctx

  try {
    const raw = await getProvider().suggestNegotiation({
      role,
      listingTitle: ctx.listingTitle,
      askingPriceAed: askingAed,
      condition: ctx.condition,
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
        marketAvgAed: raw.market_average_aed && raw.market_average_aed > 0 ? Math.round(raw.market_average_aed) : null,
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
