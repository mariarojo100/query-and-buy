'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontalIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type RowAction = {
  label: string
  run: () => Promise<{ ok?: boolean; error?: string }>
  danger?: boolean
  confirm?: string
}

export function RowMenu({ actions }: { actions: (RowAction | false | null | undefined)[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const items = actions.filter(Boolean) as RowAction[]

  function go(a: RowAction) {
    if (a.confirm && !window.confirm(a.confirm)) return
    start(async () => {
      const r = await a.run()
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Done')
        router.refresh()
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={pending} aria-label="Actions">
          <MoreHorizontalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {items.map((a, i) => (
          <DropdownMenuItem
            key={i}
            onClick={() => go(a)}
            className={cn(a.danger && 'text-destructive focus:text-destructive')}
          >
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
