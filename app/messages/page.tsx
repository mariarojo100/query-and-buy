import { redirect } from 'next/navigation'
import { MessageSquareIcon } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Card, CardContent } from '@/components/ui/card'
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
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-5 text-2xl font-semibold tracking-tight">Messages</h1>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
            <MessageSquareIcon className="size-10 text-muted-foreground/40" />
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Message a seller from any listing to start a conversation.
            </p>
          </div>
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
