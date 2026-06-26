'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2Icon, Loader2Icon, RotateCcwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { markOrderSold, reactivateListing } from '@/app/orders/actions'

/** Seller-only Mark-as-Sold / Re-activate controls for a reserved order. */
export function SellerCompletionActions({
  orderId,
  onChanged,
}: {
  orderId: string
  onChanged?: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const refresh = () => (onChanged ? onChanged() : router.refresh())

  function run(fn: (id: string) => Promise<{ ok?: boolean; error?: string }>, success: string) {
    start(async () => {
      const res = await fn(orderId)
      if (res.error) toast.error(res.error)
      else {
        toast.success(success)
        refresh()
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Mark as Sold — premium green success */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            disabled={pending}
            className="rounded-full bg-success text-white shadow-sm transition hover:bg-success/90"
          >
            {pending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckCircle2Icon className="size-4" />
            )}
            Mark as Sold
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this item as sold?</AlertDialogTitle>
            <AlertDialogDescription>
              This completes the deal. The listing is removed from search, and you and the buyer can
              rate each other. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reserved</AlertDialogCancel>
            <AlertDialogAction
              className="bg-success text-white hover:bg-success/90"
              onClick={() => run(markOrderSold, 'Marked as sold')}
            >
              Mark as Sold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Re-activate — amber warning */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            className="rounded-full border-amber-300 text-amber-700 transition hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-950/30"
          >
            <RotateCcwIcon className="size-4" />
            Re-activate
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-activate this listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This cancels the current reservation and returns the item to search results. The buyer
              will be notified that the reservation was cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reserved</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-700"
              onClick={() => run(reactivateListing, 'Listing re-activated')}
            >
              Re-activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
