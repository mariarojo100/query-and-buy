/**
 * Verifies the Supabase connection end-to-end.
 * Run with:  npm run verify
 *
 * Proves three independent things:
 *   1. The URL is the base project URL (not the REST endpoint).
 *   2. The project is reachable        -> GET /auth/v1/health returns 200.
 *   3. The anon key is accepted        -> a query to a missing table returns a
 *      PostgREST "table not found" error (success: routing + auth worked).
 */
import { supabase } from '../lib/supabase/client.ts'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

function fail(msg: string): never {
  console.error(`\n❌ FAIL: ${msg}`)
  process.exit(1)
}

async function main() {
  console.log('🔍 Verifying Supabase connection…\n')

  // 1. URL shape
  if (url.includes('/rest/v1')) {
    fail('NEXT_PUBLIC_SUPABASE_URL is the REST endpoint; use the base project URL.')
  }
  console.log(`1/3  URL shape OK  ->  ${new URL(url).origin}`)

  // 2. Reachability (auth health endpoint, no auth required)
  let health: Response
  try {
    health = await fetch(new URL('/auth/v1/health', url), {
      headers: { apikey: anonKey },
    })
  } catch (e) {
    fail(`Cannot reach the project (network/DNS): ${(e as Error).message}`)
  }
  if (!health.ok) fail(`Auth health check returned HTTP ${health.status}.`)
  console.log(`2/3  Reachable    ->  GET /auth/v1/health = ${health.status}`)

  // 3. Key accepted (query a table that should not exist)
  const { error } = await supabase.from('__connection_test__').select('*').limit(1)
  if (!error) {
    console.log('3/3  Key accepted ->  query succeeded (table exists).')
  } else if (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|could not find the table|find the table/i.test(error.message)
  ) {
    console.log('3/3  Key accepted ->  PostgREST replied "table not found" (expected).')
  } else if (
    /jwt|api key|invalid|unauthorized/i.test(error.message) ||
    (error as { status?: number }).status === 401
  ) {
    fail(`Key rejected by Supabase: ${error.message}`)
  } else {
    fail(`Unexpected error [${error.code ?? '?'}]: ${error.message}`)
  }

  console.log('\n✅ Supabase connection verified.')
}

main().catch((e) => fail((e as Error).message))
