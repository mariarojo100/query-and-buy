/**
 * lib/auth/oauth — provider-identity → user resolution, shared by the Auth.js
 * signIn callback (web) and POST /api/v1/auth/{google,apple} (mobile).
 * Extracted from lib/auth/nextauth.ts: link by provider id, else by verified
 * email, else create the full account bundle (replacing the old
 * handle_new_user trigger's OAuth path). One implementation for both clients.
 */
import {
  findUserIdByOAuth,
  getUserIdByEmail,
  linkOAuthAccount,
  createUserAccount,
} from '@/lib/db/auth'

export type OAuthIdentity = {
  provider: 'google' | 'apple'
  providerAccountId: string
  email?: string | null
  /** false blocks link-by-email (unverified provider email); undefined = trusted. */
  emailVerified?: boolean
  name?: string | null
  avatarUrl?: string | null
}

/**
 * Resolve (or create) the local user for a provider identity.
 * Returns null only when a brand-new account would be needed but the provider
 * gave no usable (verified) email.
 */
export async function resolveOAuthUser(identity: OAuthIdentity): Promise<string | null> {
  const existing = await findUserIdByOAuth(identity.provider, identity.providerAccountId)
  if (existing) return existing

  const email = (identity.email ?? '').toLowerCase()
  if (!email || identity.emailVerified === false) return null

  const byEmail = await getUserIdByEmail(email)
  if (byEmail) {
    await linkOAuthAccount(byEmail, identity.provider, identity.providerAccountId)
    return byEmail
  }

  const created = await createUserAccount({
    email,
    displayName: identity.name ?? email.split('@')[0],
    oauth: { provider: identity.provider, providerAccountId: identity.providerAccountId },
    avatarUrl: identity.avatarUrl ?? null,
    emailVerified: true,
  })
  return created.id
}
