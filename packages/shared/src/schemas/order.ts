/**
 * Order/offer schemas — mirror lib/db/orders.ts (OrderView, Offer,
 * OrderStatus/OfferStatus) used by /api/v1 conversations offers + orders.
 */
import { z } from 'zod'
import { OFFER_STATUS_VALUES, ORDER_STATUS_VALUES } from '../constants'

export const OrderViewSchema = z.object({
  id: z.string().uuid(),
  listing_id: z.string().uuid(),
  conversation_id: z.string().uuid().nullable(),
  buyer_id: z.string().uuid(),
  seller_id: z.string().uuid(),
  accepted_price_fils: z.number().int().nonnegative().nullable(),
  status: z.enum(ORDER_STATUS_VALUES),
  buyer_confirmed: z.boolean(),
  seller_confirmed: z.boolean(),
  contact_revealed: z.boolean(),
})
export type OrderViewDto = z.infer<typeof OrderViewSchema>

export const OfferSchema = z.object({
  id: z.string().uuid(),
  sender_id: z.string().uuid(),
  amount_fils: z.number().int().positive(),
  status: z.enum(OFFER_STATUS_VALUES),
  created_at: z.string(),
})
export type OfferDto = z.infer<typeof OfferSchema>

/** POST /api/v1/conversations/:id/offers — amount in AED (converted server-side). */
export const MakeOfferSchema = z.object({
  amountAed: z.number().positive('Enter a valid offer amount.'),
})
export type MakeOfferInput = z.infer<typeof MakeOfferSchema>

export const RespondToOfferSchema = z.object({
  action: z.enum(['accept', 'decline']),
})
export type RespondToOfferInput = z.infer<typeof RespondToOfferSchema>
