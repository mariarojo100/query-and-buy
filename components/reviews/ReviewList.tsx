import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { Stars } from '@/components/reviews/Stars'
import { formatRelativeTime } from '@/lib/format'
import type { Review } from '@/lib/reviews/queries'

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>
  }
  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarImage src={r.reviewer?.avatar_url ?? undefined} alt={r.reviewer?.display_name ?? ''} />
              <AvatarFallback className="text-[10px]">
                {initials(r.reviewer?.display_name ?? '?')}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{r.reviewer?.display_name ?? 'User'}</span>
            <span className="text-xs text-muted-foreground">· as {r.reviewer_role}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRelativeTime(r.created_at)}
            </span>
          </div>
          <div className="mt-1.5">
            <Stars value={r.rating} size="size-3.5" />
          </div>
          {r.review_text && <p className="mt-1.5 text-sm text-foreground/90">{r.review_text}</p>}
        </div>
      ))}
    </div>
  )
}
