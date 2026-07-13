/**
 * rewrite-avatar-urls — repoint profiles.avatar_url from the Supabase Storage
 * host to the target host (TARGET only). listing_images store keys, not URLs,
 * so they need no rewrite; only avatars store a full URL.
 * ===========================================================================
 * Env: TARGET_DATABASE_URL, NEXT_PUBLIC_STORAGE_BASE_URL, and the source host
 * (SOURCE_SUPABASE_URL, e.g. https://REF.supabase.co).
 * Run: node --env-file=.env.local --import tsx scripts/migrate-data/rewrite-avatar-urls.ts
 */
import { Client } from 'pg'

async function main() {
  const targetUrl = process.env.TARGET_DATABASE_URL
  const newBase = process.env.NEXT_PUBLIC_STORAGE_BASE_URL
  const supabaseUrl = process.env.SOURCE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!targetUrl || !newBase || !supabaseUrl) {
    console.error('Set TARGET_DATABASE_URL, NEXT_PUBLIC_STORAGE_BASE_URL, and SOURCE_SUPABASE_URL.')
    process.exit(2)
  }
  const oldPrefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/avatars/`
  const newPrefix = `${newBase.replace(/\/$/, '')}/avatars/`

  const tgt = new Client({ connectionString: targetUrl, application_name: 'rewrite-avatars' })
  await tgt.connect()
  try {
    const res = await tgt.query(
      `update public.profiles
       set avatar_url = $2 || substring(avatar_url from char_length($1) + 1)
       where avatar_url like $1 || '%'`,
      [oldPrefix, newPrefix],
    )
    const remaining = await tgt.query(
      `select count(*)::int as n from public.profiles where avatar_url like '%/storage/v1/object/public/%'`,
    )
    console.log(JSON.stringify({ rewritten: res.rowCount ?? 0, supabase_urls_remaining: remaining.rows[0].n }))
    if (remaining.rows[0].n > 0) {
      console.error('WARNING: some avatar_url values still point at a Supabase storage path.')
      process.exit(1)
    }
  } finally {
    await tgt.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
