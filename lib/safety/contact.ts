/**
 * lib/safety/contact — deterministic contact-information detection.
 * ===========================================================================
 * Query & Buy keeps buyers and sellers on-platform: contact details are only
 * revealed after both parties confirm an order. This utility BLOCKS attempts to
 * share contact info in pre-confirmation user text (profile bio, listing
 * title/description, chat before confirmation).
 *
 * Layered + deterministic — NO AI (no per-keystroke model calls). It normalizes
 * common bypass tricks (full-width digits, zero-width spaces, spaced-out digits,
 * "[at]"/"[dot]", spelled-out numbers), then runs regex + keyword layers.
 *
 * PRIVACY: detection returns category REASONS ("a phone number"), never the raw
 * matched value — so reasons are safe to log. Callers store the user's ORIGINAL
 * text (we validate a normalized copy; we never persist the normalized form).
 */

// --- normalization ---------------------------------------------------------

// zero-width space, ZWNJ, ZWJ, BOM, word-joiner, soft hyphen
const ZERO_WIDTH = /[​‌‍﻿⁠­]/g

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4',
  five: '5', six: '6', seven: '7', eight: '8', nine: '9',
}
const NUMBER_WORD = 'zero|oh|one|two|three|four|five|six|seven|eight|nine'

/** Replace spelled-out digits with digits, incl. concatenated ("fivefourthree"). */
function despellDigits(s: string): string {
  return s.replace(new RegExp(NUMBER_WORD, 'g'), (m) => NUMBER_WORDS[m] ?? m)
}

/** Collapse separators BETWEEN digits: "0 5 4-3.9" → "05439". */
function collapseDigitSeparators(s: string): string {
  return s.replace(/(?<=\d)[\s.\-()]+(?=\d)/g, '')
}

/**
 * Normalize text for detection only (the original is what gets stored):
 *  - Unicode NFKC (folds full-width ０５４ → 054, ﹫ → @, etc.)
 *  - strip zero-width / soft-hyphen characters
 *  - lowercase
 *  - de-obfuscate "[at]"/"(dot)"/" at "/" dot " → @ / .
 *  - collapse single-digit spacing ("0 5 4 3" → "0543")
 */
export function normalizeForDetection(input: string): string {
  let s = (input ?? '').normalize('NFKC').replace(ZERO_WIDTH, '').toLowerCase()

  s = s
    .replace(/\s*[[({]\s*at\s*[\])}]\s*/g, '@') // [at] (at) {at}
    .replace(/\s*[[({]\s*dot\s*[\])}]\s*/g, '.') // [dot] (dot)
    .replace(/\s+at\s+(?=[a-z0-9.-]*(?:gmail|yahoo|hotmail|outlook|icloud|proton|mail))/g, '@')
    .replace(/([a-z0-9])\s+dot\s+(?=com|net|org|ae|io|co\b|me\b)/g, '$1.')

  s = collapseDigitSeparators(s)
  return s
}

// --- detection layers ------------------------------------------------------

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const URL_SCHEME = /\b(?:https?:\/\/|www\.)\S+/i
const TLDS = 'com|net|org|io|me|ae|co|link|gg|app|xyz|info|biz|store|shop|online|site|dev|tv'
const DOMAIN = new RegExp(`\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:${TLDS})\\b`, 'i')

const SOCIAL =
  /\b(?:wa\.me|t\.me|bit\.ly|tinyurl|whats\s*app|whatsapp|telegram|tele\s*gram|instagram|insta|snap\s*chat|snapchat|facebook|fb\.com|messenger|tik\s*tok|tiktok|linked\s*in|linkedin|discord|paypal|venmo|zelle)\b/i
const HANDLE = /(?:^|\s)@[a-z0-9._]{2,}\b/i
// requires a real delimiter after the abbr so it can't match inside words
// like "warranty" (wa…) or "figure" — "IG: handle", "WA - 05x", "fb me"
const PLATFORM_ABBR = /\b(?:ig|wa|tg|fb)[:\-\s]+@?[a-z0-9._]{2,}\b/i

