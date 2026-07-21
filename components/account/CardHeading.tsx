import Link from 'next/link'

/** Section-card heading with the signature short gold rule beneath it. */
export function CardHeading({
  children,
  action,
}: {
  children: React.ReactNode
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg tracking-tight">{children}</h2>
        <span className="mt-1.5 block h-0.5 w-8 rounded-full bg-gold" aria-hidden />
      </div>
      {action && (
        <Link href={action.href} className="shrink-0 text-xs text-primary hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  )
}
