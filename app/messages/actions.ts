'use server'

/**
 * Messaging actions — thin web wrappers. Verification, contact protection, and
 * recipient notifications live in the shared services (lib/messaging/service,
 * lib/db/messaging) so the mobile API enforces the same rules.
 */
import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { emailUnverified } from '@/lib/authz/require-verified'
import { createConversationFor, markConversationReadFor } from '@/lib/db/messaging'
import { sendMessageAs } from '@/lib/messaging/service'

/**
 * Open (or create) the conversation between the current user (buyer) and a
 * listing's seller. Idempotent via the unique (listing_id, buyer_id) constraint.
 */
export async function createConversation(
  listingId: string,
): Promise<{ conversationId?: string; error?: string; needAuth?: boolean; needVerify?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return { needAuth: true }
  const gate = emailUnverified(viewer)
  if (gate) return gate
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

/** Send a message — validation, verification, contact protection, and the
 *  recipient notification all live in lib/messaging/service.ts (shared). */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok?: boolean; error?: string; blocked?: boolean; needVerify?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  const res = await sendMessageAs(viewer, conversationId, body)
  if (!res.ok) return { error: res.error, blocked: res.blocked, needVerify: res.needVerify }
  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  return { ok: true }
}
