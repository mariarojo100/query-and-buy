import type { DefaultSession } from 'next-auth'

// Expose our user id on the session and JWT (Auth.js wiring, Phase 3).
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string
  }
}
