import { getViewer } from '@/lib/auth/session'
import * as repo from '@/lib/db/messaging'

export type {
  Participant,
  ListingSummary,
  InboxItem,
  ConversationMessage,
  ConversationView,
} from '@/lib/db/messaging'

/** All conversations for the current user, newest activity first (participant-scoped). */
export async function getUserConversations(): Promise<repo.InboxItem[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return repo.conversationsFor(viewer)
}

export async function getUnreadConversationCount(): Promise<number> {
  const viewer = await getViewer()
  if (!viewer) return 0
  return repo.unreadConversationCountFor(viewer)
}

/** Header data + access check for a conversation. Null if not a participant. */
export async function getConversationView(conversationId: string): Promise<repo.ConversationView | null> {
  const viewer = await getViewer()
  if (!viewer) return null
  return repo.conversationViewFor(viewer, conversationId)
}

/** Ordered message thread — only if the viewer is a participant (else empty). */
export async function getConversationMessages(conversationId: string): Promise<repo.ConversationMessage[]> {
  const viewer = await getViewer()
  if (!viewer) return []
  return repo.conversationMessagesFor(viewer, conversationId)
}
