'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2Icon, MessageCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createConversation } from '@/app/messages/actions'

export function ContactSellerButton({
  listingId,
  authed,
}: {
  listingId: string
  authed: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!authed) {
      router.push(`/login?redirectTo=/listing/${listingId}`)
      return
    }
    startTransition(async () => {
      const res = await createConversation(listingId)
      if (res.needAuth) {
        router.push(`/login?redirectTo=/listing/${listingId}`)
      } else if (res.error || !res.conversationId) {
        toast.error(res.error ?? 'Could not start conversation.')
      } else {
        router.push(`/messages/${res.conversationId}`)
      }
    })
  }

  return (
    <Button size="lg" className="w-full" onClick={onClick} disabled={pending}>
      {pending ? <Loader2Icon className="size-4 animate-spin" /> : <MessageCircleIcon className="size-4" />}
      Contact seller
    </Button>
  )
}
