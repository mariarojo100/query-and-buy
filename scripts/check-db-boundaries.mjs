#!/usr/bin/env node
/**
 * check-db-boundaries — enforce the data-access import fence.
 * ===========================================================================
 * With Postgres RLS gone, application-level scoping is only trustworthy if
 * feature code cannot reach the raw Prisma client or the privileged system
 * repositories. This is the dependency-free equivalent of an ESLint
 * `no-restricted-imports` rule (the repo lints with `tsc`, not ESLint).
 *
 * Rules:
 *   1. `@/lib/db` and `@/lib/db/index` (raw client) — only inside lib/db/**.
 *      Feature code imports a repository (`@/lib/db/listings`, …), never the client.
 *   2. `@/lib/db/system[/*]` (privileged repos) — only inside lib/db/** or the
 *      audited allowlist (the files that use the service-role client today).
 *   3. `@/lib/generated/prisma[/*]` (generated client/types) — only inside
 *      lib/db/** and lib/authz/**.
 *
 * Exit 1 on any violation. Wire into CI alongside `npm run typecheck`.
 * Run: `npm run check:boundaries`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath (not .pathname) so spaces in the project path are decoded
// correctly — otherwise readdir silently finds nothing and the guard no-ops.
const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SCAN_DIRS = ['app', 'components', 'lib', 'utils']

// Files legitimately allowed to import lib/db/system (cross-user access today
// via utils/supabase/admin.ts). Keep in sync with lib/db/system/index.ts.
const SYSTEM_ALLOWLIST = new Set([
  'app/admin/actions.ts',
  'lib/admin/queries.ts',
  'app/orders/actions.ts',
  'lib/notifications/dispatch.ts',
  'lib/reputation/queries.ts',
  'lib/reviews/queries.ts',
  'lib/listings/queries.ts',
  'lib/search/intelligence.ts',
  'lib/email/send.ts',
  'lib/safety/moderation-log.ts',
  'app/listing/actions.ts',
  'app/account/page.tsx',
])

const IMPORT_RE = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g

function walk(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...walk(full))
    else if (/\.(ts|tsx)$/.test(name)) out.push(full)
  }
  return out
}

const violations = []

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file)
    const inLibDb = rel.startsWith('lib/db/')
    const inLibAuthz = rel.startsWith('lib/authz/')
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2]
      if (!spec) continue

      const isRawClient = spec === '@/lib/db' || spec === '@/lib/db/index'
      const isSystem = spec === '@/lib/db/system' || spec.startsWith('@/lib/db/system/')
      const isGenerated = spec === '@/lib/generated/prisma' || spec.startsWith('@/lib/generated/prisma/')

      if (isRawClient && !inLibDb) {
        violations.push(`${rel}: imports raw Prisma client "${spec}" (allowed only in lib/db/**). Use a repository.`)
      }
      if (isSystem && !inLibDb && !SYSTEM_ALLOWLIST.has(rel)) {
        violations.push(`${rel}: imports privileged "${spec}" (not in system allowlist). See lib/db/system/index.ts.`)
      }
      if (isGenerated && !inLibDb && !inLibAuthz) {
        violations.push(`${rel}: imports generated Prisma "${spec}" (allowed only in lib/db/** and lib/authz/**).`)
      }
    }
  }
}

if (violations.length) {
  console.error(`Data-access boundary violations (${violations.length}):`)
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log('check-db-boundaries: OK (no forbidden imports).')
