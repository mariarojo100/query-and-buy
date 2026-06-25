'use client'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type Category = {
  id: string
  name_en: string
  parent_id: string | null
  position: number
}

/** Grouped category picker: children nested under parents; leaf parents selectable. */
export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[]
  value: string
  onChange: (id: string) => void
}) {
  const byPos = (a: Category, b: Category) => a.position - b.position
  const parents = categories.filter((c) => !c.parent_id).sort(byPos)
  const childrenOf = (id: string) =>
    categories.filter((c) => c.parent_id === id).sort(byPos)

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id="category" className="w-full">
        <SelectValue placeholder="Select a category" />
      </SelectTrigger>
      <SelectContent>
        {parents.map((p) => {
          const kids = childrenOf(p.id)
          return kids.length > 0 ? (
            <SelectGroup key={p.id}>
              <SelectLabel>{p.name_en}</SelectLabel>
              {kids.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name_en}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            <SelectItem key={p.id} value={p.id}>
              {p.name_en}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
