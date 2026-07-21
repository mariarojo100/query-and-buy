import { cn } from '@/lib/utils'
import { LogoMark } from '@/components/brand/Logo'

/**
 * The dark, warm-ink profile banner used behind the identity block on the
 * account dashboard and the public seller profile. `--primary` is the theme's
 * deep espresso ink, so cream (`--primary-foreground`) text sits on top at high
 * contrast. A large, faint Q&B monogram anchors the right side; soft radial
 * highlights add depth without a photo dependency.
 */
export function ProfileBanner({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden bg-primary', className)} aria-hidden>
      {/* fine dotted grain */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--primary-foreground) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* warm highlights */}
      <div className="absolute -right-24 -top-28 size-80 rounded-full bg-gold/20 blur-3xl" />
      <div className="absolute -bottom-32 left-16 size-72 rounded-full bg-primary-foreground/5 blur-3xl" />
      {/* monogram watermark */}
      <div className="absolute -right-6 top-1/2 -translate-y-1/2 opacity-[0.10] sm:right-10">
        <LogoMark size={220} className="text-primary-foreground" />
      </div>
      {/* subtle bottom fade so the overlapping stat card reads cleanly */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  )
}
