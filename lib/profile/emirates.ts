/**
 * The 7 UAE emirates.
 * - `value` matches the Postgres `emirate` enum (underscored).
 * - `slug` is the SEO-friendly URL segment used by the /[slug]/[city]
 *   landing pages (hyphenated, no underscores).
 */
export const EMIRATES = [
  { value: 'dubai', label: 'Dubai', slug: 'dubai' },
  { value: 'abu_dhabi', label: 'Abu Dhabi', slug: 'abu-dhabi' },
  { value: 'sharjah', label: 'Sharjah', slug: 'sharjah' },
  { value: 'ajman', label: 'Ajman', slug: 'ajman' },
  { value: 'umm_al_quwain', label: 'Umm Al Quwain', slug: 'umm-al-quwain' },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah', slug: 'ras-al-khaimah' },
  { value: 'fujairah', label: 'Fujairah', slug: 'fujairah' },
] as const

export type Emirate = (typeof EMIRATES)[number]['value']

export const EMIRATE_VALUES = EMIRATES.map((e) => e.value) as readonly string[]

/** All city URL slugs (for generateStaticParams on the city landing pages). */
export const CITY_SLUGS = EMIRATES.map((e) => e.slug) as readonly string[]

export function emirateLabel(value?: string | null): string | null {
  return EMIRATES.find((e) => e.value === value)?.label ?? null
}

/** Resolve a URL city slug (e.g. "abu-dhabi") to its full emirate record. */
export function emirateBySlug(slug?: string | null) {
  return EMIRATES.find((e) => e.slug === slug) ?? null
}

/** Map a URL city slug to the Postgres enum value (e.g. "abu-dhabi" → "abu_dhabi"). */
export function citySlugToEmirate(slug?: string | null): Emirate | null {
  return (EMIRATES.find((e) => e.slug === slug)?.value as Emirate | undefined) ?? null
}

/** Map an emirate enum value to its URL city slug (e.g. "abu_dhabi" → "abu-dhabi"). */
export function emirateToCitySlug(value?: string | null): string | null {
  return EMIRATES.find((e) => e.value === value)?.slug ?? null
}
