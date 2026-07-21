import Link from 'next/link'
import type { Metadata } from 'next'
import { ContentHeader } from '@/components/content/Prose'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import { GUIDES } from '@/lib/guides/guides'

export const metadata: Metadata = {
  title: 'Guides — Buying & Selling in the UAE · Query & Buy',
  description:
    'Practical guides to buying and selling second-hand in the UAE: selling your car privately, buying safely online, checking a used iPhone, and more.',
  alternates: { canonical: '/guides' },
  openGraph: {
    type: 'website',
    title: 'Guides — Buying & Selling in the UAE · Query & Buy',
    description:
      'Practical guides to buying and selling second-hand in the UAE, from the Query & Buy team.',
    url: absoluteUrl('/guides'),
    locale: 'en_AE',
  },
}

export default function GuidesIndexPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
          ]),
          itemListJsonLd(
            GUIDES.map((g) => ({ name: g.title, path: `/guides/${g.slug}` })),
            { name: 'Query & Buy Guides' },
          ),
        ]}
      />
      <ContentHeader
        eyebrow="Guides"
        title="Buying & selling in the UAE, made simple"
      />
      <p className="mb-8 max-w-2xl text-[15px] leading-[1.8] text-foreground/90">
        Practical, no-nonsense guides to getting the best result when you buy or sell second-hand
        across the Emirates — safely and confidently.
      </p>
      <ul className="space-y-4">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guides/${g.slug}`}
              className="group block rounded-xl border border-border p-5 transition-shadow hover:shadow-soft"
            >
              <p className="eyebrow">{g.eyebrow}</p>
              <h2 className="font-display mt-1.5 text-xl tracking-tight text-foreground">
                {g.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
