/**
 * lib/auth/password — password hashing (MIGRATION FOUNDATION, not yet in runtime use).
 * ===========================================================================
 * bcrypt via bcryptjs (pure JS — no native build). Cost 12. Critically,
 * bcryptjs verifies the `$2a$` hashes exported from Supabase's
 * auth.users.encrypted_password unchanged, so migrated users keep their
 * passwords (MIGRATION_BLUEPRINT.md §3.2). Pure; no DB, no session.
 */
import { hash, compare } from 'bcryptjs'

const BCRYPT_COST = 12

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_COST)
}

export function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed)
}
