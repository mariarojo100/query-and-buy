import { StarIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { EmptyState } from '@/components/common/EmptyState'
import { ReviewList } from '@/components/reviews/ReviewList'
import { Stars } from '@/components/reviews/Stars'
import { getProfileReviews, getReviewStats } from '@/lib/reviews/queries'

export const metadata = { title: 'Reviews · Query & Buy' }

export default async function AccountReviewsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [stats, reviews] = await Promise.all([
    getReviewStats(user.id),
    getProfileReviews(user.id, 30),
  ])

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl tracking-tight">Reviews</h2>
        {stats.average != null && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-display text-xl tracking-tight tnum">{stats.average.toFixed(1)}</span>
            <Stars value={stats.average} size="size-4" />
            <span className="text-muted-foreground">({stats.count})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <EmptyState
          icon={StarIcon}
          title="No reviews yet"
          description="When you complete a sale or purchase, the other party can review you. Reviews build your reputation across the marketplace."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <ReviewList reviews={reviews} />
        </div>
      )}
    </section>
  )
}
