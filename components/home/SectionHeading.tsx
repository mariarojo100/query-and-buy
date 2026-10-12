import type { ReactNode } from 'react'

/**
 * Editorial section header — a mono kicker over a large Fraunces title, under a
 * hairline rule, with an optional right-aligned action. Gives the homepage a
 * consistent, catalog-like rhythm.
 */
export function SectionHeading({
  kicker,
  title,
  children,
}: {
  kicker?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
      <div className="min-w-0">
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h2 className="font-display mt-2 text-[1.9rem] leading-[1.05] tracking-tight sm:text-[2.6rem]">
          {title}
        </h2>
      </div>
      {children && <div className="shrink-0 pb-0.5">{children}</div>}
    </div>
  )
}
