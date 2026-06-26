/** Report reasons shown in the UI and validated by the server action. */
export const REPORT_REASONS = [
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'fake', label: 'Fake listing' },
  { value: 'wrong_category', label: 'Wrong category' },
  { value: 'prohibited', label: 'Prohibited item' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value) as readonly string[]
