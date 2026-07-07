/**
 * Runs every tests/authz/*.test.ts as its own process (each manages its own
 * seed + process.exit). Requires DATABASE_URL pointing at a local target DB
 * built from db/baseline. `npm run test:authz`.
 */
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (point it at the local target DB, not production).')
  process.exit(2)
}

const dir = 'tests/authz'
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort()

let rc = 0
for (const f of files) {
  console.log(`\n=== ${f} ===`)
  const r = spawnSync('node', ['--import', 'tsx', `${dir}/${f}`], { stdio: 'inherit', env: process.env })
  if (r.status) rc = 1
}
process.exit(rc)
