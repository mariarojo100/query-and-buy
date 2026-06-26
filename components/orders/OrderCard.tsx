'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ImageIcon, MessageSquareIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/components/profile/ProfileHeader'
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge'
import { SellerCompletionActions } from '@/components/orders/SellerCompletionActions'
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { confirmOrder } from '@/app/orders/actions'
import type { OrderListItem } from '@/lib/orders/queries'

export function OrderCard({ order, role }: { order: OrderListItem; role: 'buyer' | 'seller' }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const listing = order.listing
  const priceFils = order.acceptedPriceFils ?? listing?.price_fils ?? 0
  const myConfirmed = role === 'buyer' ? order.buyerConfirmed : order.sellerConfirmed
  const canConfirm =
    (order.status === 'offer_accepted' || order.status === 'awaiting_confirmation') && !myConfirmed
  const reserved = order.status === 'confirmed'
  const cancelledDeal = order.status === 'cancelled' && order.acceptedPriceFils != null

  function doConfirm() {
    start(async () => {
      const res = await confirmOrder(order.id)
      if (res.error) toast.error(res.error)
      else {
        toast.success('Confirmed')
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex gap-4">
        <Link
          href={listing ? `/listing/${listing.id}` : '#'}
          className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted"
        >
          {listing?.cover_key ? (
            <Image
              src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
              alt={listing.title_en}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-muted-foreground">
              <ImageIcon className="size-5 opacity-40" />
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={listing ? `/listing/${listing.id}` : '#'}
              className="font-display truncate text-base leading-tight hover:underline"
            >
              {listing?.title_en ?? 'Listing unavailable'}
            </Link>
            <OrderStatusBadge status={order.status} />
          </div>

          <p className="tnum mt-1 text-lg font-bold">{formatPrice(priceFils, listing?.currency ?? 'AED')}</p>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="size-5">
              <AvatarImage src={order.other?.avatar_url ?? undefined} alt={order.other?.display_name ?? ''} />
              <AvatarFallback className="text-[9px]">
                {initials(order.other?.display_name ?? '?')}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">
              {role === 'buyer' ? 'Seller' : 'Buyer'}: {order.other?.display_name ?? 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {order.conversationId && (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/messages/${order.conversationId}`}>
              <MessageSquareIcon className="size-4" /> Open chat
            </Link>
          </Button>
        )}
        {listing && (
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href={`/listing/${listing.id}`}>View listing</Link>
          </Button>
        )}
        {canConfirm && (
          <Button size="sm" className="ml-auto rounded-full" disabled={pending} onClick={doConfirm}>
            {role === 'buyer' ? 'Confirm purchase' : 'Confirm sale'}
          </Button>
        )}
        {myConfirmed &&
          (order.status === 'awaiting_confirmation' || order.status === 'offer_accepted') && (
            <span className="ml-auto self-center text-xs font-medium text-primary">
              ✓ You confirmed
            </span>
          )}
      </div>

      {/* reserved: seller completes; buyer waits */}
      {reserved && role === 'seller' && (
        <div className="mt-3 border-t border-border pt-3">
          <SellerCompletionActions orderId={order.id} />
        </div>
      )}
      {reserved && role === 'buyer' && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Waiting for the seller to complete the transaction.
        </p>
      )}
      {order.status === 'completed' && (
        <p className="mt-3 border-t border-border pt-3 text-xs font-medium text-success">
          ✓ Transaction completed
        </p>
      )}
      {cancelledDeal && (
        <p className="mt-3 border-t border-border pt-3 text-xs text-amber-700 dark:text-amber-400">
          {role === 'seller'
            ? 'Re-activated — back in search.'
            : 'Reservation cancelled by the seller.'}
        </p>
      )}
    </div>
  )
}
