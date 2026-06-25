import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for use in Client Components (browser).
 * Session is read from / written to cookies by @supabase/ssr.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
