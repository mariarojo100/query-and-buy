import { createServiceClient } from '@/utils/supabase/admin'
import { getReviewStats } from '@/lib/reviews/queries'
import {
  computeBadges,
  type ReputationStats,
  type ResponseStats,
  type SellerBadge,
} from '@/lib/reputation/badges'

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/**
 * Real response rate + median response time for a seller, computed from the
 * first buyer message → first seller reply across recent conversations.
 * Uses the service client because conversation/message RLS hides them from
 * non-participants — only aggregate timing is returned, never message content.
 */
export async function getSellerResponseStats(sellerId: string): Promise<ResponseStats> {
  let db
  try {
    db = createServiceClient()
  } catch {
    return { rate: null, avgMinutes: null, sample: 0 }
  }

  const { data: convs } = await db
    .from('conversations')
    .select('id')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(40)
  const ids = ((convs ?? []) as { id: string }[]).map((c) => c.id)
  if (ids.length === 0) return { rate: null, avgMinutes: null, sample: 0 }

  const { data: msgs } = await db
    .from('messages')
    .select('conversation_id, sender_id, created_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: true })

  const byConv = new Map<string, { sender_id: string; created_at: string }[]>()
  for (const m of (msgs ?? []) as { conversation_id: string; sender_id: string; created_at: string }[]) {
    const arr = byConv.get(m.conversation_id) ?? []
    arr.push({ sender_id: m.sender_id, created_at: m.created_at })
    byConv.set(m.conversation_id, arr)
  }

  let withBuyer = 0
  let responded = 0
  const times: number[] = []
  for (const id of ids) {
    const list = byConv.get(id) ?? []
    const firstBuyer = list.find((m) => m.sender_id !== sellerId)
    if (!firstBuyer) continue
    withBuyer++
    const reply = list.find(
      (m) => m.sender_id === sellerId && new Date(m.created_at) > new Date(firstBuyer.created_at),
    )
    if (reply) {
      responded++
      times.push((new Date(reply.created_at).getTime() - new Date(firstBuyer.created_at).getTime()) / 60_000)
    }
  }

  if (withBuyer === 0) return { rate: null, avgMinutes: null, sample: 0 }
  return {
    rate: responded / withBuyer,
    avgMinutes: times.length ? Math.round(median(times)) : null,
    sample: withBuyer,
  }
}

export type SellerReputation = ReputationStats & { badges: SellerBadge[] }

/**
 * Unified seller reputation for profile / listing / chat. `withResponse` runs
 * the (heavier) response-time computation — enable it on the profile and chat,
 * skip it on high-traffic listing pages.
 */
export async function getSellerReputation(
  sellerId: string,
  opts: { withResponse?: boolean } = {},
): Promise<SellerReputation> {
  let db
  try {
    db = createServiceClient()
  } catch {
    db = null
  }

  const [stats, salesRes, activeRes, profRes, response] = await Promise.all([
    getReviewStats(sellerId),
    db
      ? db.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('status', 'completed')
      : Promise.resolve({ count: 0 }),
    db
      ? db
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .eq('seller_id', sellerId)
          .eq('status', 'active')
          .is('deleted_at', null)
      : Promise.resolve({ count: 0 }),
    db
      ? db.from('profiles').select('member_since, email_verified, phone_verified').eq('id', sellerId).maybeSingle()
      : Promise.resolve({ data: null }),
    opts.withResponse
      ? getSellerResponseStats(sellerId)
      : Promise.resolve<ResponseStats>({ rate: null, avgMinutes: null, sample: 0 }),
  ])

  const prof = (profRes as { data: { member_since?: string; email_verified?: boolean; phone_verified?: boolean } | null })
    .data
  const base: ReputationStats = {
    avgRating: stats.average,
    reviewCount: stats.count,
    completedSales: (salesRes as { count: number | null }).count ?? 0,
    activeListings: (activeRes as { count: number | null }).count ?? 0,
    memberSince: prof?.member_since ?? null,
    emailVerified: !!prof?.email_verified,
    phoneVerified: !!prof?.phone_verified,
    response,
  }
  return { ...base, badges: computeBadges(base) }
}
