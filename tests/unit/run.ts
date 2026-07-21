/**
 * Runs every tests/unit/*.test.ts as its own process. These are pure-logic
 * tests — no database required. `npm run test:unit`.
 */
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const dir = 'tests/unit'
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
