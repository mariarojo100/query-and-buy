import { MapPinnedIcon, ShieldCheckIcon, SparklesIcon, UserCheckIcon } from 'lucide-react'

const ITEMS = [
  {
    icon: UserCheckIcon,
    title: 'Verified users',
    body: 'A secure community of trusted buyers and sellers.',
  },
  {
    icon: SparklesIcon,
    title: 'Smart AI search',
    body: 'Find exactly what you want using natural language.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Safe transactions',
    body: 'Chat, negotiate, and confirm deals with confidence.',
  },
  {
    icon: MapPinnedIcon,
    title: 'Nationwide reach',
    body: 'Buy and sell across all seven Emirates.',
  },
] as const

/** The reassurance band — why buying and selling here is safe. */
export function TrustBar() {
  return (
    <section className="my-6 rounded-3xl border border-border bg-secondary/50 px-6 py-8 sm:my-10 sm:px-10 sm:py-10">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((it) => (
          <div key={it.title} className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/12 text-gold ring-1 ring-inset ring-gold/20">
              <it.icon className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{it.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
