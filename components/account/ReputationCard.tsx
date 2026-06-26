import Link from 'next/link'
import { Stars } from '@/components/reviews/Stars'
import { SellerBadges } from '@/components/trust/SellerBadges'
import { ReviewList } from '@/components/reviews/ReviewList'
import { formatResponseTime } from '@/lib/reputation/badges'
import type { SellerReputation } from '@/lib/reputation/queries'
import type { Review } from '@/lib/reviews/queries'

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
      <p className="font-display text-lg leading-none tracking-tight tnum">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

export function ReputationCard({
  rep,
  trustScore,
  repeatBuyers,
  recentReviews,
}: {
  rep: SellerReputation
  trustScore: number
  repeatBuyers: number
  recentReviews: Review[]
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-xl tracking-tight">Reputation</h2>

      <div className="mt-4 flex items-center gap-5">
        <div className="shrink-0 text-center">
          <p className="font-display text-4xl leading-none tracking-tight">
            {rep.avgRating != null ? rep.avgRating.toFixed(1) : '—'}
          </p>
          <Stars value={rep.avgRating ?? 0} size="size-4" className="mt-1.5 justify-center" />
          <p className="mt-1 text-xs text-muted-foreground">{rep.reviewCount} reviews</p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2.5">
          <MiniStat label="Completed deals" value={rep.completedSales} />
          <MiniStat label="Repeat buyers" value={repeatBuyers} />
          <MiniStat
            label="Reply rate"
            value={rep.response.rate != null ? `${Math.round(rep.response.rate * 100)}%` : '—'}
          />
          <MiniStat label="Avg reply" value={formatResponseTime(rep.response.avgMinutes) ?? '—'} />
        </div>
      </div>

      {/* trust score */}
      <div className="mt-5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Trust score</span>
          <span className="font-medium tnum">{trustScore}/100</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-700 transition-all"
            style={{ width: `${trustScore}%` }}
          />
        </div>
      </div>

      {rep.badges.length > 0 && (
        <div className="mt-5">
          <p className="eyebrow mb-2">Badges earned</p>
          <SellerBadges badges={rep.badges} />
        </div>
      )}

      {recentReviews.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="eyebrow">Recent reviews</p>
            <Link href="/account/reviews" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <ReviewList reviews={recentReviews.slice(0, 2)} />
        </div>
      )}
    </div>
  )
}
