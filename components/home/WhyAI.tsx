import { ShieldCheckIcon, SparklesIcon, TagIcon } from 'lucide-react'

const POINTS = [
  {
    icon: SparklesIcon,
    title: 'Listings that sell',
    body: 'AI writes clear, complete, keyword-rich descriptions buyers actually read.',
  },
  {
    icon: TagIcon,
    title: 'Fair UAE pricing',
    body: 'Quick-sale, fair-market, and premium price guidance grounded in local demand.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Trust built in',
    body: 'Verified sellers, trust scores, and reporting keep the marketplace safe.',
  },
]

export function WhyAI() {
  return (
    <div className="overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground shadow-float sm:p-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/65">
        Why Query &amp; Buy
      </p>
      <h2 className="font-display mt-3 max-w-xl text-3xl tracking-tight sm:text-4xl">
        Selling, reimagined by AI.
      </h2>
      <div className="mt-9 grid gap-7 sm:grid-cols-3 sm:gap-8">
        {POINTS.map((p) => (
          <div key={p.title}>
            <p.icon className="size-6 text-gold" />
            <p className="font-display mt-4 text-lg">{p.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-primary-foreground/75">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
