import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Card, CardContent } from '@/components/ui/card'
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
      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sell an item</h1>
          <p className="text-sm text-muted-foreground">
            Add photos and details — your listing goes live right away.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Categories aren&apos;t loaded yet. Run{' '}
                <code className="font-mono">npm run db:push</code> to seed them.
              </p>
            ) : (
              <CreateListingForm userId={user.id} categories={categories} />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}
