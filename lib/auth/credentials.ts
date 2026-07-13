/**
 * lib/auth/credentials — email/password verification, shared by the Auth.js
 * Credentials provider (web cookie flow) and POST /api/v1/auth/login (mobile
 * token flow). Extracted from lib/auth/nextauth.ts so there is exactly one
 * implementation of "is this email+password valid".
 */
import { getCredentialByEmail } from '@/lib/db/auth'
import { verifyPassword } from '@/lib/auth/password'

export type VerifiedCredentials = { userId: string; email: string | null }

/** Null on any failure (unknown email, no credential, banned/deleted, bad password). */
export async function verifyCredentials(
  rawEmail: string,
  password: string,
): Promise<VerifiedCredentials | null> {
  const email = rawEmail.trim().toLowerCase()
  if (!email || !password) return null
  const cred = await getCredentialByEmail(email)
  if (!cred || cred.status === 'banned' || cred.status === 'deleted') return null
  if (!(await verifyPassword(password, cred.passwordHash))) return null
  return { userId: cred.userId, email: cred.email ?? email }
}
