/**
 * lib/phone/e164 — E.164 normalization + the country list for the UI selector.
 * ===========================================================================
 * Pure, dependency-free. Twilio Verify does the authoritative number validation
 * (and will reject unroutable numbers); this is the cheap client-and-server
 * shared normalizer so we send a consistent `+<cc><national>` string.
 */

/** E.164: leading + then 8–15 digits, first digit non-zero. */
export const E164_RE = /^\+[1-9]\d{7,14}$/

export type Country = { iso: string; name: string; dial: string; flag: string }

/** UAE-first, then GCC + the most common expat origin countries. Extend freely. */
export const COUNTRIES: Country[] = [
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦' },
  { iso: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦' },
  { iso: 'KW', name: 'Kuwait', dial: '965', flag: '🇰🇼' },
  { iso: 'BH', name: 'Bahrain', dial: '973', flag: '🇧🇭' },
  { iso: 'OM', name: 'Oman', dial: '968', flag: '🇴🇲' },
  { iso: 'IN', name: 'India', dial: '91', flag: '🇮🇳' },
  { iso: 'PK', name: 'Pakistan', dial: '92', flag: '🇵🇰' },
  { iso: 'BD', name: 'Bangladesh', dial: '880', flag: '🇧🇩' },
  { iso: 'PH', name: 'Philippines', dial: '63', flag: '🇵🇭' },
  { iso: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬' },
  { iso: 'JO', name: 'Jordan', dial: '962', flag: '🇯🇴' },
  { iso: 'LB', name: 'Lebanon', dial: '961', flag: '🇱🇧' },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸' },
]

export const DEFAULT_COUNTRY = COUNTRIES[0] // UAE

/**
 * Combine a dial code + a national number into E.164, or null if the result
 * isn't a plausible E.164 string. Strips spaces, dashes, parens, and a leading
 * 0 from the national part (common trunk prefix).
 */
export function toE164(dial: string, national: string): string | null {
  const cc = dial.replace(/[^\d]/g, '')
  const nn = national.replace(/[^\d]/g, '').replace(/^0+/, '')
  if (!cc || !nn) return null
  const candidate = `+${cc}${nn}`
  return E164_RE.test(candidate) ? candidate : null
}

/**
 * Normalize a value that may already be full E.164 (starts with +) or may be a
 * bare national number needing the given dial code. Returns null if invalid.
 */
export function normalizeE164(input: string, dial?: string): string | null {
  const trimmed = input.trim()
  if (trimmed.startsWith('+')) {
    const candidate = '+' + trimmed.slice(1).replace(/[^\d]/g, '')
    return E164_RE.test(candidate) ? candidate : null
  }
  if (dial) return toE164(dial, trimmed)
  return null
}
