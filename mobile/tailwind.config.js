/**
 * Query & Buy design tokens (NativeWind v4) — premium refresh.
 *
 * Two intentional themes that share one hue family:
 *  · LIGHT  — warm editorial canvas, deep ink, emerald brand, brass accent.
 *  · DARK   — layered deep-emerald surfaces (canvas < sunken < surface <
 *             elevated) so it reads as a designed night mode, not a flat
 *             near-black developer theme.
 *
 * Single source for color — components must not hardcode hex values
 * (icon/native colors mirror these in src/theme/colors.ts).
 *
 * Surface ladder (both themes): background → sunken → card/surface → elevated.
 * Text ladder:                  ink → ink-soft → muted.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  // Day-mode-only product: `dark:` variants activate on a `dark` class that is
  // never applied (see colorScheme.set('light') in app/_layout.tsx), so the UI
  // always renders the light theme regardless of the device appearance.
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Brand ────────────────────────────────────────────────
        // "primary" is the ink action colour (near-black buttons/emphasis);
        // "accent" is the warm gold highlight (FAB, active, verified, ribbons).
        // The former emerald is fully retired for the ink+gold "day" identity.
        primary: { DEFAULT: '#17190F', dark: '#0C0D08', light: '#ECE9DF', tint: '#F4F2EB' },
        accent: { DEFAULT: '#C4A24E', deep: '#94742C', light: '#F4ECD6' },

        // ── Status ───────────────────────────────────────────────
        danger: { DEFAULT: '#C13B3B', tint: '#F8E6E3' },
        success: { DEFAULT: '#1E8A5F', tint: '#E1F0E9' },
        warning: { DEFAULT: '#B37F22', tint: '#F6EBD3' },
        info: { DEFAULT: '#2E6BB0', tint: '#E3ECF7' },

        // ── Light surfaces (warm editorial) ──────────────────────
        background: '#F5F4EF',
        sunken: '#ECEAE2',
        card: '#FFFFFF',
        surface: '#FFFFFF',
        elevated: '#FFFFFF',
        border: '#E7E4DA',
        'border-strong': '#D5D1C5',
        ink: '#17190F',
        'ink-soft': '#565A4D',
        muted: '#868A7B',

        // ── Dark surfaces (layered deep emerald-ink) ─────────────
        'background-dark': '#0E1411',
        'sunken-dark': '#121A16',
        'card-dark': '#18211D',
        'surface-dark': '#18211D',
        'elevated-dark': '#202B26',
        'border-dark': '#29332D',
        'border-strong-dark': '#3B473F',
        'ink-dark': '#EEF1EA',
        'ink-soft-dark': '#AFB6AA',
        'muted-dark': '#7E867B',
      },
      borderRadius: {
        qb: 20,
        img: 18,
        field: 14,
        card: 22,
        sheet: 26,
        pill: 999,
      },
    },
  },
  plugins: [],
}
