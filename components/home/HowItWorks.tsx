import { CameraIcon, PenLineIcon, SendHorizontalIcon } from 'lucide-react'

const STEPS = [
  {
    icon: CameraIcon,
    n: '01',
    title: 'Snap your photos',
    body: 'Add up to eight photos of your item — no studio, no fuss. Your camera roll is enough.',
  },
  {
    icon: PenLineIcon,
    n: '02',
    title: 'We draft the listing',
    body: 'We identify the item and write a polished title, description, and fair UAE price for you.',
  },
  {
    icon: SendHorizontalIcon,
    n: '03',
    title: 'Go live in seconds',
    body: 'Review, tweak anything you like, and publish. Buyers across the Emirates see it instantly.',
  },
]

export function HowItWorks() {
  return (
    <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
      {STEPS.map((s) => (
        <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-float sm:p-7">
          <div className="flex items-center justify-between">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gold/12 text-gold">
              <s.icon className="size-5" strokeWidth={1.9} />
            </span>
            <span className="font-display text-2xl text-foreground/15">{s.n}</span>
          </div>
          <p className="font-display mt-5 text-lg leading-tight">{s.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </div>
  )
}
