import {
  CalendarDaysIcon,
  CheckIcon,
  HandshakeIcon,
  type LucideIcon,
  MailCheckIcon,
  MessageCircleIcon,
  MinusIcon,
  PhoneIcon,
  StarIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Signal = { icon: LucideIcon; label: string; detail: string; met: boolean }

/** Humanise account age from an ISO date, e.g. "3 months", "2 years". */
function accountAge(iso: string | null): { detail: string; met: boolean } {
  if (!iso) return { detail: 'Unknown', met: false }
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return { detail: 'Unknown', met: false }
  const days = ms / 86_400_000
  if (days < 30) return { detail: 'New', met: false }
  const months = Math.floor(days / 30.4)
  if (months < 12) return { detail: `${months} month${months === 1 ? '' : 's'}`, met: true }
  const years = Math.floor(days / 365)
  return { detail: `${years} year${years === 1 ? '' : 's'}`, met: true }
}

/**
 * The signals that build a seller's trust score, shown as a plain checklist so
 * buyers can see exactly what is (and isn't) backed by real data. Missing data
 * degrades gracefully to a muted, honest "not yet" state — never a fake tick.
 */
export function TrustSignals({
  emailVerified,
  phoneVerified,
  reviewCount,
  completedSales,
  responseRate,
  memberSince,
  className,
}: {
  emailVerified: boolean
  phoneVerified: boolean
  reviewCount: number
  completedSales: number
  responseRate: number | null
  memberSince: string | null
  className?: string
}) {
  const age = accountAge(memberSince)
  const signals: Signal[] = [
    {
      icon: MailCheckIcon,
      label: 'Email verified',
      detail: emailVerified ? 'Verified' : 'Not verified',
      met: emailVerified,
    },
    {
      icon: PhoneIcon,
      label: 'Phone verified',
      detail: phoneVerified ? 'Verified' : 'Not verified',
      met: phoneVerified,
    },
    {
      icon: StarIcon,
      label: 'Reviews',
      detail: reviewCount > 0 ? `${reviewCount}` : 'None yet',
      met: reviewCount > 0,
    },
    {
      icon: HandshakeIcon,
      label: 'Completed sales',
      detail: completedSales > 0 ? `${completedSales}` : 'None yet',
      met: completedSales > 0,
    },
    {
      icon: MessageCircleIcon,
      label: 'Response rate',
      detail: responseRate != null ? `${Math.round(responseRate * 100)}%` : 'Not enough data',
      met: responseRate != null && responseRate >= 0.7,
    },
    {
      icon: CalendarDaysIcon,
      label: 'Account age',
      detail: age.detail,
      met: age.met,
    },
  ]

  return (
    <ul className={cn('space-y-2.5', className)}>
      {signals.map((s) => (
        <li key={s.label} className="flex items-center gap-3">
          <span
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg',
              s.met ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <s.icon className="size-3.5" />
          </span>
          <span className="flex-1 text-sm text-foreground/90">{s.label}</span>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium tnum',
              s.met ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {s.detail}
            {s.met ? (
              <CheckIcon className="size-3.5 text-primary" aria-hidden />
            ) : (
              <MinusIcon className="size-3.5 text-muted-foreground/60" aria-hidden />
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
