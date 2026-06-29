import { cn } from '@/lib/utils'

const BRAND = '#1c3d30' // deep emerald — the magnifier ring, handle, arcs & lettering

/** The Query & Buy magnifier mark (vector recreation of the brand logo). */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Query & Buy"
      className={cn('object-contain', className)}
    >
      {/* decorative arcs */}
      <path
        d="M16 32 A38 38 0 0 1 39 7"
        fill="none"
        stroke={BRAND}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      <path
        d="M93 55 A40 40 0 0 1 73 91"
        fill="none"
        stroke={BRAND}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
      {/* handle (drawn under the lens) */}
      <line x1={32} y1={64} x2={11} y2={86} stroke={BRAND} strokeWidth={10} strokeLinecap="round" />
      {/* lens */}
      <circle cx={54} cy={43} r={30} fill="#f6f8f7" stroke={BRAND} strokeWidth={9} />
      <circle cx={54} cy={43} r={24.5} fill="none" stroke="#cdd6d1" strokeWidth={1.5} />
      {/* Q&B */}
      <text
        x={54}
        y={45}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="Fraunces, Georgia, 'Times New Roman', serif"
        fontSize={26}
        fontWeight={600}
        fill={BRAND}
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
