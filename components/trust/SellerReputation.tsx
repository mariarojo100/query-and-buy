import { Stars } from '@/components/reviews/Stars'
import { SellerBadges } from '@/components/trust/SellerBadges'
import { formatResponseTime } from '@/lib/reputation/badges'
import type { SellerReputation as Rep } from '@/lib/reputation/queries'

/** Compact reputation summary: rating · sales · active · reply rate + badges. */
export function SellerReputation({ rep, badgeLimit = 4 }: { rep: Rep; badgeLimit?: number }) {
  const rt = formatResponseTime(rep.response.avgMinutes)
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {rep.avgRating != null ? (
          <span className="inline-flex items-center gap-1.5">
            <Stars value={rep.avgRating} size="size-3.5" />
            <span className="font-medium">{rep.avgRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({rep.reviewCount})</span>
          </span>
        ) : (
          <span className="text-muted-foreground">No ratings yet</span>
        )}
        <span className="text-border">·</span>
        <span>
          <span className="font-medium tnum">{rep.completedSales}</span>{' '}
          <span className="text-muted-foreground">sales</span>
        </span>
        <span>
          <span className="font-medium tnum">{rep.activeListings}</span>{' '}
          <span className="text-muted-foreground">active</span>
        </span>
        {rep.response.rate != null && (
          <span className="text-muted-foreground">
            {Math.round(rep.response.rate * 100)}% reply rate{rt ? ` · replies in ${rt}` : ''}
          </span>
        )}
      </div>
      <SellerBadges badges={rep.badges} limit={badgeLimit} />
    </div>
  )
}
