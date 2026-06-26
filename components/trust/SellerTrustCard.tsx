import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { TrustScore } from '@/components/trust/TrustScore'
import { VerificationBadges } from '@/components/trust/VerificationBadges'
import { computeTrust, type TrustInputs } from '@/lib/trust/score'

export type TrustSeller = TrustInputs & { id: string }

/** Concierge-style seller panel: hairline-divided, serif name, vetted feel. */
export function SellerTrustCard({ seller }: { seller: TrustSeller }) {
  const trust = computeTrust(seller)

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <p className="eyebrow mb-4">Seller</p>

      <Link
        href={seller.username ? `/u/${seller.username}` : '#'}
        className="flex items-center gap-4"
      >
        <Avatar className="size-14 ring-1 ring-border">
          <AvatarImage src={seller.avatar_url ?? undefined} alt={seller.display_name} />
          <AvatarFallback>{initials(seller.display_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-display truncate text-lg leading-tight">{seller.display_name}</p>
          {seller.username && (
            <p className="truncate text-sm text-muted-foreground">@{seller.username}</p>
          )}
        </div>
      </Link>

      <div className="my-5 h-px bg-border" />

      <TrustScore trust={trust} />
      <VerificationBadges trust={trust} className="mt-4" />

      <div className="my-5 h-px bg-border" />

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="eyebrow">Member since</dt>
          <dd className="mt-1.5 text-sm">{new Date(seller.member_since).getFullYear()}</dd>
        </div>
        <div>
          <dt className="eyebrow">Active listings</dt>
          <dd className="tnum mt-1.5 text-sm">{seller.listings_count}</dd>
        </div>
      </dl>
    </div>
  )
}
