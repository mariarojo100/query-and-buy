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
    body: 'Chat directly and finalise on your terms',
  },
  { icon: TagIcon, title: 'No hidden fees', body: 'What you see is what you pay' },
  { icon: HeadphonesIcon, title: '24/7 support', body: 'We’re here to help, any time' },
] as const

/** The reassurance band — why buying and selling here is safe and simple. */
export function TrustBar() {
  return (
    <section className="my-4 overflow-hidden rounded-2xl border border-border bg-card shadow-soft sm:my-6">
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {ITEMS.map((it) => (
          <div key={it.title} className="flex items-center gap-4 px-6 py-5 sm:py-6">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold">
              <it.icon className="size-5" strokeWidth={1.9} />
            </span>
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
