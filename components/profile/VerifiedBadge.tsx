import { BadgeCheckIcon, ShieldCheckIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * Verification badge — placeholder until the trust/KYC sprint wires real
 * verification. Reads the world-readable profiles.badge_level.
 */
export function VerifiedBadge({ level }: { level: string }) {
  if (level === 'verified') {
    return (
      <Badge className="gap-1 bg-sky-600 text-white hover:bg-sky-600">
        <BadgeCheckIcon className="size-3.5" />
        ID Verified
      </Badge>
    )
  }
  if (level === 'basic') {
    return (
      <Badge variant="secondary" className="gap-1">
        <ShieldCheckIcon className="size-3.5" />
        Verified
      </Badge>
    )
  }
  return null
}
