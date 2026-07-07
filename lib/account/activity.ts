import { getViewer } from '@/lib/auth/session'
import { activityDataFor } from '@/lib/db/activity'
import { getProfileReviews } from '@/lib/reviews/queries'

export type ActivityKind = 'joined' | 'listed' | 'featured' | 'sold' | 'review'

export type ActivityEvent = {
  id: string
  kind: ActivityKind
  title: string
  at: string
}

/** A real activity feed assembled from the user's listings, sales, reviews, and join date. */
export async function getActivity(userId: string, memberSince: string, limit = 12): Promise<ActivityEvent[]> {
  const viewer = await getViewer()
  const [{ listings, sales }, reviews] = await Promise.all([
    activityDataFor(viewer, userId),
    getProfileReviews(userId, 8),
  ])

  const events: ActivityEvent[] = []

  for (const l of listings) {
    events.push({
      id: `list-${l.id}`,
      kind: l.isFeatured ? 'featured' : 'listed',
      title: l.isFeatured ? `Featured “${l.titleEn}”` : `Listed “${l.titleEn}”`,
      at: l.createdAt.toISOString(),
    })
  }

  for (const s of sales) {
    if (!s.completedAt) continue
    events.push({
      id: `sale-${s.id}`,
      kind: 'sold',
      title: s.listingTitle ? `Completed a sale of “${s.listingTitle}”` : 'Completed a sale',
      at: s.completedAt.toISOString(),
    })
  }

  for (const r of reviews) {
    events.push({ id: `rev-${r.id}`, kind: 'review', title: `Received a ${r.rating}-star review`, at: r.created_at })
  }

  events.push({ id: 'joined', kind: 'joined', title: 'Joined Query & Buy', at: memberSince })

  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit)
}
