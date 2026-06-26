import { createClient } from '@/utils/supabase/server'

export type OrderStatus =
  | 'negotiating'
  | 'offer_sent'
  | 'offer_accepted'
  | 'awaiting_confirmation'
  | 'confirmed'
  | 'cancelled'
  | 'completed'

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'countered' | 'superseded'

export type Offer = {
  id: string
  sender_id: string
  amount_fils: number
  status: OfferStatus
  created_at: string
}

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

const ORDER_COLS =
  'id, listing_id, conversation_id, buyer_id, seller_id, accepted_price_fils, status, buyer_confirmed, seller_confirmed, contact_revealed'

const LISTING_EMBED =
  'listing:listings(id, title_en, price_fils, currency, images:listing_images(storage_key, position))'

type RawImage = { storage_key: string; position: number }

function coverKey(images: RawImage[] | null | undefined): string | null {
  if (!images?.length) return null
  return [...images].sort((a, b) => a.position - b.position)[0].storage_key
}

function asListing(raw: unknown): OrderListItem['listing'] {
  const l = (Array.isArray(raw) ? raw[0] : raw) as
    | { id: string; title_en: string; price_fils: number; currency: string; images: RawImage[] | null }
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

/** The order (if any) + its full offer history for a conversation. RLS scopes to participants. */
export async function getConversationOrder(conversationId: string): Promise<ConversationOrder> {
  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .eq('conversation_id', conversationId)
    .maybeSingle()
  if (!order) return { order: null, offers: [] }

  const o = order as OrderView
  const { data: offers } = await supabase
    .from('offers')
    .select('id, sender_id, amount_fils, status, created_at')
    .eq('order_id', o.id)
    .order('created_at', { ascending: true })
  return { order: o, offers: (offers ?? []) as Offer[] }
}

async function getOrdersFor(role: 'buyer' | 'seller'): Promise<OrderListItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const col = role === 'buyer' ? 'buyer_id' : 'seller_id'
  const { data } = await supabase
    .from('orders')
    .select(`${ORDER_COLS}, updated_at, ${LISTING_EMBED}`)
    .eq(col, user.id)
    .order('updated_at', { ascending: false })

  const rows = (data ?? []) as Array<
    OrderView & { updated_at: string; listing: unknown }
  >
  const otherIds = [
    ...new Set(rows.map((r) => (role === 'buyer' ? r.seller_id : r.buyer_id))),
  ]

  const people = new Map<string, OrderListItem['other']>()
  if (otherIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username')
      .in('id', otherIds)
    for (const p of (profiles ?? []) as NonNullable<OrderListItem['other']>[]) people.set(p.id, p)
  }

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    acceptedPriceFils: r.accepted_price_fils,
    contactRevealed: r.contact_revealed,
    buyerConfirmed: r.buyer_confirmed,
    sellerConfirmed: r.seller_confirmed,
    conversationId: r.conversation_id,
    updatedAt: r.updated_at,
    listing: asListing(r.listing),
    other: people.get(role === 'buyer' ? r.seller_id : r.buyer_id) ?? null,
  }))
}

/** Orders where the current user is the seller (Seller dashboard → Orders). */
export const getSellerOrders = () => getOrdersFor('seller')
/** Orders where the current user is the buyer (Buyer dashboard → My Purchases). */
export const getBuyerOrders = () => getOrdersFor('buyer')
