import Link from 'next/link'
import { CheckCircle2Icon, CircleIcon, ShieldCheckIcon, SparklesIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { profileCompletion, type Profile } from '@/lib/profile/completion'

/**
 * Owner-only nudge: progress meter + what's left to fill in.
 *
 * `phoneVerified` is a separate trust signal (not part of the completion
 * percentage, so it doesn't shift the trust score) — when explicitly false we
 * surface a link to the phone-verification card in settings.
 */
export function ProfileCompletion({
  profile,
  phoneVerified,
}: {
  profile: Profile
  phoneVerified?: boolean
}) {
  const { percent, items } = profileCompletion(profile)
  const complete = percent === 100

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-muted-foreground" />
            Profile completion
          </span>
          <span className="tabular-nums text-muted-foreground">{percent}%</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percent} />
        {complete ? (
          <p className="text-sm text-muted-foreground">
            Your profile is complete — nice work. 🎉
          </p>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-sm"
                data-done={item.done}
              >
                {item.done ? (
                  <CheckCircle2Icon className="size-4 text-success" />
                ) : (
                  <CircleIcon className="size-4 text-muted-foreground/50" />
                )}
                <span
                  className={
                    item.done ? 'text-muted-foreground line-through' : 'text-foreground'
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        )}

        {phoneVerified === false && (
          <Link
            href="/account/settings#phone"
            className="flex items-center gap-2 rounded-xl border border-border bg-accent/40 px-3 py-2.5 text-sm transition-colors hover:bg-accent"
          >
            <ShieldCheckIcon className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="flex-1 font-medium">Verify your phone to boost trust</span>
            <span aria-hidden>→</span>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
