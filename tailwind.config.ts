import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        ink: { 950: '#0b0d14', 900: '#11141f', 800: '#181c2b', 700: '#232840', 600: '#30375a' },
        gold: { 300: '#fde68a', 400: '#fbbf24', 500: '#f59e0b' },
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        fall: { '0%': { transform: 'translateY(-10vh) rotate(0)' }, '100%': { transform: 'translateY(110vh) rotate(540deg)' } },
      },
      animation: {
        pop: 'pop .45s ease-out both',
        float: 'float 2.4s ease-in-out infinite',
        fall: 'fall linear forwards',
      },
    },
  },
  plugins: [],
} satisfies Config;
