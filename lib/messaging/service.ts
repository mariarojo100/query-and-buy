/**
 * lib/messaging/service — sendMessage shared by the web action
 * (app/messages/actions.ts) and POST /api/v1/conversations/:id/messages.
 * Contact protection is STATE-AWARE: before the order is confirmed, contact
 * details (phone/email/links/handles) are blocked; once BOTH parties confirm
 * and contact is unlocked, they may share freely. The mobile API inherits this
 * exact rule because it funnels through here.
 */
import { sendMessageFor } from '@/lib/db/messaging'
import { isContactRevealedForConversation } from '@/lib/db/orders'
import { detectProhibitedContact, CONTACT_BLOCK_MESSAGE } from '@/lib/safety/contact'
import { emailUnverified } from '@/lib/authz/require-verified'
import { dispatch } from '@/lib/notifications/dispatch'
import { publicUrl, LISTING_IMAGES_BUCKET } from '@/lib/storage'
import type { Viewer } from '@/lib/authz/viewer'

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export type SendMessageResult = { ok: true } | { ok: false; error: string; blocked?: boolean; needVerify?: boolean }

export async function sendMessageAs(
  viewer: Viewer,
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  // Contacting a seller requires a confirmed email — enforced here so the
  // mobile API (which calls this directly) can't skip it.
  const gate = emailUnverified(viewer)
  if (gate) return { ok: false, error: gate.error, needVerify: true }

  const text = body.trim()
  if (!text) return { ok: false, error: 'Message is empty.' }
  if (text.length > 2000) return { ok: false, error: 'Message is too long (max 2000 characters).' }

  // State-aware contact protection: blocked before the deal is confirmed, then
  // allowed once contact is unlocked (the intended post-confirmation exchange).
  const contactUnlocked = await isContactRevealedForConversation(viewer, conversationId)
  if (!contactUnlocked && detectProhibitedContact(text)) {
    return { ok: false, error: CONTACT_BLOCK_MESSAGE, blocked: true }
  }

  const res = await sendMessageFor(viewer, conversationId, text)
  if (!res.ok) {
    if (res.reason === 'blocked') return { ok: false, error: 'This conversation is blocked.', blocked: true }
    return { ok: false, error: 'You are not part of this conversation.' }
  }

  // Email ONLY on the very first message (the "someone reached out" event);
  // every later message is an in-app notification only, to avoid inbox spam.
  const link = `/messages/${conversationId}`
  if (res.firstContact) {
    await dispatch({
      recipientId: res.recipientId,
      type: 'new_inquiry',
      title: 'New inquiry',
      body: `${res.senderName} · ${res.listingTitle}`,
      link,
      email: {
        kind: 'new_inquiry',
        data: {
          listingTitle: res.listingTitle,
          listingImageUrl: res.coverKey ? publicUrl(LISTING_IMAGES_BUCKET, res.coverKey) : null,
          buyerName: res.senderName,
          ctaUrl: `${APP_URL}${link}`,
        },
      },
    })
  } else {
    await dispatch({
      recipientId: res.recipientId,
      type: 'new_message',
      title: 'New message',
      body: text.slice(0, 80),
      link,
    })
  }

  return { ok: true }
}
