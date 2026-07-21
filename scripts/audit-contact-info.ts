/**
 * scripts/audit-contact-info — one-time report of legacy records that contain
 * contact details entered before contact-info enforcement existed.
 *
 * Read-only. Scans profiles (bio, display_name) and listings (title, title_ar,
 * description) with the SAME deterministic detector the app enforces, and prints
 * one row per offending field: record type, record id, user id, field, the
 * detection reasons (categories only), and a MASKED preview.
 *
 * PRIVACY: never prints raw contact details — previews are passed through
 * maskContactInfo(); reasons are categories, never the matched value.
 *
 * Usage:  node --env-file=.env.local --import tsx scripts/audit-contact-info.ts
 *         (or `npm run audit:contact`).  Set AUDIT_JSON=1 for JSON output.
 */
import { db } from '@/lib/db'
import { detectContactInfo, maskContactInfo } from '@/lib/safety/contact'

type Finding = {
  recordType: 'profile' | 'listing'
  recordId: string
  userId: string
  field: string
  reasons: string[]
  maskedPreview: string
}

function check(
  recordType: Finding['recordType'],
  recordId: string,
  userId: string,
  field: string,
  value: string | null | undefined,
  out: Finding[],
): void {
  if (!value) return
  const res = detectContactInfo(value)
  if (!res.blocked) return
  out.push({
    recordType,
    recordId,
    userId,
    field,
    reasons: res.reasons,
    maskedPreview: maskContactInfo(value).slice(0, 140),
  })
}

async function main() {
  const findings: Finding[] = []

  const profiles = await db.profile.findMany({ select: { id: true, bio: true, displayName: true } })
  for (const p of profiles) {
    check('profile', p.id, p.id, 'bio', p.bio, findings)
    check('profile', p.id, p.id, 'display_name', p.displayName, findings)
  }

  const listings = await db.listing.findMany({
    select: { id: true, sellerId: true, titleEn: true, titleAr: true, description: true },
  })
  for (const l of listings) {
    check('listing', l.id, l.sellerId, 'title_en', l.titleEn, findings)
    check('listing', l.id, l.sellerId, 'title_ar', l.titleAr, findings)
    check('listing', l.id, l.sellerId, 'description', l.description, findings)
  }

  if (process.env.AUDIT_JSON === '1') {
    console.log(JSON.stringify(findings, null, 2))
  } else {
    console.log(`\nContact-info audit — ${findings.length} field(s) flagged`)
    console.log(`  profiles scanned: ${profiles.length}, listings scanned: ${listings.length}\n`)
    for (const f of findings) {
      console.log(
        `[${f.recordType}] ${f.recordId}  user=${f.userId}  field=${f.field}\n` +
          `   reasons: ${f.reasons.join(', ')}\n` +
          `   preview: ${f.maskedPreview}\n`,
      )
    }
  }

  await db.$disconnect()
  process.exit(0)
}

main().catch(async (e) => {
  // Never surface record contents in the error path either.
  console.error('audit-contact-info failed:', e instanceof Error ? e.message : 'unknown error')
  try {
    await db.$disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
