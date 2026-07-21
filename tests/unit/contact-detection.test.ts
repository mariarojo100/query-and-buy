/**
 * Unit tests for lib/safety/contact — the contact-information detector.
 * Pure logic, no DB: `npm run test:unit`. Covers the blocked/allowed matrix,
 * obfuscation/normalization, legacy masking, and "no raw contact in reasons".
 */
import { detectContactInfo, maskContactInfo, normalizeForDetection } from '@/lib/safety/contact'
import { ok, eq, summary, exitCode } from '@/tests/unit/_harness'

// Must be BLOCKED
const BLOCKED = [
  '+971543998301',
  '+971 54 399 8301',
  '054-399-8301',
  '(054) 399 8301',
  'WhatsApp me on 0543998301',
  'name@gmail.com',
  'name [at] gmail [dot] com',
  'name at gmail dot com',
  'instagram.com/hyperchip',
  '@hyperchip',
  'IG: hyperchip',
  'hyperchip.ae',
  'www.hyperchip.ae',
  'https://hyperchip.ae/shop',
  'zero five four three nine nine eight three zero one',
  '0 5 4 3 9 9 8 3 0 1',
  'search Hyperchip on Instagram',
  'contact me outside the app',
  'call me',
  'visit our website',
  'reach me on telegram',
  'Mob: +971 54 399 8301 WhatsApp: 0543998301 Instagram: @hyperchip Website: hyperchip.ae',
  '＋９７１５４３９９８３０１', // full-width digits
  '+ nine seven one',
]

// Must be ALLOWED (normal product text)
const ALLOWED = [
  'iPhone 15 Pro Max',
  'AED 2,000',
  'AED 2,000,000',
  'MacBook M3 2024',
  '16 GB RAM',
  '512 GB SSD',
  'Intel i7-12700H',
  'Available from 5 July',
  'Located near Abu Dhabi Mall',
  'Delivery across the UAE',
  'Product code 8301',
  'Battery health 91%',
  'Brand new, sealed box, one year warranty',
  'Price is AED 3,500 negotiable',
  'Ryzen 7 5800X, 32 GB DDR4, 1 TB NVMe',
]

let allReasonsClean = true

for (const t of BLOCKED) {
  const r = detectContactInfo(t)
  ok(`BLOCK: ${JSON.stringify(t).slice(0, 48)}`, r.blocked === true)
  // reasons must never contain the raw digits/handle/email
  for (const reason of r.reasons) {
    if (/\d{4,}/.test(reason) || reason.includes('@') || /hyperchip/i.test(reason)) allReasonsClean = false
  }
}

for (const t of ALLOWED) {
  const r = detectContactInfo(t)
  ok(`ALLOW: ${JSON.stringify(t).slice(0, 48)}`, r.blocked === false)
}

ok('reasons never leak raw contact detail', allReasonsClean)

// --- normalization specifics ---
ok('full-width digits fold to ascii', /971543998301/.test(normalizeForDetection('＋９７１５４３９９８３０１')))
ok('spaced digits collapse', normalizeForDetection('0 5 4 3').includes('0543'))

// --- masking (legacy display) ---
eq(
  'mask email',
  maskContactInfo('reach me at name@gmail.com please'),
  'reach me at [contact detail hidden] please',
)
ok('mask phone', maskContactInfo('Mob: +971 54 399 8301').includes('[contact detail hidden]'))
ok('mask keeps normal text', maskContactInfo('AED 2,000 great price') === 'AED 2,000 great price')
ok('mask domain', maskContactInfo('see hyperchip.ae').includes('[contact detail hidden]'))

summary('contact-detection')
process.exit(exitCode())
