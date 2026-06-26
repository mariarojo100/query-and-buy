import Link from 'next/link'
import Image from 'next/image'
import { ArrowRightIcon, ImageIcon } from 'lucide-react'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import type { ContinueItem } from '@/lib/personalization/queries'

export function ContinueNegotiation({ items }: { items: ContinueItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Link
          key={it.id}
          href={it.conversationId ? `/messages/${it.conversationId}` : '/messages'}
          className="lift flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
            {it.listing?.cover_key ? (
              <Image
                src={publicUrl(LISTING_IMAGES_BUCKET, it.listing.cover_key)}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-muted-foreground">
                <ImageIcon className="size-5 opacity-40" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{it.listing?.title_en ?? 'Listing'}</p>
            <p className="truncate text-xs text-muted-foreground">
              {it.role === 'buyer' ? 'Buying from' : 'Selling to'} {it.other?.display_name ?? 'Unknown'}
            </p>
            <span className="mt-1 inline-block rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] font-medium capitalize">
              {it.status.replace(/_/g, ' ')}
            </span>
          </div>
          <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  )
}
