import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wood: { DEFAULT: '#4ade80', light: '#bbf7d0', dark: '#166534' },
        fire: { DEFAULT: '#f87171', light: '#fecaca', dark: '#991b1b' },
        earth: { DEFAULT: '#fbbf24', light: '#fef3c7', dark: '#92400e' },
        metal: { DEFAULT: '#f5f5f4', light: '#fafaf9', dark: '#78716c' },
        water: { DEFAULT: '#60a5fa', light: '#bfdbfe', dark: '#1e3a5f' },
        destiny: {
          50: '#faf8f5',
          100: '#f5efe8',
          200: '#e8d9c8',
          300: '#d4b896',
          400: '#c09568',
          500: '#b47d44',
          600: '#9d6534',
          700: '#824f2c',
          800: '#6b4128',
          900: '#583623',
          950: '#301b10',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"PingFang SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
