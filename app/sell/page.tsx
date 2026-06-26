import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { CreateListingForm } from '@/components/sell/CreateListingForm'
import type { Category } from '@/components/sell/CategorySelect'

export const metadata = { title: 'Sell an item · Query & Buy' }

export default async function SellPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/sell')

  const { data } = await supabase
    .from('categories')
    .select('id, name_en, parent_id, position')
    .eq('is_active', true)
    .order('position', { ascending: true })
  const categories = (data ?? []) as Category[]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
        <p className="eyebrow">Create a listing</p>
        <h1 className="font-display mt-2 text-3xl leading-tight tracking-tight sm:text-4xl">
          Sell an item
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Add a few photos and let AI draft the rest — your listing goes live right away.
        </p>

        <div className="mt-10">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Categories aren&apos;t loaded yet. Run{' '}
              <code className="font-mono">npm run db:push</code> to seed them.
            </p>
          ) : (
            <CreateListingForm userId={user.id} categories={categories} />
          )}
        </div>
      </main>
    </>
  )
}
