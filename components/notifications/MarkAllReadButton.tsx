'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { markAllNotificationsRead } from '@/app/notifications/actions'

export function MarkAllReadButton() {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await markAllNotificationsRead()
          router.refresh()
        })
      }
    >
      Mark all read
    </Button>
  )
}
