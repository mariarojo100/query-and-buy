import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ArrowRightIcon, ChevronLeftIcon, ClockIcon } from 'lucide-react'
import { Prose } from '@/components/content/Prose'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import {
  GUIDES,
  getGuide,
  guideTopic,
  guideReadMinutes,
  relatedGuides,
  guidePrimaryCategory,
} from '@/lib/guides/guides'

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return { title: 'Guide not found · Query & Buy' }
  const path = `/guides/${guide.slug}`
  return {
    title: `${guide.title} · Query & Buy`,
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: guide.title,
      description: guide.description,
      url: absoluteUrl(path),
      locale: 'en_AE',
    },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  const path = `/guides/${guide.slug}`
  const { Body } = guide
  const topic = guideTopic(guide.slug)
  const related = relatedGuides(guide.slug)
  const primaryCategory = guidePrimaryCategory(guide.slug)

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: guide.title, path },
          ]),
          articleJsonLd({
            title: guide.title,
            description: guide.description,
            path,
            published: guide.published,
            updated: guide.updated,
          }),
        ]}
      />
      <Link
        href="/guides"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" /> All guides
      </Link>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="eyebrow">{topic}</span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ClockIcon className="size-3.5" /> {guideReadMinutes(guide.slug)} min read
          </span>
        </div>
        <h1 className="font-display mt-2 text-3xl tracking-tight sm:text-4xl">{guide.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {guide.updated}</p>
      </header>

      <Prose>
        <Body />
      </Prose>

      {/* Next-step CTA into the relevant category */}
      {primaryCategory && (
        <div className="mt-12 rounded-2xl border border-border bg-accent/40 p-6 text-center">
          <p className="font-display text-xl tracking-tight">
            Ready to browse {primaryCategory.label}?
          </p>
          <Link
            href={`/${primaryCategory.slug}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            See {primaryCategory.label} listings
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      )}

      {/* Related guides in the same topic */}
      {related.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="font-display mb-4 text-xl tracking-tight">More {topic} guides</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {related.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-border p-5 transition-shadow hover:shadow-soft"
                >
                  <p className="eyebrow">{g.eyebrow}</p>
                  <h3 className="font-display mt-1.5 text-base leading-snug tracking-tight text-foreground">
                    {g.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {g.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
