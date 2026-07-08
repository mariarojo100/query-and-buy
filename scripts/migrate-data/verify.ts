/**
 * verify — post-migration reconciliation of SOURCE (Supabase) vs TARGET.
 * ===========================================================================
 * Checks (gates unfreeze at cutover):
 *   1. Per-table row counts match across all 27 public tables.
 *   2. Per-table id checksum matches (md5 of the sorted id list).
 *   3. Credential fidelity: sampled auth.users.encrypted_password equals the
 *      target auth_credentials.password_hash (bcrypt copied verbatim).
 *   4. auth_accounts count == source google identities count.
 *   5. No profiles.avatar_url still points at a Supabase storage path.
 * Exit 0 if everything matches; 1 otherwise.
 *
 * Env: SOURCE_DATABASE_URL, TARGET_DATABASE_URL.
 * Run: node --env-file=.env.local --import tsx scripts/migrate-data/verify.ts
 */
import { Client } from 'pg'

const TABLES = [
  'users', 'profiles', 'user_roles', 'categories', 'listings', 'listing_images', 'listing_embeddings',
  'price_suggestions', 'conversations', 'messages', 'saved_searches', 'favorites', 'verification_requests',
  'reports', 'admin_actions', 'orders', 'offers', 'reviews', 'notifications', 'email_failures',
  'notification_preferences', 'admin_audit_log', 'ai_moderation_log', 'marketplace_settings',
  'listing_views', 'search_log', 'feedback',
]
// Tables without a scalar `id` (composite/text PK) — count-only.
const NO_ID = new Set(['user_roles', 'favorites', 'listing_views', 'notification_preferences', 'listing_embeddings', 'marketplace_settings'])

async function counts(c: Client, table: string): Promise<number> {
  return (await c.query(`select count(*)::int n from public.${table}`)).rows[0].n
}
async function idChecksum(c: Client, table: string): Promise<string> {
  const r = await c.query(`select coalesce(md5(string_agg(id::text, ',' order by id)), '') h from public.${table}`)
  return r.rows[0].h
}

let failures = 0
function check(name: string, cond: boolean, detail = '') {
  if (!cond) {
    failures++
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`)
  } else {
    console.log(`OK   ${name}`)
  }
}

async function main() {
  const src = new Client({ connectionString: process.env.SOURCE_DATABASE_URL, application_name: 'verify-src' })
  const tgt = new Client({ connectionString: process.env.TARGET_DATABASE_URL, application_name: 'verify-tgt' })
  if (!process.env.SOURCE_DATABASE_URL || !process.env.TARGET_DATABASE_URL) {
    console.error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL.')
    process.exit(2)
  }
  await src.connect()
  await tgt.connect()
  try {
    for (const t of TABLES) {
      const [cs, ct] = await Promise.all([counts(src, t), counts(tgt, t)])
      check(`count ${t} (${cs} → ${ct})`, cs === ct)
      if (!NO_ID.has(t)) {
        const [hs, ht] = await Promise.all([idChecksum(src, t), idChecksum(tgt, t)])
        check(`checksum ${t}`, hs === ht)
      }
    }

    // Credential fidelity — sample up to 20 password users.
    const sample = (
      await src.query(`select id, encrypted_password from auth.users where encrypted_password is not null limit 20`)
    ).rows as Array<{ id: string; encrypted_password: string }>
    let credOk = true
    for (const u of sample) {
      const r = await tgt.query(`select password_hash from public.auth_credentials where user_id = $1`, [u.id])
      if (r.rows[0]?.password_hash !== u.encrypted_password) credOk = false
    }
    check(`credential hashes copied verbatim (${sample.length} sampled)`, credOk)

    const gid = (await src.query(`select count(*)::int n from auth.identities where provider = 'google'`)).rows[0].n
    const acc = (await tgt.query(`select count(*)::int n from public.auth_accounts where provider = 'google'`)).rows[0].n
    check(`google accounts (${gid} → ${acc})`, gid === acc)

    const stale = (
      await tgt.query(`select count(*)::int n from public.profiles where avatar_url like '%/storage/v1/object/public/%'`)
    ).rows[0].n
    check('no Supabase avatar URLs remain', stale === 0, `${stale} remaining`)

    console.log(failures === 0 ? '\nRESULT: reconciliation clean' : `\nRESULT: ${failures} check(s) FAILED`)
    process.exit(failures === 0 ? 0 : 1)
  } finally {
    await src.end()
    await tgt.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
