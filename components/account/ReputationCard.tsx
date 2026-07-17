import Link from 'next/link'
import { ShieldCheckIcon } from 'lucide-react'
import { Stars } from '@/components/reviews/Stars'
import { CardHeading } from '@/components/account/CardHeading'
import { formatResponseTime } from '@/lib/reputation/badges'
import type { SellerReputation } from '@/lib/reputation/queries'

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 px-3 py-2.5">
      <p className="font-display text-lg leading-none tracking-tight tnum">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

/** Circular trust gauge with the rating (or an empty state) at its center. */
function TrustDial({ score, rep }: { score: number; rep: SellerReputation }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (circ * Math.max(0, Math.min(100, score))) / 100
  return (
    <div className="relative grid size-32 shrink-0 place-items-center">
      <svg viewBox="0 0 128 128" className="size-32 -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--muted)" strokeWidth="9" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="font-display text-3xl leading-none tracking-tight">
          {rep.avgRating != null ? rep.avgRating.toFixed(1) : '—'}
        </p>
        <Stars value={rep.avgRating ?? 0} size="size-3" className="mt-1 justify-center" />
        <p className="mt-1 text-[10px] text-muted-foreground">
          {rep.reviewCount > 0 ? `${rep.reviewCount} reviews` : 'No reviews yet'}
        </p>
      </div>
    </div>
  )
}

export function ReputationCard({
  rep,
  trustScore,
  repeatBuyers,
}: {
  rep: SellerReputation
  trustScore: number
  repeatBuyers: number
}) {
  return (
    <div className="h-full rounded-3xl border border-border bg-card p-5 shadow-soft">
      <CardHeading action={{ label: 'See all', href: '/account/reviews' }}>Reputation</CardHeading>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row">
        <TrustDial score={trustScore} rep={rep} />
        <div className="grid w-full grid-cols-2 gap-2.5">
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
            className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all"
            style={{ width: `${trustScore}%` }}
          />
        </div>
      </div>

      {/* build-trust CTA */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-gold/25 bg-accent/50 p-3.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          <ShieldCheckIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">Build trust, get more deals</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Verified profiles get 3× more replies and better visibility.
          </p>
        </div>
        <Link
          href="/account/settings"
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Improve profile
        </Link>
      </div>
    </div>
  )
}
