import { BadgeCheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Corner verification badge for a profile avatar.
 *
 * Shown ONLY when the account is FULLY verified — i.e. BOTH email AND phone
 * have been verified. This is the single visual signal of a fully-verified
 * identity; a half-verified account (only email, or only phone) shows nothing
 * here. Compute `verified = email_verified && phone_verified` at the call site.
 *
 * Render it inside a `relative` wrapper around the avatar so it pins to the
 * avatar's bottom-right corner.
 */
export function VerifiedAvatarBadge({
  verified,
  size = 'md',
  className,
}: {
  verified: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  if (!verified) return null

  const box = size === 'lg' ? 'size-8' : size === 'sm' ? 'size-5' : 'size-7'

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 grid place-items-center rounded-full bg-card shadow-soft ring-2 ring-card',
        box,
        className,
      )}
      title="Verified — email and phone confirmed"
      aria-label="Verified account: email and phone confirmed"
    >
      <BadgeCheckIcon className="size-full fill-gold text-card" aria-hidden />
    </span>
  )
}
