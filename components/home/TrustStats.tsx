import { AnimatedCounter } from '@/components/home/AnimatedCounter'

export function TrustStats({ listings }: { listings: number }) {
  const stats = [
    { value: Math.max(listings, 0), suffix: '+', label: 'Active listings' },
    { value: 7, suffix: '', label: 'Emirates covered' },
    { value: 60, suffix: 's', label: 'Avg. time to list' },
    { value: 100, suffix: '%', label: 'Free to list' },
  ]

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-soft sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="bg-card px-5 py-7 text-center sm:py-8">
          <p className="font-display text-3xl tracking-tight sm:text-4xl">
            <AnimatedCounter value={s.value} suffix={s.suffix} />
          </p>
          <p className="eyebrow mt-2">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
