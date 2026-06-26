import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/admin'

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

/** Average rating + review count for a user (reviews are public-read). */
export async function getReviewStats(userId: string): Promise<ReviewStats> {
  const supabase = await createClient()
  const { data } = await supabase.from('reviews').select('rating').eq('reviewee_id', userId)
  const rows = (data ?? []) as { rating: number }[]
  if (rows.length === 0) return { average: null, count: 0 }
  const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length
  return { average: Math.round(avg * 10) / 10, count: rows.length }
}

/** Most recent reviews received by a user, with reviewer profile. */
export async function getProfileReviews(userId: string, limit = 6): Promise<Review[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('reviews')
    .select('id, rating, review_text, reviewer_role, created_at, reviewer_id')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = (data ?? []) as Array<{
    id: string
    rating: number
    review_text: string | null
    reviewer_role: 'buyer' | 'seller'
    created_at: string
    reviewer_id: string
  }>
  const ids = [...new Set(rows.map((r) => r.reviewer_id))]
  const people = new Map<string, Review['reviewer']>()
  if (ids.length) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, username')
      .in('id', ids)
    for (const p of (profs ?? []) as Array<{
      id: string
      display_name: string
      avatar_url: string | null
      username: string | null
    }>) {
      people.set(p.id, {
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        username: p.username,
      })
    }
  }
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    review_text: r.review_text,
    reviewer_role: r.reviewer_role,
    created_at: r.created_at,
    reviewer: people.get(r.reviewer_id) ?? null,
  }))
}

/**
 * Completed-sale / completed-purchase counts for any user. Uses the service
 * client because orders RLS hides other users' orders — only aggregate counts
 * are returned, never order contents.
 */
export async function getReputation(userId: string): Promise<Reputation> {
  let admin
  try {
    admin = createServiceClient()
  } catch {
    return { completedSales: 0, completedPurchases: 0 }
  }
  const [sales, purchases] = await Promise.all([
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'completed'),
    admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', userId)
      .eq('status', 'completed'),
  ])
  return { completedSales: sales.count ?? 0, completedPurchases: purchases.count ?? 0 }
}

/** The current user's review for an order, if they've left one. */
export async function getMyReview(
  orderId: string,
): Promise<{ rating: number; review_text: string | null } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('reviews')
    .select('rating, review_text')
    .eq('order_id', orderId)
    .eq('reviewer_id', user.id)
    .maybeSingle()
  return (data as { rating: number; review_text: string | null } | null) ?? null
}
