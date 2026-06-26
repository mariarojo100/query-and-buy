/**
 * Detects attempts to share contact details / off-platform links in chat
 * (Sprint 9). Deterministic — no AI. Used to BLOCK messages before they're
 * saved, so prohibited content never touches the database.
 */

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const URL = /\b(?:https?:\/\/|www\.)\S+/i
const DOMAIN = /\b[a-z0-9-]+\.(?:com|net|org|io|me|ae|co|link|gg|app|xyz|info|biz)\b/i
const SOCIAL =
  /\b(?:wa\.me|t\.me|bit\.ly|tinyurl|instagram|insta|whatsapp|whats\s*app|telegram|snapchat|snap\s*chat|facebook|messenger|paypal|venmo|zelle|qr\s*code)\b/i

/** Returns a short reason string when prohibited, otherwise null. */
export function detectProhibitedContact(text: string): string | null {
  const t = text ?? ''
  if (EMAIL.test(t)) return 'an email address'
  if (URL.test(t) || DOMAIN.test(t)) return 'a link'
  if (SOCIAL.test(t)) return 'an off-platform contact'

  // Phone numbers: strip common separators, then look for a 9+ digit run
  // (UAE mobiles like 0501234567 / +971501234567 are 10–12 digits).
  const stripped = t.replace(/[\s().+\-,]/g, '')
  if (/\d{9}/.test(stripped)) return 'a phone number'

  return null
}

export const CONTACT_BLOCK_MESSAGE =
  'Contact details are shared automatically once both parties confirm the order. Please negotiate here.'
