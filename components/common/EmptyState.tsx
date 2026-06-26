import type { LucideIcon } from 'lucide-react'

/** Editorial empty state: serif title, generous space, a single clear action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-border bg-card px-6 py-20 text-center shadow-soft sm:py-24">
      <div className="relative">
        <div className="absolute inset-0 -z-10 rounded-full bg-accent/70 blur-xl" />
        <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <Icon className="size-6" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-display text-xl">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
