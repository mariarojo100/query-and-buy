/** Unit tests for lib/security/rateLimit — fixed-window limiter. No DB. */
import { rateLimit } from '@/lib/security/rateLimit'
import { ok, summary, exitCode } from '@/tests/unit/_harness'

// A fresh key: first N allowed, N+1 blocked.
const key = `test:${Math.floor(performance.now())}:a`
ok('1st send allowed', rateLimit(key, 3, 60_000).allowed)
ok('2nd send allowed', rateLimit(key, 3, 60_000).allowed)
ok('3rd send allowed', rateLimit(key, 3, 60_000).allowed)
const fourth = rateLimit(key, 3, 60_000)
ok('4th send blocked (over 3/window)', !fourth.allowed)
ok('blocked result reports retryAfterSec', fourth.retryAfterSec > 0)

// A 1-per-60s cooldown blocks the immediate second call.
const cd = `test:${Math.floor(performance.now())}:b`
ok('cooldown: first allowed', rateLimit(cd, 1, 60_000).allowed)
ok('cooldown: immediate second blocked', !rateLimit(cd, 1, 60_000).allowed)

// Independent keys don't interfere.
const other = `test:${Math.floor(performance.now())}:c`
ok('independent key unaffected', rateLimit(other, 1, 60_000).allowed)

summary('rate-limit')
process.exit(exitCode())
