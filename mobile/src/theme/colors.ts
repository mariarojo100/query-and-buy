/**
 * Programmatic color constants — for props that can't take Tailwind classes
 * (Ionicons `color`, navigator/tab-bar options, shadow colors). Mirrors
 * tailwind.config.js exactly. Keep the two in sync.
 */
export const COLORS = {
  // Brand
  primary: '#0B6B50',
  primaryDark: '#074A39',
  primaryLight: '#E4EEE8',
  primaryTint: '#F0F6F2',
  accent: '#C4A24E',
  accentDeep: '#94742C',
  accentLight: '#F4ECD6',
  // Status
  danger: '#C13B3B',
  success: '#1E8A5F',
  warning: '#B37F22',
  info: '#2E6BB0',
  // Light surfaces
  background: '#F5F4EF',
  sunken: '#ECEAE2',
  card: '#FFFFFF',
  border: '#E7E4DA',
  borderStrong: '#D5D1C5',
  ink: '#17190F',
  inkSoft: '#565A4D',
  muted: '#868A7B',
  // Dark surfaces (layered)
  backgroundDark: '#0E1411',
  sunkenDark: '#121A16',
  cardDark: '#18211D',
  elevatedDark: '#202B26',
  borderDark: '#29332D',
  borderStrongDark: '#3B473F',
  inkDark: '#EEF1EA',
  inkSoftDark: '#AFB6AA',
  mutedDark: '#7E867B',
} as const
