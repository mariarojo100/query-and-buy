/** listing_condition enum → display labels. */
export const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'used', label: 'Used' },
  { value: 'for_parts', label: 'For parts' },
] as const

export type Condition = (typeof CONDITIONS)[number]['value']

export const CONDITION_VALUES = CONDITIONS.map((c) => c.value) as readonly string[]

export function conditionLabel(value?: string | null): string | null {
  return CONDITIONS.find((c) => c.value === value)?.label ?? null
}
