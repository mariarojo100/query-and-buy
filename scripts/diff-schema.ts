/**
 * diff-schema.ts — MIGRATION_TASKS.md Phase 1 verification tool.
 *
 * Compares the SOURCE database (Supabase, `public` schema) against the TARGET
 * database (self-managed Postgres built from db/baseline/) and reports every
 * structural difference, classified as expected (the deliberate deviations in
 * MIGRATION_BLUEPRINT.md §2.1) or UNEXPECTED (a bug in the baseline).
 *
 * Usage:
 *   SOURCE_DATABASE_URL=postgres://...supabase...  \
 *   TARGET_DATABASE_URL=postgres://...target...    \
 *   npm run diff:schema
 *
 * Read-only: only pg_catalog / information_schema queries are issued.
 * Exit code 0 = no unexpected diffs; 1 = unexpected diffs found.
 */
import { Client } from 'pg'

// --- deliberate deviations (MIGRATION_BLUEPRINT.md §2.1, db/README.md) -------
const EXPECTED_SOURCE_ONLY_FUNCTIONS = new Set([
  'handle_new_user', 'sync_email_verified', 'sync_phone_verified',
  'ensure_self_profile', 'guard_phone_verified',
  'has_role', 'is_staff', 'is_admin', 'is_conversation_participant',
])
const EXPECTED_SOURCE_ONLY_TRIGGERS = new Set(['trg_guard_phone_verified'])
const EXPECTED_SOURCE_ONLY_CONSTRAINTS = new Set(['users_id_fkey']) // FK -> auth.users
const EXPECTED_TARGET_ONLY_TABLES = new Set([
  'auth_credentials', 'auth_accounts', 'auth_verification_tokens', 'auth_phone_otps',
])

// For runs whose TARGET is an embedded Postgres without PostGIS/pgvector
// (see db/README.md): allowlists the exactly-four constructs stripped there.
// NEVER set this when diffing against the real migration target.
const ALLOW_MISSING_POSTGIS_VECTOR = process.env.ALLOW_MISSING_POSTGIS_VECTOR === '1'
const POSTGIS_VECTOR_ITEMS = new Set([
  'listings.location', 'listing_embeddings.embedding', 'idx_listings_geo', 'idx_embeddings_ivf',
])

const norm = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim()
// Baseline drops SECURITY DEFINER from kept functions (no RLS to bypass).
const normFn = (s: string) => norm(s).replace(/ SECURITY DEFINER/i, '')

interface Snapshot {
  columns: Map<string, string>      // table.column -> type|nullable|default
  enums: Map<string, string>        // enum -> labels
  constraints: Map<string, string>  // table.conname -> def
  indexes: Map<string, string>      // indexname -> def
  triggers: Map<string, string>     // table.tgname -> def
  functions: Map<string, string>    // proname -> normalized def
  tables: Set<string>
}

async function snapshot(url: string, label: string): Promise<Snapshot> {
  const c = new Client({ connectionString: url, application_name: 'diff-schema' })
  await c.connect()
  try {
    const q = async (sql: string) => (await c.query(sql)).rows
    // Plain tables only, excluding extension-owned relations (e.g. PostGIS's
    // spatial_ref_sys) and views (e.g. geography_columns) — those come with
    // `create extension`, not with our DDL.
    const tables = new Set<string>(
      (await q(`
        select c.relname from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname='public' and c.relkind='r'
          and not exists (select 1 from pg_depend d where d.objid=c.oid and d.deptype='e')`)).map(r => r.relname),
    )
    const columns = new Map<string, string>()
    for (const r of await q(`
      select table_name, column_name, data_type, udt_name, is_nullable, column_default,
             coalesce(is_generated,'NEVER') is_generated
      from information_schema.columns where table_schema='public'
      order by table_name, column_name`)) {
      if (!tables.has(r.table_name)) continue
      columns.set(`${r.table_name}.${r.column_name}`,
        `${r.data_type}/${r.udt_name} null=${r.is_nullable} default=${norm(r.column_default)} gen=${r.is_generated}`)
    }
    const enums = new Map<string, string>()
    for (const r of await q(`
      select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) labels
      from pg_enum e join pg_type t on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname='public' group by t.typname`)) enums.set(r.typname, r.labels)
    const constraints = new Map<string, string>()
    for (const r of await q(`
      select rel.relname tbl, con.conname, pg_get_constraintdef(con.oid) def
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname='public'`)) {
      if (tables.has(r.tbl)) constraints.set(`${r.tbl}.${r.conname}`, norm(r.def))
    }
    const indexes = new Map<string, string>()
    for (const r of await q(`select tablename, indexname, indexdef from pg_indexes where schemaname='public'`))
      if (tables.has(r.tablename)) indexes.set(r.indexname, norm(r.indexdef))
    const triggers = new Map<string, string>()
    for (const r of await q(`
      select rel.relname tbl, t.tgname, pg_get_triggerdef(t.oid) def
      from pg_trigger t
      join pg_class rel on rel.oid = t.tgrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname='public' and not t.tgisinternal`)) triggers.set(`${r.tbl}.${r.tgname}`, norm(r.def))
    const functions = new Map<string, string>()
    for (const r of await q(`
      select p.proname, pg_get_functiondef(p.oid) def
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='public' and p.prokind='f'
        and not exists (select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')`))
      functions.set(r.proname, normFn(r.def))
    console.log(`snapshot ${label}: ${tables.size} tables, ${columns.size} columns, ${enums.size} enums, ` +
      `${constraints.size} constraints, ${indexes.size} indexes, ${triggers.size} triggers, ${functions.size} functions`)
    return { columns, enums, constraints, indexes, triggers, functions, tables }
  } finally {
    await c.end()
  }
}

