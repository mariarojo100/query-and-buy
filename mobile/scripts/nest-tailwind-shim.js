/**
 * Ensures NativeWind resolves Tailwind CSS v3 (its peer) inside this monorepo,
 * where the web app pins Tailwind v4 at the repo root. Nests tailwindcss@3.4.19
 * directly under the installed `nativewind` package.
 *
 * Runs on local install (`postinstall`) and on EAS Build
 * (`eas-build-post-install`), so the manual re-nest is no longer needed and
 * cloud builds work. No-ops if `nativewind` isn't installed (e.g. the web-only
 * scoped install on the production VPS) — so it can never affect the website.
 */
const { execSync } = require('node:child_process')
const path = require('node:path')

let nativewindDir
try {
  nativewindDir = path.dirname(require.resolve('nativewind/package.json'))
} catch {
  // nativewind not installed (web-only install) — nothing to do.
  process.exit(0)
}

const nestedPkg = path.join(nativewindDir, 'node_modules', 'tailwindcss', 'package.json')
try {
  const version = require(nestedPkg).version
  if (version.startsWith('3.')) {
    console.log(`[nest-tailwind-shim] nativewind already has tailwindcss@${version}`)
    process.exit(0)
  }
} catch {
  /* not nested yet — install below */
}

console.log(`[nest-tailwind-shim] nesting tailwindcss@3.4.19 under ${nativewindDir}`)
execSync(`npm install tailwindcss@3.4.19 --prefix "${nativewindDir}" --no-save --no-audit --no-fund`, {
  stdio: 'inherit',
})
