/** Unit tests for lib/phone/e164 — E.164 normalization. No DB. */
import { toE164, normalizeE164, E164_RE, COUNTRIES, DEFAULT_COUNTRY } from '@/lib/phone/e164'
import { ok, eq, summary, exitCode } from '@/tests/unit/_harness'

// toE164: dial + national → E.164
eq('UAE local number', toE164('971', '50 123 4567'), '+971501234567')
eq('strips leading trunk zero', toE164('971', '050 123 4567'), '+971501234567')
eq('strips dashes/parens', toE164('1', '(415) 555-2671'), '+14155552671')
eq('rejects empty national', toE164('971', ''), null)
eq('rejects non-numeric junk', toE164('971', 'abc'), null)
eq('rejects too-short', toE164('971', '12'), null)

// normalizeE164: already-E.164 passthrough + national fallback
eq('passes through valid E.164', normalizeE164('+971501234567'), '+971501234567')
eq('cleans spaces in E.164', normalizeE164('+971 50 123 4567'), '+971501234567')
eq('rejects leading zero as E.164', normalizeE164('+0501234567'), null)
eq('national needs a dial code', normalizeE164('501234567'), null)
eq('national + dial code', normalizeE164('501234567', '971'), '+971501234567')

// Regex sanity
ok('E164_RE accepts +971501234567', E164_RE.test('+971501234567'))
ok('E164_RE rejects missing +', !E164_RE.test('971501234567'))
ok('E164_RE rejects too long (16 digits)', !E164_RE.test('+1234567890123456'))

// Country list invariants
ok('UAE is the default country', DEFAULT_COUNTRY.iso === 'AE')
ok('every country has a numeric dial code', COUNTRIES.every((c) => /^\d+$/.test(c.dial)))
ok('country isos are unique', new Set(COUNTRIES.map((c) => c.iso)).size === COUNTRIES.length)

summary('e164')
process.exit(exitCode())
