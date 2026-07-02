/**
 * Presentation helpers that keep raw, system-generated identity values out of
 * the public UI. The signup trigger seeds `display_name` with `'New User'` and
 * `username` with a handle like `user_b7fc1fe9d305` — neither should ever be
 * shown as a seller's visible name.
 */

/** Auto-generated fallback handles, e.g. `user_b7fc1fe9d305`. */
const GENERATED_USERNAME_RE = /^user_[0-9a-f]{8,}$/i

/** Placeholder display names created before a user sets their own. */
const PLACEHOLDER_NAMES = new Set(['new user', 'new_user'])

/** Shown when a seller has no real, human-readable name yet. */
export const DEFAULT_SELLER_NAME = 'Query & Buy Seller'

/** A clean, human display name — never the placeholder or a raw handle. */
export function sellerName(displayName: string | null | undefined): string {
  const name = (displayName ?? '').trim()
  if (!name) return DEFAULT_SELLER_NAME
  if (PLACEHOLDER_NAMES.has(name.toLowerCase())) return DEFAULT_SELLER_NAME
  if (GENERATED_USERNAME_RE.test(name)) return DEFAULT_SELLER_NAME
  return name
}

/** True when the username is a system-generated placeholder handle. */
export function isGeneratedUsername(username: string | null | undefined): boolean {
  return !username || GENERATED_USERNAME_RE.test(username)
}

/** `@handle` only when it's a real, user-chosen username; otherwise `null`. */
export function publicHandle(username: string | null | undefined): string | null {
  return isGeneratedUsername(username) ? null : `@${username}`
}
