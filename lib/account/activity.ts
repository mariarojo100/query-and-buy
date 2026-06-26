import { createClient } from '@/utils/supabase/server'
import { getProfileReviews } from '@/lib/reviews/queries'

export type ActivityKind = 'joined' | 'listed' | 'featured' | 'sold' | 'review'

export type ActivityEvent = {
  id: string
  kind: ActivityKind
  title: string
  at: string
}

function embTitle(l: unknown): string | null {
  const o = (Array.isArray(l) ? l[0] : l) as { title_en?: string } | null
  return o?.title_en ?? null
}

/** A real activity feed assembled from the user's listings, sales, reviews, and join date. */
export async function getActivity(
  userId: string,
  memberSince: string,
  limit = 12,
): Promise<ActivityEvent[]> {
  const supabase = await createClient()
  const events: ActivityEvent[] = []

  const [{ data: listings }, { data: orders }, reviews] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title_en, created_at, is_featured')
      .eq('seller_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(15),
    supabase
      .from('orders')
      .select('id, completed_at, listing:listings(title_en)')
      .eq('seller_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10),
    getProfileReviews(userId, 8),
  ])

  for (const l of (listings ?? []) as {
    id: string
    title_en: string
    created_at: string
    is_featured: boolean
  }[]) {
    events.push({
      id: `list-${l.id}`,
      kind: l.is_featured ? 'featured' : 'listed',
      title: l.is_featured ? `Featured “${l.title_en}”` : `Listed “${l.title_en}”`,
      at: l.created_at,
    })
  }

  for (const o of (orders ?? []) as { id: string; completed_at: string | null; listing: unknown }[]) {
    if (!o.completed_at) continue
    const t = embTitle(o.listing)
    events.push({
      id: `sale-${o.id}`,
      kind: 'sold',
      title: t ? `Completed a sale of “${t}”` : 'Completed a sale',
      at: o.completed_at,
    })
  }

  for (const r of reviews) {
    events.push({
      id: `rev-${r.id}`,
      kind: 'review',
      title: `Received a ${r.rating}-star review`,
      at: r.created_at,
    })
  }

  events.push({ id: 'joined', kind: 'joined', title: 'Joined Query & Buy', at: memberSince })

  return events
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}
