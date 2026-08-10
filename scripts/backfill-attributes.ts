/**
 * scripts/backfill-attributes — one-time pass that fills category facets on
 * existing listings from their title + description text, using the SAME
 * deterministic extractor the app now runs on create/update
 * (lib/listings/attributeSchemas → extractAttributesFromText).
 *
 * Safe + idempotent: only ADDS facet keys that are currently missing; never
 * overwrites a value a seller already set. Re-running it changes nothing new.
 *
 * Usage:  node --env-file=.env.local --import tsx scripts/backfill-attributes.ts
 *         (or `npm run backfill:attributes`).  Set BACKFILL_DRY=1 to preview
 *         without writing.
 */
import { db } from '@/lib/db'
import { resolveAttributeFields, extractAttributesFromText } from '@/lib/listings/attributeSchemas'

async function main() {
  const dry = process.env.BACKFILL_DRY === '1'

  const cats = await db.category.findMany({ select: { id: true, slug: true, parentId: true } })
  const byId = new Map(cats.map((c) => [c.id, c]))

  const listings = await db.listing.findMany({
    where: { deletedAt: null },
    select: { id: true, categoryId: true, titleEn: true, description: true, attributes: true },
  })

  let scanned = 0
  let updated = 0
  let facetsAdded = 0

  for (const l of listings) {
    scanned++
    const cat = byId.get(l.categoryId)
    if (!cat) continue
    const parentSlug = cat.parentId ? (byId.get(cat.parentId)?.slug ?? null) : null
    const fields = resolveAttributeFields(cat.slug, parentSlug)
    if (fields.length === 0) continue

    const existing: Record<string, string> = {}
    if (l.attributes && typeof l.attributes === 'object' && !Array.isArray(l.attributes)) {
      for (const [k, v] of Object.entries(l.attributes as Record<string, unknown>)) {
        if (v != null) existing[k] = String(v)
      }
    }

    const extracted = extractAttributesFromText(fields, `${l.titleEn ?? ''}\n${l.description ?? ''}`)
    const added = Object.keys(extracted).filter((k) => !(k in existing))
    if (added.length === 0) continue

    const merged = { ...extracted, ...existing } // existing (seller) values always win
    updated++
    facetsAdded += added.length
    console.log(`${l.id}  +${added.length}  (${cat.slug}): ${added.map((k) => `${k}=${extracted[k]}`).join(', ')}`)

    if (!dry) {
      await db.listing.update({ where: { id: l.id }, data: { attributes: merged } })
    }
  }

  console.log(
    `\nBackfill ${dry ? '(dry-run) ' : ''}complete: ${updated}/${scanned} listing(s) ${dry ? 'would gain' : 'gained'} ${facetsAdded} facet(s).`,
  )
  await db.$disconnect()
  process.exit(0)
}

main().catch(async (e) => {
  console.error('backfill-attributes failed:', e instanceof Error ? e.message : 'unknown error')
  try {
    await db.$disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
