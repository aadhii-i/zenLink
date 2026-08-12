/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Secondary accent used sparingly in gradients/glows alongside
        // primary — never as a standalone UI color — to keep the palette
        // restrained rather than introducing a second competing brand hue.
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
      },
      fontFamily: {
        // System-first stack: looks like "Inter" on most modern OSes
        // (San Francisco / Segoe UI Variable / Inter itself on Linux with
        // it installed) without downloading any font file — zero added
        // network requests or bundle weight.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        premium:
          '0 1px 1px 0 rgb(0 0 0 / 0.03), 0 4px 12px -2px rgb(0 0 0 / 0.06), 0 12px 32px -8px rgb(0 0 0 / 0.08)',
        'premium-lg':
          '0 2px 4px 0 rgb(0 0 0 / 0.04), 0 8px 24px -4px rgb(0 0 0 / 0.08), 0 24px 48px -12px rgb(0 0 0 / 0.12)',
        glow: '0 0 0 1px rgb(37 99 235 / 0.1), 0 0 24px -4px rgb(37 99 235 / 0.35)',
        'glow-lg': '0 0 0 1px rgb(37 99 235 / 0.12), 0 0 48px -8px rgb(37 99 235 / 0.4)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--doodle-rotate, 0deg))' },
          '50%': { transform: 'translateY(-8px) rotate(var(--doodle-rotate, 0deg))' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to: { backgroundPosition: '200% 0' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '70%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'draw-line': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        'count-pulse': {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out both',
        'fade-in-up': 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'float-slower': 'float 12s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'count-pulse': 'count-pulse 0.3s ease-out both',
      },
      backgroundSize: {
        grid: '32px 32px',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
