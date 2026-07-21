import { HeadphonesIcon, MessageCircleIcon, ShieldCheckIcon, TagIcon } from 'lucide-react'

const ITEMS = [
  {
    icon: ShieldCheckIcon,
    title: 'Safe & secure',
    body: 'Verified users and secure conversations',
  },
  {
    icon: MessageCircleIcon,
    title: 'Direct chat',
    body: 'Chat directly and finalize on your terms',
  },
  { icon: TagIcon, title: 'No hidden fees', body: 'What you see is what you pay' },
  { icon: HeadphonesIcon, title: '24/7 support', body: 'We’re here to help' },
] as const

/** The reassurance band — why buying and selling here is safe and simple. */
export function TrustBar() {
  return (
    <section className="my-4 rounded-2xl border border-border/70 bg-secondary/50 px-6 py-6 sm:my-6 sm:px-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <div key={it.title} className="flex items-center gap-3.5">
            <it.icon className="size-6 shrink-0 text-gold" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{it.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
