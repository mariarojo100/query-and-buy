/**
 * lib/auth/session — getViewer(), the target-stack replacement for
 * `supabase.auth.getUser()`.
 * ===========================================================================
 * Reads the Auth.js session and loads the caller's roles into a `Viewer`
 * (lib/authz). React `cache()` dedupes the per-request DB roundtrip across the
 * many call sites that ask "who is the viewer?" in one render.
 */
import { cache } from 'react'
import { auth } from '@/lib/auth/nextauth'
import { loadViewer } from '@/lib/db/viewer'
import type { Viewer } from '@/lib/authz/viewer'

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id) return null
  return loadViewer(id, session.user.email ?? null)
})
