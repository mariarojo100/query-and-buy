'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  EyeIcon,
  HeartIcon,
  ImageIcon,
  MapPinIcon,
  MoreVerticalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  RocketIcon,
  TagIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatPrice, formatRelativeTime } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { BLUR_DATA_URL } from '@/lib/blur'
import { statusMeta } from '@/lib/listings/status'
import { emirateLabel } from '@/lib/profile/emirates'
import { markSold, setListingPaused, softDeleteListing } from '@/app/account/listings/actions'
import type { MyListing } from '@/lib/listings/queries'

export function PremiumListingCard({ listing }: { listing: MyListing }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const meta = statusMeta(listing.status)
  const location = [listing.area, emirateLabel(listing.emirate)].filter(Boolean).join(', ')
  const isActive = listing.status === 'active'
  const isPaused = listing.status === 'draft'

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, success: string) {
    start(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(success)
        router.refresh()
      }
    })
  }

  return (
    <div className="lift group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-float">
      <Link href={`/listing/${listing.id}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {listing.cover_key ? (
          <Image
            src={publicUrl(LISTING_IMAGES_BUCKET, listing.cover_key)}
            alt={listing.title_en}
            fill
            sizes="(max-width: 640px) 100vw, 360px"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-7 opacity-30" />
          </span>
        )}
        <div className="absolute inset-x-2 top-2 flex items-start justify-between">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm ${meta.className}`}
          >
            {meta.label}
          </span>
          {listing.is_featured && (
            <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              ★ Featured
            </span>
          )}
        </div>
      </Link>

      <div className="p-4">
        <h3 className="font-display line-clamp-1 text-base leading-snug">{listing.title_en}</h3>
        <p className="tnum mt-1 text-lg font-bold tracking-tight">
          {formatPrice(listing.price_fils, listing.currency)}
        </p>
        {location && (
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPinIcon className="size-3.5 shrink-0" />
            {location}
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="size-3.5" />
            {listing.view_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <HeartIcon className="size-3.5" />
            {listing.favorites_count}
          </span>
          <span>{formatRelativeTime(listing.created_at)}</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/listing/${listing.id}/edit`}>
              <PencilIcon className="size-4" /> Edit
            </Link>
          </Button>
          {isActive && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              disabled={pending}
              onClick={() => run(() => setListingPaused(listing.id, true), 'Listing paused')}
            >
              <PauseIcon className="size-4" /> Pause
            </Button>
          )}
          {isPaused && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              disabled={pending}
              onClick={() => run(() => setListingPaused(listing.id, false), 'Listing resumed')}
            >
              <PlayIcon className="size-4" /> Resume
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto size-8"
                disabled={pending}
                aria-label="More actions"
              >
                <MoreVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => toast.message('Paid promotion is coming soon.')}>
                <RocketIcon className="size-4" /> Promote
              </DropdownMenuItem>
              {isActive && (
                <DropdownMenuItem onSelect={() => run(() => markSold(listing.id), 'Marked as sold.')}>
                  <TagIcon className="size-4" /> Mark as sold
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault()
                  setConfirmOpen(true)
                }}
              >
                <Trash2Icon className="size-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              “{listing.title_en}” will be removed from the marketplace. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => run(() => softDeleteListing(listing.id), 'Listing deleted.')}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
