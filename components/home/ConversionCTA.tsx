import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The closing conversion moment — a deep-pine band that pushes the two actions
 * the whole marketplace runs on: list something, or go find something. Mirrors
 * the hero's language so the page bookends cleanly.
 */
export function ConversionCTA() {
  return (
    <section className="py-10 sm:py-14">
      <div className="relative isolate overflow-hidden rounded-[1.25rem] px-6 py-16 text-center shadow-float sm:rounded-[1.75rem] sm:px-12 sm:py-20">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-br from-[oklch(0.34_0.055_163)] via-[oklch(0.26_0.05_160)] to-[oklch(0.19_0.04_158)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-6rem] -z-10 h-[26rem] w-[44rem] max-w-[130%] -translate-x-1/2 rounded-full bg-[oklch(0.58_0.09_162)] opacity-[0.16] blur-[90px]"
        />
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="pointer-events-none absolute -right-12 -bottom-20 -z-10 hidden h-80 w-80 text-white/[0.06] sm:block"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <circle cx={108} cy={92} r={60} />
          <circle cx={108} cy={92} r={46} strokeWidth={1.5} />
          <path d="M64 136 L30 170" strokeWidth={12} strokeLinecap="round" />
        </svg>

        <h2 className="display-md mx-auto max-w-2xl text-balance text-[oklch(0.975_0.014_95)]">
          Sell what you don&rsquo;t need. Find what you do.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-pretty text-[oklch(0.97_0.012_95)]/75 sm:text-lg">
          Free to list, quick to sell, safe to buy — with thousands of buyers and sellers across
          the Emirates.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="rounded-full bg-[oklch(0.985_0.004_106)] px-8 font-semibold text-[oklch(0.2_0.012_165)] hover:bg-white"
          >
            <Link href="/sell">
              Start selling
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-white/30 bg-transparent px-8 text-[oklch(0.97_0.012_95)] hover:border-white/55 hover:bg-white/10 hover:text-white"
          >
            <Link href="/?sort=newest">Browse the marketplace</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
