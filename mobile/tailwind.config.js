/**
 * Query & Buy design tokens (NativeWind v4).
 * Light-first premium palette; dark mode kept as a tuned secondary theme.
 * Single source for color — components must not hardcode hex values
 * (icon colors use the ICON constants in src/theme/colors.ts).
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: { DEFAULT: '#0B6B50', dark: '#074A39', light: '#E9F2EE' },
        accent: { DEFAULT: '#D9B95B', deep: '#8A6D1F' },
        danger: '#C84141',
        // Light surfaces
        background: '#F7F8F6',
        card: '#FFFFFF',
        border: '#E5E8E2',
        ink: '#151714',
        muted: '#666B64',
        // Dark surfaces (secondary theme, same hue family)
        'background-dark': '#121411',
        'card-dark': '#1D211C',
        'border-dark': '#333831',
        'ink-dark': '#F2F4F0',
        'muted-dark': '#9AA096',
      },
      borderRadius: { qb: 20, img: 16 },
    },
  },
  plugins: [],
}