let unexpected = 0
function report(kind: string, key: string, detail: string, expected: boolean) {
  if (!expected) unexpected++
  console.log(`${expected ? '  [expected]  ' : '  [UNEXPECTED]'} ${kind} ${key}${detail ? ` — ${detail}` : ''}`)
}

function diffMaps(
  kind: string, src: Map<string, string>, tgt: Map<string, string>,
  isExpected: (key: string, side: 'source-only' | 'target-only' | 'differs') => boolean,
) {
  for (const [k, v] of src) {
    if (!tgt.has(k)) report(kind, k, 'missing in target', isExpected(k, 'source-only'))
    else if (tgt.get(k) !== v)
      report(kind, k, `differs\n      source: ${v}\n      target: ${tgt.get(k)}`, isExpected(k, 'differs'))
  }
  for (const k of tgt.keys())
    if (!src.has(k)) report(kind, k, 'only in target', isExpected(k, 'target-only'))
}

async function main() {
  const srcUrl = process.env.SOURCE_DATABASE_URL ?? process.env.DATABASE_URL
  const tgtUrl = process.env.TARGET_DATABASE_URL
  if (!srcUrl || !tgtUrl) {
    console.error('Set SOURCE_DATABASE_URL (or DATABASE_URL) and TARGET_DATABASE_URL. Read-only; safe against production.')
    process.exit(2)
  }
  const [src, tgt] = [await snapshot(srcUrl, 'source'), await snapshot(tgtUrl, 'target')]

  // Matches table keys ("auth_credentials"), scoped keys ("auth_credentials.x"),
  // and constraint/index NAMES derived from auth tables ("auth_credentials_pkey").
  const onAuthTable = (key: string) =>
    [...EXPECTED_TARGET_ONLY_TABLES].some(t => key === t || key.startsWith(`${t}.`) || key.startsWith(`${t}_`)) ||
    key.startsWith('idx_auth_') || key.startsWith('uq_auth_')
  const postgisVectorOk = (key: string) => ALLOW_MISSING_POSTGIS_VECTOR && POSTGIS_VECTOR_ITEMS.has(key)

  console.log('--- tables ---')
  diffMaps('table', new Map([...src.tables].map(t => [t, ''])), new Map([...tgt.tables].map(t => [t, ''])),
    (k, side) => side === 'target-only' && EXPECTED_TARGET_ONLY_TABLES.has(k))
  console.log('--- columns ---')
  diffMaps('column', src.columns, tgt.columns, (k, side) =>
    (side === 'target-only' && onAuthTable(k)) || (side === 'source-only' && postgisVectorOk(k)))
  console.log('--- enums ---')
  diffMaps('enum', src.enums, tgt.enums, () => false)
  console.log('--- constraints ---')
  diffMaps('constraint', src.constraints, tgt.constraints, (k, side) => {
    if (side === 'source-only') return EXPECTED_SOURCE_ONLY_CONSTRAINTS.has(k.split('.')[1] ?? k)
    return side === 'target-only' && onAuthTable(k)
  })
  console.log('--- indexes ---')
  diffMaps('index', src.indexes, tgt.indexes, (k, side) =>
    (side === 'target-only' && onAuthTable(k)) || (side === 'source-only' && postgisVectorOk(k)))
  console.log('--- triggers ---')
  diffMaps('trigger', src.triggers, tgt.triggers, (k, side) => {
    if (side === 'source-only') return EXPECTED_SOURCE_ONLY_TRIGGERS.has(k.split('.')[1] ?? k)
    return side === 'target-only' && onAuthTable(k)
  })
  console.log('--- functions ---')
  diffMaps('function', src.functions, tgt.functions,
    (k, side) => side === 'source-only' && EXPECTED_SOURCE_ONLY_FUNCTIONS.has(k))

  console.log(unexpected === 0
    ? '\nRESULT: clean — no unexpected schema differences.'
    : `\nRESULT: ${unexpected} UNEXPECTED difference(s) — fix db/baseline/ (or the allowlists if a new deliberate deviation was added).`)
  process.exit(unexpected === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(2) })
