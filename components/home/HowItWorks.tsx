import { CameraIcon, RocketIcon, SparklesIcon } from 'lucide-react'

const STEPS = [
  {
    icon: CameraIcon,
    n: '01',
    title: 'Snap your photos',
    body: 'Add up to eight photos of your item — no studio, no fuss. Your camera roll is enough.',
  },
  {
    icon: SparklesIcon,
    n: '02',
    title: 'AI writes the listing',
    body: 'Our AI identifies the item and drafts a polished title, description, and fair UAE price.',
  },
  {
    icon: RocketIcon,
    n: '03',
    title: 'Go live in seconds',
    body: 'Review, tweak anything you like, and publish. Buyers across the Emirates see it instantly.',
  },
]

export function HowItWorks() {
  return (
    <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
      {STEPS.map((s) => (
        <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-7">
          <div className="flex items-center justify-between">
            <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <s.icon className="size-5" />
            </span>
            <span className="font-display text-2xl text-border">{s.n}</span>
          </div>
          <p className="font-display mt-5 text-lg leading-tight">{s.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </div>
      ))}
    </div>
  )
}
