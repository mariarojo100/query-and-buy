/**
 * src/auth/AuthContext — session state for the whole app.
 * Hydrates from SecureStore on launch (then confirms via GET /me), exposes
 * login/signup/logout, and drops to logged-out browse when a refresh fails.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setSessionExpiredHandler } from '@/api/client'
import { getTokens, setTokens, clearTokens } from '@/auth/tokenStore'

export type SessionUser = {
  id: string
  email: string | null
  displayName: string
  username: string | null
  avatarUrl: string | null
}

type TokenPairResponse = {
  accessToken: string
  refreshToken: string
  user: SessionUser
}

type AuthState = {
  user: SessionUser | null
  /** false until the initial SecureStore hydration completes. */
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null))
    void (async () => {
      try {
        const tokens = await getTokens()
        if (tokens) {
          const me = await api<{ id: string; email: string | null; profile: { display_name: string; username: string | null; avatar_url: string | null } | null }>('/me')
          setUser({
            id: me.id,
            email: me.email,
            displayName: me.profile?.display_name ?? 'You',
            username: me.profile?.username ?? null,
            avatarUrl: me.profile?.avatar_url ?? null,
          })
        }
      } catch {
        /* stay logged out; browse works anonymously */
      } finally {
        setReady(true)
      }
    })()
  }, [])

  const applySession = useCallback(async (pair: TokenPairResponse) => {
    await setTokens({ accessToken: pair.accessToken, refreshToken: pair.refreshToken })
    setUser(pair.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const pair = await api<TokenPairResponse>('/auth/login', { body: { email, password }, anonymous: true })
      await applySession(pair)
    },
    [applySession],
  )

  const signup = useCallback(
    async (email: string, password: string, displayName: string) => {
      const pair = await api<TokenPairResponse>('/auth/signup', {
        body: { email, password, displayName },
        anonymous: true,
      })
      await applySession(pair)
    },
    [applySession],
  )

  const logout = useCallback(async () => {
    const tokens = await getTokens()
    if (tokens?.refreshToken) {
      await api('/auth/logout', { body: { refreshToken: tokens.refreshToken }, anonymous: true }).catch(() => {})
    }
    await clearTokens()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await api<{ id: string; email: string | null; profile: { display_name: string; username: string | null; avatar_url: string | null } | null }>('/me')
    setUser({
      id: me.id,
      email: me.email,
      displayName: me.profile?.display_name ?? 'You',
      username: me.profile?.username ?? null,
      avatarUrl: me.profile?.avatar_url ?? null,
    })
  }, [])

  const value = useMemo(
    () => ({ user, ready, login, signup, logout, refreshUser }),
    [user, ready, login, signup, logout, refreshUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
