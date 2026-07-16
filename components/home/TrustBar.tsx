import { ClockIcon, HeadphonesIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'

const ITEMS = [
  { icon: UsersIcon, title: 'Trusted by thousands', body: 'UAE community' },
  { icon: ShieldCheckIcon, title: 'Safe & secure', body: 'Your safety is our priority' },
  { icon: ClockIcon, title: 'Easy to use', body: 'List in less than 2 minutes' },
  { icon: HeadphonesIcon, title: '24/7 support', body: 'We’re here to help' },
] as const

/** A quiet reassurance strip — why buying and selling here is safe and simple. */
export function TrustBar() {
  return (
    <section className="border-t border-border/60 py-6 sm:py-7">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
        {ITEMS.map((it, i) => (
          <div
            key={it.title}
            className={
              'flex items-center gap-3 sm:justify-center ' +
              (i > 0 ? 'sm:border-l sm:border-border/60' : '')
            }
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-1 ring-inset ring-border">
              <it.icon className="size-[18px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{it.title}</p>
              <p className="truncate text-xs text-muted-foreground">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
