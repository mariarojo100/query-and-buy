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
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Brand ────────────────────────────────────────────────
        primary: { DEFAULT: '#0B6B50', dark: '#074A39', light: '#E4EEE8', tint: '#F0F6F2' },
        accent: { DEFAULT: '#B2842F', deep: '#7C5A17', light: '#F3EAD4' },

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
