/**
 * lib/db/reputation — public seller-reputation aggregates (Phase 4).
 * ===========================================================================
 * Response rate/time, completed sales, active listings, verification. These
 * were service-role reads (RLS hid conversations/messages/orders from non-
 * participants) but return ONLY public aggregates — never message content — so
 * on the RLS-free target they are plain public repository functions.
 */
import { db } from '@/lib/db'
import { reviewStatsFor } from '@/lib/db/reviews'
import { computeBadges, type ReputationStats, type ResponseStats, type SellerBadge } from '@/lib/reputation/badges'

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** Response rate + median response time for a seller (first buyer msg → first reply). */
export async function sellerResponseStatsFor(sellerId: string): Promise<ResponseStats> {
  const convs = await db.conversation.findMany({
    where: { sellerId },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: { id: true },
  })
  const ids = convs.map((c) => c.id)
  if (!ids.length) return { rate: null, avgMinutes: null, sample: 0 }

  const msgs = await db.message.findMany({
    where: { conversationId: { in: ids } },
    orderBy: { createdAt: 'asc' },
    select: { conversationId: true, senderId: true, createdAt: true },
  })
  const byConv = new Map<string, { senderId: string; createdAt: Date }[]>()
  for (const m of msgs) {
    const arr = byConv.get(m.conversationId) ?? []
    arr.push({ senderId: m.senderId, createdAt: m.createdAt })
    byConv.set(m.conversationId, arr)
  }

  let withBuyer = 0
  let responded = 0
  const times: number[] = []
  for (const id of ids) {
    const list = byConv.get(id) ?? []
    const firstBuyer = list.find((m) => m.senderId !== sellerId)
    if (!firstBuyer) continue
    withBuyer++
    const reply = list.find((m) => m.senderId === sellerId && m.createdAt > firstBuyer.createdAt)
    if (reply) {
      responded++
      times.push((reply.createdAt.getTime() - firstBuyer.createdAt.getTime()) / 60_000)
    }
  }
  if (withBuyer === 0) return { rate: null, avgMinutes: null, sample: 0 }
  return { rate: responded / withBuyer, avgMinutes: times.length ? Math.round(median(times)) : null, sample: withBuyer }
}

export type SellerReputation = ReputationStats & { badges: SellerBadge[] }

export async function sellerReputationFor(
  sellerId: string,
  opts: { withResponse?: boolean } = {},
): Promise<SellerReputation> {
  const [stats, completedSales, activeListings, prof, response] = await Promise.all([
    reviewStatsFor(sellerId),
    db.order.count({ where: { sellerId, status: 'completed' } }),
    db.listing.count({ where: { sellerId, status: 'active', deletedAt: null } }),
    db.profile.findUnique({ where: { id: sellerId }, select: { memberSince: true, emailVerified: true, phoneVerified: true } }),
    opts.withResponse
      ? sellerResponseStatsFor(sellerId)
      : Promise.resolve<ResponseStats>({ rate: null, avgMinutes: null, sample: 0 }),
  ])

  const base: ReputationStats = {
    avgRating: stats.average,
    reviewCount: stats.count,
    completedSales,
    activeListings,
    memberSince: prof?.memberSince ? prof.memberSince.toISOString() : null,
    emailVerified: !!prof?.emailVerified,
    phoneVerified: !!prof?.phoneVerified,
    response,
  }
  return { ...base, badges: computeBadges(base) }
}
