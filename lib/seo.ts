import { SITE_NAME, SITE_URL, SITE_DESCRIPTION, absoluteUrl } from '@/lib/site'

/** Organization schema (brand identity). */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    areaServed: 'AE',
  }
}

/** WebSite schema (enables sitelinks search box in future). */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/** Product/offer schema for a listing detail page. */
export function productJsonLd(input: {
  id: string
  title: string
  description: string
  priceAed: number
  condition: string | null
  imageUrls: string[]
  sellerName: string | null
  available: boolean
}): Record<string, unknown> {
  const CONDITION_MAP: Record<string, string> = {
    new: 'https://schema.org/NewCondition',
    like_new: 'https://schema.org/UsedCondition',
    used: 'https://schema.org/UsedCondition',
    for_parts: 'https://schema.org/DamagedCondition',
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.title,
    description: input.description,
    image: input.imageUrls,
    ...(input.sellerName ? { brand: { '@type': 'Brand', name: input.sellerName } } : {}),
    offers: {
      '@type': 'Offer',
      price: input.priceAed,
      priceCurrency: 'AED',
      availability: input.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
      url: absoluteUrl(`/listing/${input.id}`),
      ...(input.condition ? { itemCondition: CONDITION_MAP[input.condition] } : {}),
    },
  }
}

/** BreadcrumbList schema from {name, path} pairs. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  }
}
