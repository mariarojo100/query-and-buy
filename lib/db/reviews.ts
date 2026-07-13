/**
 * lib/db/reviews — reviews repository (Phase 4).
 * ===========================================================================
 * Public reads (reviews_public_read) + the eligibility-checked write
 * (reviews_participant_insert): a review requires a COMPLETED order the viewer
 * is a party to, with reviewer_role/reviewee derived server-side (buyer reviews
 * seller and vice-versa) — a caller cannot forge who they are or review a
 * transaction they weren't in. One review per (order, reviewer).
 * getReputation counts were service-role only because orders RLS hid other
 * users' orders; with no RLS they are a plain public aggregate.
 */
import { db } from '@/lib/db'
import type { Viewer } from '@/lib/authz/viewer'

export type Review = {
  id: string
  rating: number
  review_text: string | null
  reviewer_role: 'buyer' | 'seller'
  created_at: string
  reviewer: { display_name: string; avatar_url: string | null; username: string | null } | null
}
export type ReviewStats = { average: number | null; count: number }
export type Reputation = { completedSales: number; completedPurchases: number }

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002'
}

export async function reviewStatsFor(userId: string): Promise<ReviewStats> {
  const agg = await db.review.aggregate({ where: { revieweeId: userId }, _avg: { rating: true }, _count: { _all: true } })
  const count = agg._count._all
  if (count === 0) return { average: null, count: 0 }
  return { average: Math.round((agg._avg.rating ?? 0) * 10) / 10, count }
}

export async function profileReviewsFor(userId: string, limit = 6): Promise<Review[]> {
  const rows = await db.review.findMany({
    where: { revieweeId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      rating: true,
      reviewText: true,
      reviewerRole: true,
      createdAt: true,
      reviewer: { select: { displayName: true, avatarUrl: true, username: true } },
    },
  })
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    review_text: r.reviewText,
    reviewer_role: r.reviewerRole as 'buyer' | 'seller',
    created_at: r.createdAt.toISOString(),
    reviewer: r.reviewer
      ? { display_name: r.reviewer.displayName, avatar_url: r.reviewer.avatarUrl, username: r.reviewer.username }
      : null,
  }))
}

export async function reputationCountsFor(userId: string): Promise<Reputation> {
  const [completedSales, completedPurchases] = await Promise.all([
    db.order.count({ where: { sellerId: userId, status: 'completed' } }),
    db.order.count({ where: { buyerId: userId, status: 'completed' } }),
  ])
  return { completedSales, completedPurchases }
}

export async function myReviewFor(viewer: Viewer, orderId: string): Promise<{ rating: number; review_text: string | null } | null> {
  const r = await db.review.findFirst({
    where: { orderId, reviewerId: viewer.id },
    select: { rating: true, reviewText: true },
  })
  return r ? { rating: r.rating, review_text: r.reviewText } : null
}

export type SubmitReviewResult =
  | { ok: true; revieweeId: string; reviewerRole: 'buyer' | 'seller' }
  | { ok: false; error: string }

export async function submitReviewFor(
  viewer: Viewer,
  input: { orderId: string; rating: number; text: string | null },
): Promise<SubmitReviewResult> {
  const order = await db.order.findUnique({
    where: { id: input.orderId },
    select: { listingId: true, buyerId: true, sellerId: true, status: true },
  })
  if (!order) return { ok: false, error: 'Order not found.' }
  if (order.status !== 'completed') return { ok: false, error: 'You can review once the transaction is completed.' }

  const isBuyer = viewer.id === order.buyerId
  const isSeller = viewer.id === order.sellerId
  if (!isBuyer && !isSeller) return { ok: false, error: 'Not allowed.' }
  const reviewerRole: 'buyer' | 'seller' = isBuyer ? 'buyer' : 'seller'
  const revieweeId = isBuyer ? order.sellerId : order.buyerId

  try {
    await db.review.create({
      data: {
        orderId: input.orderId,
        listingId: order.listingId,
        reviewerId: viewer.id,
        revieweeId,
        reviewerRole,
        rating: input.rating,
        reviewText: input.text,
      },
    })
  } catch (e) {
    if (isUniqueViolation(e)) return { ok: false, error: 'You already reviewed this transaction.' }
    throw e
  }
  return { ok: true, revieweeId, reviewerRole }
}

/** Display data for the new-review notification (reviewer name, reviewee handle, listing). */
export async function reviewNotifyData(
  reviewerId: string,
  revieweeId: string,
  orderId: string,
): Promise<{ reviewerName: string; revieweeUsername: string | null; listingTitle: string }> {
  const [reviewer, reviewee, order] = await Promise.all([
    db.profile.findUnique({ where: { id: reviewerId }, select: { displayName: true } }),
    db.profile.findUnique({ where: { id: revieweeId }, select: { username: true } }),
    db.order.findUnique({ where: { id: orderId }, select: { listing: { select: { titleEn: true } } } }),
  ])
  return {
    reviewerName: reviewer?.displayName ?? 'A user',
    revieweeUsername: reviewee?.username ?? null,
    listingTitle: order?.listing?.titleEn ?? 'a recent transaction',
  }
}
