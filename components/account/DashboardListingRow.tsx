'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { EyeIcon, ImageIcon, MoreVerticalIcon, PencilIcon, TagIcon, Trash2Icon } from 'lucide-react'
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
import { formatPrice } from '@/lib/format'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import { statusMeta } from '@/lib/listings/status'
import { markSold, softDeleteListing } from '@/app/account/listings/actions'
import type { MyListing } from '@/lib/listings/queries'

export function DashboardListingRow({ listing }: { listing: MyListing }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const meta = statusMeta(listing.status)

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else {
        toast.success(success)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex items-center gap-3 p-3">
      <Link
        href={`/listing/${listing.id}`}
        className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted sm:size-20"
      >
        {listing.cover_key ? (
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
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
          <span className="truncate text-sm font-medium">{listing.title_en}</span>
        </div>
        <p className="mt-0.5 text-sm font-semibold">
          {formatPrice(listing.price_fils, listing.currency)}
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{new Date(listing.created_at).toLocaleDateString()}</span>
          <span className="inline-flex items-center gap-1">
            <EyeIcon className="size-3.5" />
            {listing.view_count}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending} aria-label="Listing actions">
            <MoreVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/listing/${listing.id}`}>
              <EyeIcon className="size-4" /> View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/listing/${listing.id}/edit`}>
              <PencilIcon className="size-4" /> Edit
            </Link>
          </DropdownMenuItem>
          {listing.status === 'active' && (
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
