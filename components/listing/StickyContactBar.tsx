import { ContactSellerButton } from '@/components/listing/ContactSellerButton'

/** Mobile-only sticky purchase bar: price + prominent Contact action. */
export function StickyContactBar({
  listingId,
  authed,
  priceLabel,
}: {
  listingId: string
  authed: boolean
  priceLabel: string
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-5 py-3 backdrop-blur sm:hidden"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.6rem)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Price</p>
          <p className="tnum truncate text-lg font-semibold leading-tight">{priceLabel}</p>
        </div>
        <div className="flex-1">
          <ContactSellerButton listingId={listingId} authed={authed} />
        </div>
      </div>
    </div>
  )
}
