import { BadgeCheckIcon, PhoneIcon, ShieldCheckIcon } from 'lucide-react'
import type { TrustResult } from '@/lib/trust/score'

/** Quiet, monochrome verification chips with a whispered gold mark. */
export function VerificationBadges({
  trust,
  className,
}: {
  trust: TrustResult
  className?: string
}) {
  const items = [
    trust.trustedSeller && { icon: ShieldCheckIcon, label: 'Trusted Seller' },
    trust.emailVerified && { icon: BadgeCheckIcon, label: 'Email Verified' },
    trust.phoneVerified && { icon: PhoneIcon, label: 'Phone Verified' },
  ].filter(Boolean) as { icon: typeof ShieldCheckIcon; label: string }[]

  if (items.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-2 ${className ?? ''}`}>
      {items.map((i) => (
        <span
          key={i.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium"
        >
          <i.icon className="size-3.5 text-gold" />
          {i.label}
        </span>
      ))}
    </div>
  )
}
