import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRightIcon, ClockIcon } from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import {
  GUIDES,
  getGuide,
  guidesByTopic,
  guideReadMinutes,
  guideTopic,
  FEATURED_GUIDE_SLUG,
} from '@/lib/guides/guides'

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

function ReadMeta({ slug }: { slug: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <ClockIcon className="size-3.5" /> {guideReadMinutes(slug)} min read
    </span>
  )
}

export default function GuidesIndexPage() {
  const featured = getGuide(FEATURED_GUIDE_SLUG)
  const groups = guidesByTopic().map((group) => ({
    ...group,
    guides: group.guides.filter((g) => g.slug !== FEATURED_GUIDE_SLUG),
  }))

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

      <header className="mb-8">
        <p className="eyebrow">Guides</p>
        <h1 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">
          Buying &amp; selling in the UAE, made simple
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-[1.8] text-foreground/90">
          Practical, no-nonsense guides to getting the best result when you buy or sell second-hand
          across the Emirates — safely and confidently.
        </p>
      </header>

      {/* Featured flagship guide */}
      {featured && (
        <Link
          href={`/guides/${featured.slug}`}
          className="group mb-12 block rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-float sm:p-8"
        >
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">
              Featured
            </span>
            <span className="eyebrow">{guideTopic(featured.slug)}</span>
          </div>
          <h2 className="font-display mt-3 text-2xl tracking-tight text-foreground sm:text-3xl">
            {featured.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {featured.description}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <ReadMeta slug={featured.slug} />
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read guide
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      )}

      {/* Topic-grouped guides */}
      <div className="space-y-12">
        {groups.map((group) => (
          <section key={group.topic}>
            <h2 className="font-display mb-4 text-xl tracking-tight text-foreground">
              {group.topic}
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {group.guides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="group flex h-full flex-col rounded-xl border border-border p-5 transition-shadow hover:shadow-soft"
                  >
                    <p className="eyebrow">{g.eyebrow}</p>
                    <h3 className="font-display mt-1.5 text-lg leading-snug tracking-tight text-foreground">
                      {g.title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {g.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <ReadMeta slug={g.slug} />
                      <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
