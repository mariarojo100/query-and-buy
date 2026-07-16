'use server'

import { revalidatePath } from 'next/cache'
import { getViewer } from '@/lib/auth/session'
import { emailUnverified } from '@/lib/authz/require-verified'
import { createConversationFor, markConversationReadFor, sendMessageFor } from '@/lib/db/messaging'
import { isContactRevealedForConversation } from '@/lib/db/orders'
import { detectProhibitedContact, CONTACT_BLOCK_MESSAGE } from '@/lib/safety/contact'
import { dispatch } from '@/lib/notifications/dispatch'

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

/** Send a message in a conversation (participant + not-blocked enforced in the repo). */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<{ ok?: boolean; error?: string; blocked?: boolean; needVerify?: boolean }> {
  const viewer = await getViewer()
  if (!viewer) return { error: 'You must be signed in.' }
  const gate = emailUnverified(viewer)
  if (gate) return gate

  const text = body.trim()
  if (!text) return { error: 'Message is empty.' }
  if (text.length > 2000) return { error: 'Message is too long (max 2000 characters).' }

  // Contact protection is STATE-AWARE: before the order is confirmed, contact
  // details are blocked. Once BOTH parties confirm (contact unlocked), they may
  // share freely — the intended post-confirmation contact-exchange flow.
  const contactUnlocked = await isContactRevealedForConversation(viewer, conversationId)
  if (!contactUnlocked && detectProhibitedContact(text)) {
    return { error: CONTACT_BLOCK_MESSAGE, blocked: true }
  }

  const res = await sendMessageFor(viewer, conversationId, text)
  if (!res.ok) {
    if (res.reason === 'blocked') return { error: 'This conversation is blocked.', blocked: true }
    return { error: 'You are not part of this conversation.' }
  }

  // Notify the other participant (in-app only — no email per message).
  await dispatch({
    recipientId: res.recipientId,
    type: 'new_message',
    title: 'New message',
    body: text.slice(0, 80),
    link: `/messages/${conversationId}`,
  })

  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
  return { ok: true }
}
