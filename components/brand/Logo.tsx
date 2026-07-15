import { cn } from '@/lib/utils'

/**
 * The Query & Buy magnifier mark. Ink parts use `currentColor` so the mark
 * adapts to the theme (ink on light, cream on dark); the lens fill uses the
 * card surface and the inner ring carries the bronze accent.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Query & Buy"
      className={cn('object-contain text-foreground', className)}
    >
      {/* decorative arcs */}
      <path
        d="M16 32 A38 38 0 0 1 39 7"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <path
        d="M93 55 A40 40 0 0 1 73 91"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {/* handle (drawn under the lens) */}
      <line
        x1={32}
        y1={64}
        x2={11}
        y2={86}
        stroke="currentColor"
        strokeWidth={10}
        strokeLinecap="round"
      />
      {/* lens */}
      <circle cx={54} cy={43} r={30} fill="var(--card)" stroke="currentColor" strokeWidth={9} />
      <circle cx={54} cy={43} r={24.5} fill="none" stroke="var(--gold)" strokeWidth={1.5} />
      {/* Q&B */}
      <text
        x={54}
        y={45}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Fraunces, Georgia, 'Times New Roman', serif"
        fontSize={26}
        fontWeight={600}
        fill="currentColor"
      >
        Q&amp;B
      </text>
    </svg>
  )
}

/**
 * Query & Buy brand lockup: the magnifier mark and, optionally, the wordmark.
 * The wordmark inherits the current text color so it adapts to light/dark.
 */
export function Logo({
  size = 32,
  withWordmark = true,
  className,
}: {
  size?: number
  withWordmark?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="font-display text-xl tracking-tight">
          Query <span className="text-muted-foreground">&amp;</span> Buy
        </span>
      )}
    </span>
  )
}
