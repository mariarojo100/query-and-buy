/**
 * Tailwind (NativeWind v4) — tokens ported from the web app's theme so the
 * mobile app is visually the same brand: deep emerald primary, warm neutral
 * surfaces, rounded-3xl cards, soft shadows.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand (mirrors the web emerald/dark-green palette)
        primary: { DEFAULT: '#0e5a43', dark: '#0a4433', light: '#e8f2ee' },
        accent: '#c8a24a',
        // Surfaces
        background: '#faf9f6',
        card: '#ffffff',
        border: '#e7e4dd',
        muted: '#8a8578',
        ink: '#1d1c18',
        // Dark mode pairs
        'background-dark': '#161511',
        'card-dark': '#211f1a',
        'border-dark': '#35322a',
        'muted-dark': '#a29d8f',
        'ink-dark': '#f2f0ea',
        danger: '#b3402a',
      },
      borderRadius: { qb: 24 },
    },
  },
  plugins: [],
}
