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
  /** Canonical listing slug ("{title-slug}-{publicId}") for the offer URL. */
  slug: string
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
      url: absoluteUrl(`/listing/${input.slug}`),
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

/**
 * ItemList schema for a grid of listings on a category / category-in-city page.
 * Gives search engines an explicit, ordered map of the products on the page.
 */
export function itemListJsonLd(
  items: { name: string; path: string }[],
  opts: { name?: string } = {},
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(opts.name ? { name: opts.name } : {}),
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  }
}

/** Article (BlogPosting) schema for a guide / blog post. */
export function articleJsonLd(input: {
  title: string
  description: string
  path: string
  published: string
  updated: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    description: input.description,
    datePublished: input.published,
    dateModified: input.updated,
    url: absoluteUrl(input.path),
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(input.path) },
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  }
}

/** FAQPage schema from {question, answer} pairs (eligible for FAQ rich results). */
export function faqJsonLd(faqs: { question: string; answer: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  }
}
