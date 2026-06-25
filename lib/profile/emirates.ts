/** The 7 UAE emirates — values match the Postgres `emirate` enum. */
export const EMIRATES = [
  { value: 'dubai', label: 'Dubai' },
  { value: 'abu_dhabi', label: 'Abu Dhabi' },
  { value: 'sharjah', label: 'Sharjah' },
  { value: 'ajman', label: 'Ajman' },
  { value: 'umm_al_quwain', label: 'Umm Al Quwain' },
  { value: 'ras_al_khaimah', label: 'Ras Al Khaimah' },
  { value: 'fujairah', label: 'Fujairah' },
] as const

export type Emirate = (typeof EMIRATES)[number]['value']

export const EMIRATE_VALUES = EMIRATES.map((e) => e.value) as readonly string[]

export function emirateLabel(value?: string | null): string | null {
  return EMIRATES.find((e) => e.value === value)?.label ?? null
}
