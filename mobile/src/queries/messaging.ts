/**
 * src/queries/messaging — inbox + conversation + the offer/order state
 * machine. Polling mirrors the web (5s conversations, gated on app focus via
 * the focusManager wiring in app/_layout.tsx).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { InboxItemDto, ConversationMessageDto, OrderViewDto, OfferDto } from '@qb/shared'

export const messagingKeys = {
  inbox: ['conversations'] as const,
  thread: (id: string) => ['conversation', id] as const,
}

export function useInbox(enabled: boolean) {
  return useQuery({
    queryKey: messagingKeys.inbox,
    queryFn: () => api<{ conversations: InboxItemDto[]; unreadCount: number }>('/conversations'),
    enabled,
    refetchInterval: 5000,
  })
}

export type ThreadResponse = {
  conversation: {
    id: string
    status: string
    listing: { id: string; title_en: string; price_fils: number; currency: string; cover_key: string | null } | null
    other: { id: string; display_name: string; username: string | null; avatar_url: string | null } | null
    meId: string
    buyerId: string
    sellerId: string
    otherLastReadAt: string | null
  }
  messages: ConversationMessageDto[]
  order: { order: OrderViewDto | null; offers: OfferDto[] }
}

export function useThread(id: string) {
  return useQuery({
    queryKey: messagingKeys.thread(id),
    queryFn: () => api<ThreadResponse>(`/conversations/${id}`),
    enabled: !!id,
    refetchInterval: 5000,
  })
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) =>
      api(`/conversations/${conversationId}/messages`, { body: { body } }),
    onSettled: () => void qc.invalidateQueries({ queryKey: messagingKeys.thread(conversationId) }),
  })
}

export function useMakeOffer(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (amountAed: number) =>
      api(`/conversations/${conversationId}/offers`, { body: { amountAed } }),
    onSettled: () => void qc.invalidateQueries({ queryKey: messagingKeys.thread(conversationId) }),
  })
}

export function useRespondToOffer(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { offerId: string; action: 'accept' | 'decline' }) =>
      api(`/offers/${input.offerId}/respond`, { body: { action: input.action } }),
    onSettled: () => void qc.invalidateQueries({ queryKey: messagingKeys.thread(conversationId) }),
  })
}

export function useOrderAction(conversationId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string; action: 'confirm' | 'cancel' | 'sold' | 'reactivate' }) =>
      api(`/orders/${input.orderId}/${input.action}`, { method: 'POST' }),
    onSettled: () => void qc.invalidateQueries({ queryKey: messagingKeys.thread(conversationId) }),
  })
}

export type RevealedContacts = {
  buyer: { display_name: string; email: string | null; phone: string | null }
  seller: { display_name: string; email: string | null; phone: string | null }
}

export function fetchContacts(orderId: string): Promise<RevealedContacts> {
  return api<RevealedContacts>(`/orders/${orderId}/contacts`)
}

export type OfferSuggestion = {
  suggestedAed: number
  marketAvgAed: number | null
  reasons: string[]
  role: 'buyer' | 'seller'
}

export function fetchOfferSuggestion(conversationId: string): Promise<{ suggestion: OfferSuggestion }> {
  return api(`/conversations/${conversationId}/suggest-offer`, { method: 'POST' })
}

export function markThreadRead(conversationId: string): Promise<unknown> {
  return api(`/conversations/${conversationId}/read`, { method: 'POST' })
}

/** Open (or fetch) the conversation for a listing → id for navigation. */
export function openConversation(listingId: string): Promise<{ conversationId: string }> {
  return api<{ conversationId: string }>('/conversations', { body: { listingId } })
}
