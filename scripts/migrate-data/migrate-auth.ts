/**
 * migrate-auth — move Supabase Auth state into the target auth tables.
 * ===========================================================================
 * Run AFTER the public-schema data has been copied (see run.sh), because it
 * updates the already-loaded public.users / profiles rows and inserts rows keyed
 * to them. Reads the SOURCE Supabase database's auth schema and writes the
 * TARGET's auth_credentials / auth_accounts + the verified flags:
 *
 *   auth.users.encrypted_password (bcrypt) → auth_credentials.password_hash
 *   auth.identities (provider='google')    → auth_accounts(provider, provider_account_id)
 *   auth.users.email_confirmed_at IS NOT NULL → users.has_email_verified + profiles.email_verified
 *   auth.users.phone_confirmed_at IS NOT NULL → users.phone_e164/has_mobile_verified + profiles.phone_verified
 *   auth.users.banned_until / deleted_at    → users.status (banned / deleted)
 *
 * Idempotent: credentials upsert, accounts insert-on-conflict, flag updates are
 * set-absolute. Safe to re-run.
 *
 * Env: SOURCE_DATABASE_URL (Supabase, read-only), TARGET_DATABASE_URL.
 * Run: node --env-file=.env.local --import tsx scripts/migrate-data/migrate-auth.ts
 */
import { Client } from 'pg'

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL
  const targetUrl = process.env.TARGET_DATABASE_URL
  if (!sourceUrl || !targetUrl) {
    console.error('Set SOURCE_DATABASE_URL (Supabase) and TARGET_DATABASE_URL.')
    process.exit(2)
  }

  const src = new Client({ connectionString: sourceUrl, application_name: 'migrate-auth-src' })
  const tgt = new Client({ connectionString: targetUrl, application_name: 'migrate-auth-tgt' })
  await src.connect()
  await tgt.connect()

  try {
    const users = (
      await src.query(`
        select id, email, encrypted_password, email_confirmed_at, phone, phone_confirmed_at,
               banned_until, deleted_at
        from auth.users`)
    ).rows as Array<{
      id: string
      email: string | null
      encrypted_password: string | null
      email_confirmed_at: Date | null
      phone: string | null
      phone_confirmed_at: Date | null
      banned_until: Date | null
      deleted_at: Date | null
    }>

    const identities = (
      await src.query(`select user_id, provider, provider_id from auth.identities where provider = 'google'`)
    ).rows as Array<{ user_id: string; provider: string; provider_id: string }>

    let creds = 0
    let accounts = 0
    let emailV = 0
    let phoneV = 0
    let statusChanged = 0

    await tgt.query('begin')

    for (const u of users) {
      // Credential (only for password accounts).
      if (u.encrypted_password) {
        await tgt.query(
          `insert into public.auth_credentials (user_id, password_hash)
           values ($1, $2)
           on conflict (user_id) do update set password_hash = excluded.password_hash`,
          [u.id, u.encrypted_password],
        )
        creds++
      }

      // Verified flags (mirror the sync triggers' end state).
      const emailVerified = u.email_confirmed_at != null
      const phoneVerified = u.phone_confirmed_at != null
      if (emailVerified) emailV++
      if (phoneVerified) phoneV++

      const status = u.deleted_at != null ? 'deleted' : u.banned_until != null && u.banned_until > new Date() ? 'banned' : null
      if (status) statusChanged++

      await tgt.query(
        `update public.users set
           has_email_verified = $2,
           has_mobile_verified = $3,
           phone_e164 = coalesce($4, phone_e164),
           status = coalesce($5, status)
         where id = $1`,
        [u.id, emailVerified, phoneVerified, phoneVerified ? u.phone : null, status],
      )
      await tgt.query(
        `update public.profiles set email_verified = $2, phone_verified = $3 where id = $1`,
        [u.id, emailVerified, phoneVerified],
      )
    }

    for (const idn of identities) {
      const res = await tgt.query(
        `insert into public.auth_accounts (user_id, provider, provider_account_id)
         values ($1, 'google', $2)
         on conflict (provider, provider_account_id) do nothing`,
        [idn.user_id, idn.provider_id],
      )
      accounts += res.rowCount ?? 0
    }

    await tgt.query('commit')

    console.log(
      JSON.stringify({
        users: users.length,
        credentials: creds,
        google_accounts: accounts,
        email_verified: emailV,
        phone_verified: phoneV,
        status_overrides: statusChanged,
      }),
    )
  } catch (e) {
    await tgt.query('rollback').catch(() => {})
    throw e
  } finally {
    await src.end()
    await tgt.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