const PHRASES: RegExp[] = [
  /\bcall\s+me\b/, /\bcontact\s+me\b/, /\bmessage\s+me\s+(?:on|at|via)\b/, /\btext\s+me\b/,
  /\bwhats?\s*app\s+me\b/, /\breach\s+me\b/, /\bfind\s+me\s+on\b/, /\bfollow\s+me\s+on\b/,
  /\bdm\s+me\b/, /\bcontact\s+(?:me\s+)?outside\b/, /\bcontact\s+us\s+(?:on|at|directly)\b/,
  /\bvisit\s+(?:our|my)\s+(?:website|site|store|shop)\b/,
  /\bsearch\s+(?:us|our\s+company)\b/, /\bsearch\s+.+?\s+on\s+(?:instagram|google|facebook|tiktok)\b/,
  /\bcheck\s+(?:us|me)\s+out\s+on\b/,
]

const CURRENCY = /(?:aed|dhs?|dh|rs|usd|eur|inr|\$|£|€)/

/** Category reason strings (safe to log — never the raw value). */
export type ContactReason =
  | 'an email address'
  | 'a link or website'
  | 'a social handle or platform'
  | 'a phone number'
  | 'off-platform contact wording'

export type ContactDetection = { blocked: boolean; reasons: ContactReason[] }

/**
 * Phone detection that does NOT flag prices, years, or spec numbers.
 * Prices (2,000,000 / AED 2000) are stripped first; then a run of 7–15 digits
 * (or 3+ consecutive spelled-out digits) is a phone. Allowed cases have <7
 * contiguous digits or are comma-grouped / currency-tagged.
 */
function hasPhone(normalized: string): boolean {
  // 3+ consecutive spelled-out digits: "nine seven one", "zero five four ..."
  if (new RegExp(`\\b(?:${NUMBER_WORD})(?:\\s+(?:${NUMBER_WORD})){2,}\\b`).test(normalized)) return true

  let s = despellDigits(normalized)
  s = s.replace(/\b\d{1,3}(?:,\d{3})+\b/g, ' ') // comma-grouped prices
  s = s.replace(new RegExp(`${CURRENCY.source}\\s?\\d[\\d.]*`, 'gi'), ' ') // currency amounts
  s = collapseDigitSeparators(s) // re-collapse after de-spelling
  return /\d{7,15}/.test(s)
}

/** Primary API: layered detection. `reasons` are categories, never raw matches. */
export function detectContactInfo(text: string): ContactDetection {
  const n = normalizeForDetection(text ?? '')
  const reasons = new Set<ContactReason>()

  if (EMAIL.test(n)) reasons.add('an email address')
  if (URL_SCHEME.test(n) || DOMAIN.test(n)) reasons.add('a link or website')
  if (SOCIAL.test(n) || HANDLE.test(n) || PLATFORM_ABBR.test(n)) reasons.add('a social handle or platform')
  if (PHRASES.some((re) => re.test(n))) reasons.add('off-platform contact wording')
  if (hasPhone(n)) reasons.add('a phone number')

  return { blocked: reasons.size > 0, reasons: [...reasons] }
}

/** Back-compat wrapper (messaging): a single reason string, or null. */
export function detectProhibitedContact(text: string): string | null {
  const { blocked, reasons } = detectContactInfo(text)
  return blocked ? reasons[0] : null
}

// --- display masking (legacy records) --------------------------------------

/**
 * Mask contact info for DISPLAY of legacy records that predate enforcement.
 * Non-destructive: stored text is unchanged; we only redact at render.
 */
export function maskContactInfo(text: string | null | undefined): string {
  if (!text) return text ?? ''
  let out = text
    .replace(new RegExp(EMAIL, 'gi'), '[contact detail hidden]')
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[contact detail hidden]')
    .replace(
      new RegExp(`\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:${TLDS})\\b(?:\\/\\S*)?`, 'gi'),
      '[contact detail hidden]',
    )
    .replace(/(?:^|\s)@[a-z0-9._]{2,}\b/gi, ' [contact detail hidden]')
  out = out.replace(/\+?\d[\d\s().-]{5,}\d/g, (m) => {
    if (/,\d{3}\b/.test(m)) return m // price grouping, keep
    return m.replace(/[^\d]/g, '').length >= 7 ? '[contact detail hidden]' : m
  })
  return out
}

/** Consistent user-facing copy. */
export const CONTACT_BLOCK_MESSAGE =
  'Contact details, social-media handles and external links aren’t allowed before an order is confirmed. Please use Query & Buy chat to communicate safely.'

/** Helper text for the profile bio field. */
export const BIO_CONTACT_HELPER =
  'Describe your business or products without adding phone numbers, email addresses, social handles or website links.'
