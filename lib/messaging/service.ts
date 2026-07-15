/**
 * lib/messaging/service — sendMessage shared by the web action
 * (app/messages/actions.ts) and POST /api/v1/conversations/:id/messages.
 * Validation, contact protection, the repo write, and the in-app notification
 * live here; callers add session + cache concerns.
 */
import { sendMessageFor } from '@/lib/db/messaging'
import { detectProhibitedContact, CONTACT_BLOCK_MESSAGE } from '@/lib/safety/contact'
import { dispatch } from '@/lib/notifications/dispatch'
import type { Viewer } from '@/lib/authz/viewer'

export type SendMessageResult = { ok: true } | { ok: false; error: string; blocked?: boolean }

export async function sendMessageAs(
  viewer: Viewer,
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  const text = body.trim()
  if (!text) return { ok: false, error: 'Message is empty.' }
  if (text.length > 2000) return { ok: false, error: 'Message is too long (max 2000 characters).' }

  // Contact protection: prohibited content is NEVER written to the database.
  if (detectProhibitedContact(text)) return { ok: false, error: CONTACT_BLOCK_MESSAGE, blocked: true }

  const res = await sendMessageFor(viewer, conversationId, text)
  if (!res.ok) {
    if (res.reason === 'blocked') return { ok: false, error: 'This conversation is blocked.', blocked: true }
    return { ok: false, error: 'You are not part of this conversation.' }
  }

  // Notify the other participant (in-app only — no email per message).
  await dispatch({
    recipientId: res.recipientId,
    type: 'new_message',
    title: 'New message',
    body: text.slice(0, 80),
    link: `/messages/${conversationId}`,
  })

  return { ok: true }
}
