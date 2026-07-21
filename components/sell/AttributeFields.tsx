'use client'

import { SparklesIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AttrField } from '@/lib/listings/attributeSchemas'

/**
 * Renders a category's optional attribute inputs (mileage, storage, bedrooms…).
 * Every field is optional; the seller fills what they like. Fields the AI
 * pre-filled get a subtle sparkle so it's clear what to review.
 */
export function AttributeFields({
  fields,
  values,
  aiFilled,
  onChange,
}: {
  fields: AttrField[]
  values: Record<string, string>
  aiFilled?: Set<string>
  onChange: (key: string, value: string) => void
}) {
  if (fields.length === 0) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `attr-${f.key}`
        const val = values[f.key] ?? ''
        const isAi = aiFilled?.has(f.key) && val !== ''
        return (
          <div key={f.key} className="space-y-2">
            <Label htmlFor={id} className="flex items-center gap-1.5">
              {f.label}
              {f.unit && <span className="text-xs text-muted-foreground">({f.unit})</span>}
              {isAi && (
                <span
                  title="Filled by AI — please confirm"
                  className="inline-flex items-center gap-0.5 rounded-full bg-violet-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400"
                >
                  <SparklesIcon className="size-2.5" />
                  AI
                </span>
              )}
            </Label>

            {f.type === 'select' ? (
              <Select value={val || undefined} onValueChange={(v) => onChange(f.key, v)}>
                <SelectTrigger id={id} className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {f.options?.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id}
                type={f.type === 'number' ? 'number' : 'text'}
                inputMode={f.type === 'number' ? 'decimal' : undefined}
                min={f.type === 'number' ? 0 : undefined}
                value={val}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder ?? 'Optional'}
                maxLength={f.type === 'text' ? (f.maxLen ?? 60) : undefined}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
