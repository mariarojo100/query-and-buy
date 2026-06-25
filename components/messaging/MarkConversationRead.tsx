'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { markConversationRead } from '@/app/messages/actions'

/**
 * Marks the conversation read for the current participant when the page opens,
 * then refreshes so the header / inbox unread badges update. Renders nothing.
 */
export function MarkConversationRead({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    markConversationRead(conversationId).then(() => router.refresh())
  }, [conversationId, router])

  return null
}
