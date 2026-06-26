'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

/** Auto-refreshes the conversation when messages, offers, or the order change. */
export function ConversationRealtime({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  useEffect(() => {
    const supabase = createClient()
    const refresh = () => router.refresh()
    const channel = supabase
      .channel(`conv:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'offers', filter: `conversation_id=eq.${conversationId}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `conversation_id=eq.${conversationId}` },
        refresh,
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, router])
  return null
}
