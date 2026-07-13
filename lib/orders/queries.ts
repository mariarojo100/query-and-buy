import { getViewer } from '@/lib/auth/session'
import * as repo from '@/lib/db/orders'

export type {
  OrderStatus,
  OfferStatus,
  Offer,
  OrderView,
  ConversationOrder,
  OrderListItem,
} from '@/lib/db/orders'

/** The order (if any) + its offer history for a conversation. Participant-scoped. */
export async function getConversationOrder(conversationId: string): Promise<repo.ConversationOrder> {
  const viewer = await getViewer()
  if (!viewer) return { order: null, offers: [] }
  return repo.conversationOrderFor(viewer, conversationId)
}

/** Orders where the current user is the seller. */
export async function getSellerOrders(): Promise<repo.OrderListItem[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return repo.ordersForRole(viewer, 'seller')
}

/** Orders where the current user is the buyer. */
export async function getBuyerOrders(): Promise<repo.OrderListItem[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return repo.ordersForRole(viewer, 'buyer')
}
