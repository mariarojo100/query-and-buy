/**
 * lib/auth/nextauth — the Node Auth.js instance (Credentials + Google).
 * ===========================================================================
 * Adds the DB-backed pieces to the edge-safe base (config.ts): the Credentials
 * `authorize` (bcrypt vs auth_credentials) and the Google `signIn` callback
 * (link by verified email or create the full account bundle — replacing the
 * handle_new_user trigger's OAuth path). Runs only in Node (route handler,
 * server components/actions), never in middleware.
 */
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/lib/auth/config'
import { verifyPassword } from '@/lib/auth/password'
import {
  getCredentialByEmail,
  findUserIdByOAuth,
  getUserIdByEmail,
  linkOAuthAccount,
  createUserAccount,
  markEmailVerified,
} from '@/lib/db/auth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? '').trim().toLowerCase()
        const password = String(creds?.password ?? '')
        if (!email || !password) return null
        const cred = await getCredentialByEmail(email)
        if (!cred || cred.status === 'banned' || cred.status === 'deleted') return null
        if (!(await verifyPassword(password, cred.passwordHash))) return null
        // Email must be confirmed before the account can be used. The login
        // action detects this case and re-sends the confirmation link.
        if (!cred.emailVerified) return null
        return { id: cred.userId, email: cred.email ?? email }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // Credentials sign-ins are already validated in authorize().
      if (account?.provider !== 'google') return true
      const sub = account.providerAccountId
      const p = profile as { email?: string; email_verified?: boolean; name?: string; picture?: string } | undefined

      let uid = await findUserIdByOAuth('google', sub)
      if (!uid) {
        const email = (p?.email ?? user.email ?? '').toLowerCase()
        if (!email || p?.email_verified === false) return false
        const existing = await getUserIdByEmail(email)
        if (existing) {
          await linkOAuthAccount(existing, 'google', sub)
          // Google has verified this address (email_verified !== false above), so
          // confirm the account — otherwise a provider-verified user could still
          // be blocked from selling/buying by a stale unverified flag.
          await markEmailVerified(existing)
          uid = existing
        } else {
          const created = await createUserAccount({
            email,
            displayName: p?.name ?? user.name ?? email.split('@')[0],
            oauth: { provider: 'google', providerAccountId: sub },
            avatarUrl: p?.picture ?? user.image ?? null,
            emailVerified: true,
          })
          uid = created.id
        }
      }
      // Ensure the JWT carries OUR user id, not Google's account id.
      user.id = uid
      return true
    },
  },
})
