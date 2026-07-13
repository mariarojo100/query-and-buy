/**
 * lib/auth/config — edge-safe Auth.js base config.
 * ===========================================================================
 * Split-config pattern (Auth.js "edge compatibility"): this half contains NO
 * database or Node-only code, so it can run in `middleware.ts` on the edge. The
 * Credentials provider (which needs bcrypt + Prisma) and the DB-backed `signIn`
 * callback are added only in the Node instance (nextauth.ts).
 *
 * Roles/isAdmin are intentionally NOT embedded in the token — the JWT carries
 * just the user id; getViewer() (Node) loads roles from the DB per request.
 */
import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

export const authConfig = {
  providers: [Google],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id
      return token
    },
    session({ session, token }) {
      if (typeof token.uid === 'string') session.user.id = token.uid
      return session
    },
  },
} satisfies NextAuthConfig
