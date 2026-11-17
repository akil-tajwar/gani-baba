import type { Config } from 'tailwindcss'

/**
 * THEME COLORS
 * ------------------------------------------------------------------
 * The whole site (storefront + dashboard) is coloured from just two
 * CSS variables defined in app/globals.css:
 *
 *    --primary-color     (buttons, links, prices, highlights)
 *    --secondary-color   (header, footer, dashboard sidebar)
 *    --surface-color     (soft beige panels: hero, tiles, banners)
 *
 * Change those two hex values and every shade below follows.
 */
type AlphaArg = { opacityValue?: string }

const withAlpha =
  (css: string) =>
  ({ opacityValue }: AlphaArg) => {
    if (opacityValue === undefined) return css
    const n = Number(opacityValue)
    // numeric alpha, e.g. bg-primary/50
    if (!Number.isNaN(n)) {
      return n === 1
        ? css
        : `color-mix(in srgb, ${css} ${n * 100}%, transparent)`
    }
    // Tailwind passes "var(--tw-bg-opacity)" for plain utilities like bg-primary
    return `color-mix(in srgb, ${css} calc(${opacityValue} * 100%), transparent)`
  }

const mix = (variable: string, other: 'white' | 'black', pct: number) =>
  `color-mix(in srgb, var(${variable}) ${pct}%, ${other})`

const scale = (variable: string) => ({
  DEFAULT: withAlpha(`var(${variable})`),
  50: withAlpha(mix(variable, 'white', 8)),
  100: withAlpha(mix(variable, 'white', 16)),
  200: withAlpha(mix(variable, 'white', 30)),
  300: withAlpha(mix(variable, 'white', 50)),
  400: withAlpha(mix(variable, 'white', 72)),
  500: withAlpha(mix(variable, 'white', 88)),
  600: withAlpha(`var(${variable})`),
  700: withAlpha(mix(variable, 'black', 86)),
  800: withAlpha(mix(variable, 'black', 72)),
  900: withAlpha(mix(variable, 'black', 56)),
  foreground: '#ffffff',
})

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: scale('--primary-color'),
        secondary: scale('--secondary-color'),
        surface: {
          DEFAULT: withAlpha('var(--surface-color)'),
          dark: withAlpha(mix('--surface-color', 'black', 94)),
        },
        sidebar: {
          DEFAULT: withAlpha('var(--secondary-color)'),
          foreground: '#ffffff',
          primary: withAlpha('var(--primary-color)'),
          'primary-foreground': '#ffffff',
          accent: withAlpha(mix('--secondary-color', 'white', 84)),
          'accent-foreground': '#ffffff',
          border: withAlpha(mix('--secondary-color', 'white', 80)),
          ring: withAlpha('var(--primary-color)'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(22px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        zoomOut: {
          from: { transform: 'scale(1.12)' },
          to: { transform: 'scale(1)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        fadeUp: 'fadeUp 0.9s cubic-bezier(0.22,1,0.36,1) both',
        zoomOut: 'zoomOut 7s ease-out both',
        slideDown: 'slideDown 0.18s ease-out',
        slideDownFast: 'slideDown 0.12s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config
