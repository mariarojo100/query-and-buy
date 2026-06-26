import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { absoluteUrl } from '@/lib/site'

// Revalidate the sitemap hourly so new listings/categories get indexed.
export const revalidate = 3600

/** A cookie-less anon client — sitemaps run outside a request scope at build time. */
function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'hourly', priority: 1 },
    { url: absoluteUrl('/login'), lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const sb = publicClient()
    const [{ data: cats }, { data: listings }, { data: profiles }] = await Promise.all([
      sb.from('categories').select('slug').eq('is_active', true),
      sb
        .from('listings')
        .select('id, published_at, updated_at')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('published_at', { ascending: false })
        .limit(5000),
      sb.from('profiles').select('username, updated_at').not('username', 'is', null).limit(5000),
    ])

    for (const c of (cats ?? []) as { slug: string }[])
      entries.push({
        url: absoluteUrl(`/category/${c.slug}`),
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.7,
      })

    for (const l of (listings ?? []) as {
      id: string
      published_at: string | null
      updated_at: string | null
    }[])
      entries.push({
        url: absoluteUrl(`/listing/${l.id}`),
        lastModified: new Date(l.updated_at ?? l.published_at ?? now),
        changeFrequency: 'weekly',
        priority: 0.8,
      })

    for (const p of (profiles ?? []) as { username: string; updated_at: string | null }[])
      entries.push({
        url: absoluteUrl(`/u/${p.username}`),
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.5,
      })
  } catch {
    /* DB unavailable at build → ship the static entries only */
  }

  return entries
}
