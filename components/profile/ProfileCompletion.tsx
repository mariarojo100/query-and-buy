import { CheckCircle2Icon, CircleIcon, SparklesIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { profileCompletion, type Profile } from '@/lib/profile/completion'

/** Owner-only nudge: progress meter + what's left to fill in. */
export function ProfileCompletion({ profile }: { profile: Profile }) {
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
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
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
      </CardContent>
    </Card>
  )
}
