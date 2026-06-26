/**
 * Simple admin gate — no role system, no auth redesign.
 * Admins are listed (comma-separated) in the ADMIN_EMAILS env var.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}
