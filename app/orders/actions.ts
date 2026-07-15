'use server'

/**
 * Order/offer server actions — thin wrappers over lib/orders/service.ts
 * (shared with the mobile API): getViewer() + the service call +
 * revalidatePath. All business logic, validation, and notification fan-out
 * live in the service.
 */
import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import {
  makeOfferAs,
  respondToOfferAs,
  confirmOrderAs,
  cancelOrderAs,
  markOrderSoldAs,
  reactivateListingAs,
  suggestOfferAs,
  type NegotiationSuggestion,
  type OrderServiceResult,
} from '@/lib/orders/service'
import * as orders from '@/lib/db/orders'

type Result = { ok?: boolean; error?: string }

export type { NegotiationSuggestion }

function touchAndRevalidate(conversationId: string | null | undefined) {
  if (conversationId) revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  revalidatePath('/account/orders')
  revalidatePath('/account/purchases')
}

function finish(res: OrderServiceResult, alsoListing = false): Result {
  if (!res.ok) return { error: res.error }
  touchAndRevalidate(res.conversationId)
  if (alsoListing && res.listingId) {
    revalidatePath(`/listing/${res.listingId}`)
    revalidatePath('/')
  }
  return { ok: true }
}

/** Buyer or seller proposes a price. Supersedes any pending offer. */
export async function makeOffer(conversationId: string, amountAed: string | number): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return finish(await makeOfferAs(viewer, conversationId, amountAed))
}

/** The recipient accepts or declines a pending offer. Counter = makeOffer again. */
export async function respondToOffer(offerId: string, action: 'accept' | 'decline'): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return finish(await respondToOfferAs(viewer, offerId, action))
}

/** Buyer/seller confirms. When BOTH confirm: reveal contacts + listing → reserved. */
export async function confirmOrder(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return finish(await confirmOrderAs(viewer, orderId))
}

/** Either party cancels. Frees the listing if it had been reserved by this order. */
export async function cancelOrder(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return finish(await cancelOrderAs(viewer, orderId))
}

/** Seller marks a reserved deal as Sold → listing 'sold', order 'completed'. */
export async function markOrderSold(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return finish(await markOrderSoldAs(viewer, orderId), true)
}

/** Seller re-activates a reserved listing → listing 'active', order 'cancelled'. */
export async function reactivateListing(orderId: string): Promise<Result> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return finish(await reactivateListingAs(viewer, orderId), true)
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

/** AI pricing guidance. Advisory only — never sends an offer. Always returns something. */
export async function suggestOffer(
  conversationId: string,
): Promise<{ suggestion?: NegotiationSuggestion; error?: string }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  return suggestOfferAs(viewer, conversationId)
}
