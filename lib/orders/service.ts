/**
 * lib/orders/service — the negotiation/order flows shared by the web server
 * actions (app/orders/actions.ts) and the mobile API (/api/v1 offers/orders).
 * ===========================================================================
 * Extracted verbatim from the actions: input validation, the Viewer-scoped
 * repository call, analytics, and the notification fan-out live HERE — the
 * action adds getViewer()+revalidatePath, the API route adds bearer auth.
 * Every function returns the ids the caller needs for cache invalidation.
 */
import { getProvider } from '@/lib/ai/provider'
import { aedToFils, formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { dispatch, dispatchAll, type DispatchInput } from '@/lib/notifications/dispatch'
import { track } from '@/lib/analytics'
import * as orders from '@/lib/db/orders'
import { requirePhoneVerified } from '@/lib/authz/verification-guard'
import type { Viewer } from '@/lib/authz/viewer'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const MAX_FILS = 100_000_000_00 // AED 100,000,000 sanity cap

export type OrderServiceResult = {
  ok: boolean
  error?: string
  conversationId?: string | null
  listingId?: string
  /** Set when the action was refused because the viewer's phone isn't verified. */
  needsPhoneVerification?: boolean
}

function imageUrl(coverKey: string | null): string | null {
  return coverKey ? publicUrl(LISTING_IMAGES_BUCKET, coverKey) : null
}
function convLink(conversationId: string | null): string {
  return conversationId ? `/messages/${conversationId}` : '/messages'
}
function ctaUrl(conversationId: string | null): string {
  return conversationId ? `${APP_URL}/messages/${conversationId}` : APP_URL
}

/** Buyer or seller proposes a price. Supersedes any pending offer. */
export async function makeOfferAs(
  viewer: Viewer,
  conversationId: string,
  amountAed: string | number,
): Promise<OrderServiceResult> {
  const fils = aedToFils(amountAed)
  if (fils == null || fils <= 0) return { ok: false, error: 'Enter a valid amount.' }
  if (fils > MAX_FILS) return { ok: false, error: 'That amount is too large.' }

  const res = await orders.makeOfferFor(viewer, conversationId, fils)
  if (!res.ok) return { ok: false, error: res.error }
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
  return { ok: true, conversationId }
}

/** The recipient accepts or declines a pending offer. Counter = makeOffer again. */
export async function respondToOfferAs(
  viewer: Viewer,
  offerId: string,
  action: 'accept' | 'decline',
): Promise<OrderServiceResult> {
  const res = await orders.respondToOfferFor(viewer, offerId, action)
  if (!res.ok) return { ok: false, error: res.error }
  if (res.action === 'accept') {
    track('offer_accepted', { orderId: res.orderId })
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
  return { ok: true, conversationId: res.conversationId }
}

/** Buyer/seller confirms. When BOTH confirm: reveal contacts + listing → reserved. */
export async function confirmOrderAs(viewer: Viewer, orderId: string): Promise<OrderServiceResult> {
  // Confirming an order unlocks both parties' contact details — require a
  // verified phone first (shared web+mobile gate).
  const gate = await requirePhoneVerified(viewer)
  if (!gate.ok) return { ok: false, error: gate.error, needsPhoneVerification: true }

  const res = await orders.confirmOrderFor(viewer, orderId)
  if (!res.ok) return { ok: false, error: res.error }
  if (res.both) track('order_confirmed', { orderId: res.orderId })

  const ctx = await orders.orderNotifyData(res.orderId)
  if (ctx) {
    if (res.both) {
      const priceLabel =
        res.acceptedPriceFils != null ? formatPrice(res.acceptedPriceFils, ctx.currency) : null
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
        email: {
          kind,
          data: {
            listingTitle: ctx.listingTitle,
            listingImageUrl: imageUrl(ctx.coverKey),
            ctaUrl: ctaUrl(ctx.conversationId),
          },
        },
      })
    }
  }
  return { ok: true, conversationId: res.conversationId }
}

/** Either party cancels. Frees the listing if it had been reserved by this order. */
export async function cancelOrderAs(viewer: Viewer, orderId: string): Promise<OrderServiceResult> {
  const res = await orders.cancelOrderFor(viewer, orderId)
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true, conversationId: res.conversationId }
}

/** Seller marks a reserved deal as Sold → listing 'sold', order 'completed'. */
export async function markOrderSoldAs(viewer: Viewer, orderId: string): Promise<OrderServiceResult> {
  const res = await orders.markOrderSoldFor(viewer, orderId)
  if (!res.ok) return { ok: false, error: res.error }
  const { summary } = res

  const ctx = await orders.orderNotifyData(summary.orderId)
  if (ctx) {
    const priceLabel =
      summary.acceptedPriceFils != null ? formatPrice(summary.acceptedPriceFils, ctx.currency) : null
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
  return { ok: true, conversationId: summary.conversationId, listingId: summary.listingId }
}

/** Seller re-activates a reserved listing → listing 'active', order 'cancelled'. */
export async function reactivateListingAs(viewer: Viewer, orderId: string): Promise<OrderServiceResult> {
  const res = await orders.reactivateListingFor(viewer, orderId)
  if (!res.ok) return { ok: false, error: res.error }

  const ctx = await orders.orderNotifyData(orderId)
  if (ctx) {
    const data = {
      listingTitle: ctx.listingTitle,
      listingImageUrl: imageUrl(ctx.coverKey),
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
  return { ok: true, conversationId: res.conversationId, listingId: res.listingId }
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
export async function suggestOfferAs(
  viewer: Viewer,
  conversationId: string,
): Promise<{ suggestion?: NegotiationSuggestion; error?: string }> {
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
        marketAvgAed:
          raw.market_average_aed && raw.market_average_aed > 0 ? Math.round(raw.market_average_aed) : null,
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
