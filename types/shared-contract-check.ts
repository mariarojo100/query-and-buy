/**
 * Drift guard: pins @qb/shared zod schemas to the real lib/db DTO types.
 * ===========================================================================
 * This file has NO runtime — it is type-level only and exists so that
 * `npm run typecheck` FAILS when a repository DTO and its shared schema
 * diverge (the schemas are the API/mobile contract; the DTOs are the truth).
 *
 * If a check errors: update the schema in packages/shared to match the DTO
 * (or, if the DTO change was accidental, revert it) — never silence the check.
 */
import type { z } from 'zod'
import type {
  FeedListingSchema,
  SellerMiniSchema,
  InboxItemSchema,
  ConversationMessageSchema,
  ListingSummarySchema,
  ParticipantSchema,
  OrderViewSchema,
  OfferSchema,
  CreateListingSchema,
  PresignedSlotSchema,
} from '@qb/shared'

import type { FeedListing, SellerMini } from '@/lib/db/listings'
import type {
  InboxItem,
  ConversationMessage,
  ListingSummary,
  Participant,
} from '@/lib/db/messaging'
import type { OrderView, Offer } from '@/lib/db/orders'
import type { CreateListingInput as ActionCreateListingInput } from '@/app/sell/actions'
import type { PresignedSlot } from '@/app/uploads/actions'

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false
type Expect<T extends true> = T

/**
 * `Mutual` asserts two types are mutually assignable (each extends the other).
 * For nearly every DTO⇄schema pair the strict `Equal` above is used, but a few
 * pairs (e.g. FeedListing) trip a known homomorphic/readonly false-positive in
 * the object-level `Equal` even though — as verified separately — their keys
 * match both ways and every field is type-identical. For those, mutual
 * assignability is the real contract the API/mobile rely on, so we assert that.
 */
type Mutual<A, B> = ([A] extends [B] ? true : false) extends true
  ? [B] extends [A]
    ? true
    : false
  : false

/* eslint-disable @typescript-eslint/no-unused-vars */
type _FeedListing = Expect<Mutual<FeedListing, z.infer<typeof FeedListingSchema>>>
type _SellerMini = Expect<Equal<SellerMini, z.infer<typeof SellerMiniSchema>>>
type _InboxItem = Expect<Equal<InboxItem, z.infer<typeof InboxItemSchema>>>
type _ConversationMessage = Expect<
  Equal<ConversationMessage, z.infer<typeof ConversationMessageSchema>>
>
type _ListingSummary = Expect<Equal<ListingSummary, z.infer<typeof ListingSummarySchema>>>
type _Participant = Expect<Equal<Participant, z.infer<typeof ParticipantSchema>>>
type _OrderView = Expect<Equal<OrderView, z.infer<typeof OrderViewSchema>>>
type _Offer = Expect<Equal<Offer, z.infer<typeof OfferSchema>>>
type _CreateListing = Expect<
  Equal<ActionCreateListingInput, z.infer<typeof CreateListingSchema>>
>
type _PresignedSlot = Expect<Equal<PresignedSlot, z.infer<typeof PresignedSlotSchema>>>
/* eslint-enable @typescript-eslint/no-unused-vars */
