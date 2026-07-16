/**
 * tests/unit/_harness — tiny DB-free assertion helpers for pure-logic tests.
 * Same ok/summary/exitCode shape as tests/authz, but these need no database and
 * run anywhere: `npm run test:unit`.
 */
let failures = 0
let passes = 0

export function ok(name: string, cond: boolean): void {
  if (cond) {
    passes++
    console.log('PASS ' + name)
  } else {
    failures++
    console.log('FAIL ' + name)
  }
}

export function eq<T>(name: string, actual: T, expected: T): void {
  ok(`${name} (got ${JSON.stringify(actual)})`, actual === expected)
}

export function summary(label: string): void {
  console.log(`RESULT[${label}]: ${passes} pass / ${failures} fail`)
}

export function exitCode(): number {
  return failures > 0 ? 1 : 0
}
