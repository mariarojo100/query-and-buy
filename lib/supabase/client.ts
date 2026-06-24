/**
 * Reusable Supabase client (anon / publishable key).
 *
 * This is the single place the app creates a Supabase client from the
 * public env vars. Import { supabase } from here everywhere else.
 *
 * The anon (publishable) key is safe in the browser — Row Level Security is
 * the authorization layer. The service_role key must NEVER be imported here.
 *
 * Ports into apps/web/lib/supabase/client.ts when the Next.js app is scaffolded.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
  )
}

if (url.includes('/rest/v1')) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL must be the base project URL ` +
      `(https://<ref>.supabase.co), not the REST endpoint. Got: ${url}`,
  )
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  // No browser session to persist in this Node harness.
  auth: { persistSession: false },
})
