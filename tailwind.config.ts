import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        'bg-elevated': '#0A0A0A',
        'bg-overlay': '#141414',
        border: '#1F1F1F',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8A8A8E',
        'text-tertiary': '#48484A',
        'accent-green': '#34C759',
        'accent-crimson': '#FF2D55',
        'accent-warning': '#FF9500',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
