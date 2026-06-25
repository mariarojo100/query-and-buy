import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Card, CardContent } from '@/components/ui/card'
import { EditListingForm } from '@/components/listing/EditListingForm'
import { getListingForEdit } from '@/lib/listings/queries'
import type { Category } from '@/components/sell/CategorySelect'

export const metadata = { title: 'Edit listing · Query & Buy' }

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/listing/${id}/edit`)

  // getListingForEdit returns null for non-owners → 404 (owner-only).
  const listing = await getListingForEdit(id)
  if (!listing) notFound()

  const { data } = await supabase
    .from('categories')
    .select('id, name_en, parent_id, position')
    .eq('is_active', true)
    .order('position', { ascending: true })
  const categories = (data ?? []) as Category[]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href={`/listing/${id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" /> Back to listing
        </Link>
        <h1 className="mb-5 text-2xl font-semibold tracking-tight">Edit listing</h1>
        <Card>
          <CardContent className="pt-6">
            <EditListingForm userId={user.id} listing={listing} categories={categories} />
          </CardContent>
        </Card>
      </main>
    </>
  )
}
