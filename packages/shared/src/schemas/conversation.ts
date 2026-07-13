/**
 * Messaging schemas — mirror lib/db/messaging.ts DTOs (InboxItem,
 * ConversationMessage) used by /api/v1/conversations*.
 */
import { z } from 'zod'

export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  username: z.string().nullable(),
  avatar_url: z.string().nullable(),
})

export const ListingSummarySchema = z.object({
  id: z.string().uuid(),
  title_en: z.string(),
  price_fils: z.number().int().nonnegative(),
  currency: z.string(),
  cover_key: z.string().nullable(),
})

export const InboxItemSchema = z.object({
  id: z.string().uuid(),
  listing: ListingSummarySchema.nullable(),
  other: ParticipantSchema.nullable(),
  lastBody: z.string().nullable(),
  lastAt: z.string().nullable(),
  unreadCount: z.number().int().nonnegative(),
})
export type InboxItemDto = z.infer<typeof InboxItemSchema>

export const ConversationMessageSchema = z.object({
  id: z.string().uuid(),
  sender_id: z.string().uuid(),
  body: z.string().nullable(),
  created_at: z.string(),
})
export type ConversationMessageDto = z.infer<typeof ConversationMessageSchema>

/** POST /api/v1/conversations — open (or return existing) thread for a listing. */
export const CreateConversationSchema = z.object({
  listingId: z.string().uuid(),
})

/** POST /api/v1/conversations/:id/messages — bounds mirror app/messages/actions.ts. */
export const SendMessageSchema = z.object({
  body: z.string().trim().min(1, 'Message is empty.').max(2000, 'Message is too long.'),
})
export type SendMessageInput = z.infer<typeof SendMessageSchema>
