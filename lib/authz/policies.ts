/**
 * lib/authz/policies — RLS read-policies re-expressed as reusable Prisma
 * `where` fragments (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * Each function here corresponds to a specific Row Level Security policy from
 * supabase/migrations/*.sql (catalogued in MIGRATION_BLUEPRINT.md §5). In the
 * target stack there is no RLS, so a repository composes these fragments into
 * every read. Keeping them here — pure, typed against the generated Prisma
 * schema, one per policy — is what makes the RLS→app-authz translation
 * auditable instead of ad hoc.
 *
 * Pure: depends only on the Viewer type and Prisma's generated input types.
 * Write-side rules (e.g. "sender_id must equal viewer", "order must be
 * completed before review") are transaction-time assertions in repositories,
 * NOT where-fragments, and are therefore not modeled here.
 */
import type { Prisma } from '@/lib/generated/prisma/client'
import type { Viewer } from '@/lib/authz/viewer'

/**
 * listings_read (110008) ∪ listings_order_participant_read (110020):
 *   (status='active' AND deleted_at IS NULL) OR seller = viewer OR staff
 *   OR viewer is a participant of an order on the listing (sees 'reserved').
 */
export function listingVisibleWhere(viewer: Viewer | null): Prisma.ListingWhereInput {
  if (viewer?.isStaff) return {}
  const or: Prisma.ListingWhereInput[] = [{ status: 'active', deletedAt: null }]
  if (viewer) {
    or.push({ sellerId: viewer.id })
    or.push({ orders: { some: { OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] } } })
  }
  return { OR: or }
}

/** conv_participant_read (110008): buyer or seller = viewer, OR staff. */
export function conversationVisibleWhere(viewer: Viewer): Prisma.ConversationWhereInput {
  if (viewer.isStaff) return {}
  return { OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] }
}

/** msg_participant_read (110008): participant of the parent conversation, OR staff. */
export function messageVisibleWhere(viewer: Viewer): Prisma.MessageWhereInput {
  if (viewer.isStaff) return {}
  return { conversation: { OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] } }
}

/** orders_participant_read (110019): buyer or seller = viewer (no staff clause). */
export function orderParticipantWhere(viewer: Viewer): Prisma.OrderWhereInput {
  return { OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] }
}

/** offers_participant_read (110019): via the parent order's participants. */
export function offerVisibleWhere(viewer: Viewer): Prisma.OfferWhereInput {
  return { order: { OR: [{ buyerId: viewer.id }, { sellerId: viewer.id }] } }
}

/**
 * Strictly-private, user-scoped tables — saved_searches, favorites,
 * listing_views, notifications, notification_preferences
 * (saved_owner_all / fav_owner_all / listing_views_owner_all /
 * notifications_owner_read / notif_prefs_owner_read): row.user_id = viewer.id.
 */
export function ownedByViewer(viewer: Viewer): { userId: string } {
  return { userId: viewer.id }
}

/** reports_select_own (110015): reporter = viewer (moderation reads go through lib/db/system). */
export function reportOwnedWhere(viewer: Viewer): Prisma.ReportWhereInput {
  return { reporterId: viewer.id }
}
