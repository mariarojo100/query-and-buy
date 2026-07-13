'use client'

import { usePollingRefresh } from '@/lib/hooks/usePollingRefresh'

/**
 * Keeps the conversation fresh (new messages, offers, order changes) by polling
 * while the tab is visible. Replaces the Supabase Realtime subscription; an
 * optional SSE upgrade is designed in TARGET_ARCHITECTURE.md §6.
 */
export function ConversationRealtime({ conversationId }: { conversationId: string }) {
  void conversationId // reserved for a future per-conversation SSE channel
  usePollingRefresh(5000)
  return null
}
