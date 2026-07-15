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
import { verifyCredentials } from '@/lib/auth/credentials'
import { resolveOAuthUser } from '@/lib/auth/oauth'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const verified = await verifyCredentials(
          String(creds?.email ?? ''),
          String(creds?.password ?? ''),
        )
        return verified ? { id: verified.userId, email: verified.email } : null
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account, profile }) {
      // Credentials sign-ins are already validated in authorize().
      if (account?.provider !== 'google') return true
      const p = profile as
        | { email?: string; email_verified?: boolean; name?: string; picture?: string }
        | undefined

      const uid = await resolveOAuthUser({
        provider: 'google',
        providerAccountId: account.providerAccountId,
        email: p?.email ?? user.email,
        emailVerified: p?.email_verified,
        name: p?.name ?? user.name,
        avatarUrl: p?.picture ?? user.image ?? null,
      })
      if (!uid) return false
      // Ensure the JWT carries OUR user id, not Google's account id.
      user.id = uid
      return true
    },
  },
})
