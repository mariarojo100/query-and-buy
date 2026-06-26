import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MessageSquareIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { ConversationListItem } from '@/components/messaging/ConversationListItem'
import { getUserConversations } from '@/lib/messaging/queries'

export const metadata = { title: 'Messages · Query & Buy' }

export default async function MessagesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/messages')

  const conversations = await getUserConversations()

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
        <p className="eyebrow">Inbox</p>
        <h1 className="font-display mb-7 mt-2 text-3xl tracking-tight sm:text-4xl">Messages</h1>

        {conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquareIcon}
            title="No conversations yet"
            description="Message a seller from any listing to start chatting. Your conversations show up here."
            action={
              <Button asChild className="rounded-full">
                <Link href="/">Browse listings</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild variant="ghost" className="rounded-full">
                <Link href="/sell">Sell an item</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {conversations.map((c) => (
                <ConversationListItem key={c.id} item={c} />
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </>
  )
}
