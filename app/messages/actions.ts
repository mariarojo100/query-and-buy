'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { createConversationFor, markConversationReadFor } from '@/lib/db/messaging'
import { sendMessageAs } from '@/lib/messaging/service'

/**
 * Open (or create) the conversation between the current user (buyer) and a
 * listing's seller. Idempotent via the unique (listing_id, buyer_id) constraint.
 */
export async function createConversation(
  listingId: string,
): Promise<{ conversationId?: string; error?: string; needAuth?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return { needAuth: true }
  const res = await createConversationFor(viewer, listingId)
  if (res.conversationId) revalidatePath('/messages')
  return res
}

/** Mark a conversation read for the current participant (sets their last_read_at). */
export async function markConversationRead(conversationId: string): Promise<{ ok?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return {}
  const ok = await markConversationReadFor(viewer, conversationId)
  if (ok) revalidatePath('/messages')
  return { ok }
}

/**
 * Send a message in a conversation. Validation, contact protection, and the
 * recipient notification live in lib/messaging/service.ts (shared with the
 * mobile API).
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok?: boolean; error?: string; blocked?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }

  const res = await sendMessageAs(viewer, conversationId, body)
  if (!res.ok) return { error: res.error, blocked: res.blocked }

  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  return { ok: true }
}
