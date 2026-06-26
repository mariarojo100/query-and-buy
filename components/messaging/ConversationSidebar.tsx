import { ConversationListItem } from '@/components/messaging/ConversationListItem'
import type { InboxItem } from '@/lib/messaging/queries'

/** Desktop conversation rail (WhatsApp-Web style). Hidden on mobile. */
export function ConversationSidebar({
  conversations,
  activeId,
}: {
  conversations: InboxItem[]
  activeId?: string
}) {
  return (
    <aside className="hidden h-full w-80 shrink-0 flex-col border-r border-border bg-card/40 lg:flex">
      <div className="border-b border-border px-5 py-4">
        <p className="eyebrow">Inbox</p>
        <h2 className="font-display mt-1 text-xl">Messages</h2>
      </div>
      <div className="flex-1 divide-y divide-border overflow-y-auto">
        {conversations.map((c) => (
          <ConversationListItem key={c.id} item={c} active={c.id === activeId} />
        ))}
      </div>
    </aside>
  )
}
