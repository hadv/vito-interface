/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
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
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        }
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      fontSize: {
        'xs': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '-0.01em' }],
        'sm': ['0.9375rem', { lineHeight: '1.5', fontWeight: '400', letterSpacing: '-0.01em' }],
        'base': ['1rem', { lineHeight: '1.6', fontWeight: '400', letterSpacing: '-0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '500', letterSpacing: '-0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.03em' }],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
