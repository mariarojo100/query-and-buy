'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, MessageCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createConversation } from '@/app/messages/actions'

/**
 * "Message seller" CTA for the public profile.
 *
 * NOTE: conversations are listing-bound in the current data model
 * (`conversations.listing_id` is NOT NULL, one thread per buyer per listing).
 * There is no user-to-user thread yet, so this anchors the conversation to the
 * seller's most recent active listing and reuses the existing
 * `createConversation` action — the same flow as the listing "Contact seller"
 * button. When a seller has no active listings we don't render this button
 * (the page shows only the report action instead). A future listing-less
 * `getOrCreateConversation(sellerId)` action could drop the `listingId` prop.
 */
export function MessageSellerButton({
  listingId,
  username,
  authed,
}: {
  listingId: string
  username: string
  authed: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const loginHref = `/login?redirectTo=${encodeURIComponent(`/u/${username}`)}`

  function onClick() {
    if (!authed) {
      router.push(loginHref)
      return
    }
    startTransition(async () => {
      const res = await createConversation(listingId)
      if (res.needAuth) {
        router.push(loginHref)
      } else if (res.error || !res.conversationId) {
        toast.error(res.error ?? 'Could not start conversation.')
      } else {
        router.push(`/messages/${res.conversationId}`)
      }
    })
  }

  return (
    <Button onClick={onClick} disabled={pending}>
      {pending ? (
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
      ) : (
        <MessageCircleIcon className="size-4" aria-hidden />
      )}
      Message seller
    </Button>
  )
}
