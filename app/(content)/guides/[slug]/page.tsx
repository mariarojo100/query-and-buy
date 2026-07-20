import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { ContentHeader, Prose } from '@/components/content/Prose'
import { JsonLd } from '@/components/seo/JsonLd'
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/seo'
import { absoluteUrl } from '@/lib/site'
import { GUIDES, getGuide } from '@/lib/guides/guides'

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
      <ContentHeader eyebrow={guide.eyebrow} title={guide.title} updated={guide.updated} />
      <Prose>
        <Body />
      </Prose>
    </>
  )
}
