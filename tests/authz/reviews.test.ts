/**
 * Authorization tests for reviews (lib/db/reviews). A review requires a
 * completed order the viewer is party to; role/reviewee are derived server-side;
 * one per (order, reviewer). Stats/reputation are public aggregates.
 */
import { db } from '@/lib/db'
import {
  submitReviewFor,
  myReviewFor,
  reviewStatsFor,
  profileReviewsFor,
  reputationCountsFor,
} from '@/lib/db/reviews'
import { ok, summary, exitCode, resetDb, makeUser, makeListing, disconnect } from '@/tests/authz/_harness'

async function makeOrder(listingId: string, buyerId: string, sellerId: string, status: string): Promise<string> {
  const o = await db.order.create({ data: { listingId, buyerId, sellerId, status }, select: { id: true } })
  return o.id
}

async function main() {
  await resetDb()
  const seller = await makeUser({ email: 'seller@test.ae' })
  const buyer = await makeUser({ email: 'buyer@test.ae' })
  const stranger = await makeUser({ email: 'stranger@test.ae' })
  const listing = await makeListing(seller.id, { title: 'Item' })
  const listing2 = await makeListing(seller.id, { title: 'Item 2' }) // orders are unique per (listing, buyer)

  const openOrder = await makeOrder(listing2, buyer.id, seller.id, 'negotiating')
  const doneOrder = await makeOrder(listing, buyer.id, seller.id, 'completed')

  // --- eligibility ---
  ok('DENY: cannot review an incomplete order', (await submitReviewFor(buyer.viewer, { orderId: openOrder, rating: 5, text: null })).ok === false)
  ok('DENY: non-participant cannot review', (await submitReviewFor(stranger.viewer, { orderId: doneOrder, rating: 5, text: null })).ok === false)

  // --- buyer reviews seller ---
  const r1 = await submitReviewFor(buyer.viewer, { orderId: doneOrder, rating: 5, text: 'great' })
  ok('buyer can review a completed order', r1.ok === true)
  ok('reviewer_role=buyer, reviewee=seller', r1.ok && r1.reviewerRole === 'buyer' && r1.revieweeId === seller.id)
  ok('DENY: duplicate review rejected', (await submitReviewFor(buyer.viewer, { orderId: doneOrder, rating: 4, text: null })).ok === false)

  // --- seller reviews buyer (independent review on the same order) ---
  const r2 = await submitReviewFor(seller.viewer, { orderId: doneOrder, rating: 4, text: 'ok buyer' })
  ok('seller can review the buyer', r2.ok === true && r2.reviewerRole === 'seller' && r2.revieweeId === buyer.id)

  // --- getMyReview is owner-scoped ---
  ok('owner sees their own review', (await myReviewFor(buyer.viewer, doneOrder))?.rating === 5)
  ok('DENY: stranger has no review here', (await myReviewFor(stranger.viewer, doneOrder)) === null)

  // --- public aggregates ---
  const sellerStats = await reviewStatsFor(seller.id)
  ok('review stats aggregate for seller', sellerStats.count === 1 && sellerStats.average === 5)
  ok('profile reviews list (public)', (await profileReviewsFor(seller.id)).length === 1)
  ok('reputation counts (public)', (await reputationCountsFor(seller.id)).completedSales >= 0)

  summary('reviews')
  await disconnect()
  process.exit(exitCode())
}

main().catch(async (e) => {
  console.log('THREW ' + (e?.stack || e?.message || e))
  await disconnect().catch(() => {})
  process.exit(1)
})
