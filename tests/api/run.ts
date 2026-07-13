/**
 * Runs every tests/api/*.test.ts as its own process (mirrors tests/authz/run.ts).
 * Requires DATABASE_URL (a disposable test DB built from db/baseline +
 * db/migrations) and API_JWT_SECRET. `npm run test:api`.
 */
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (point it at a disposable test DB, not production).')
  process.exit(2)
}
if (!process.env.API_JWT_SECRET) {
  console.error('API_JWT_SECRET is required (any 32+ char string for tests).')
  process.exit(2)
}

const dir = 'tests/api'
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
