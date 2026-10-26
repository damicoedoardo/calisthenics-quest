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
        flicker: { '0%,100%': { transform: 'scale(1,1)' }, '25%': { transform: 'scale(.97,1.04)' }, '50%': { transform: 'scale(1.03,.97)' }, '75%': { transform: 'scale(.98,1.02)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%': { transform: 'translateX(-6px)' }, '40%': { transform: 'translateX(6px)' }, '60%': { transform: 'translateX(-4px)' }, '80%': { transform: 'translateX(4px)' } },
        hit: { '0%': { transform: 'translate(0,0) scale(.6)', opacity: '0' }, '20%': { opacity: '1' }, '100%': { transform: 'translate(0,-48px) scale(1.2)', opacity: '0' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        rain: { '0%': { transform: 'translateY(-20vh)' }, '100%': { transform: 'translateY(120vh)' } },
        ash: { '0%': { transform: 'translate(0,-10vh)' }, '50%': { transform: 'translate(12px,50vh)' }, '100%': { transform: 'translate(-8px,110vh)' } },
        fadein: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        lunge: { '0%,100%': { transform: 'translateX(0)' }, '40%': { transform: 'translateX(28px)' } },
        recoil: { '0%,100%': { transform: 'translateX(0)' }, '40%': { transform: 'translateX(-28px)' } },
        flash: { '0%,100%': { opacity: '0' }, '20%': { opacity: '.7' } },
      },
      animation: {
        pop: 'pop .45s ease-out both',
        float: 'float 2.4s ease-in-out infinite',
        fall: 'fall linear forwards',
        flicker: 'flicker 1.6s ease-in-out infinite',
        shake: 'shake .4s ease-in-out',
        hit: 'hit .9s ease-out forwards',
        blink: 'blink 1s step-end infinite',
        rain: 'rain linear infinite',
        ash: 'ash linear infinite',
        fadein: 'fadein 1s ease-out both',
        lunge: 'lunge .5s ease-in-out',
        recoil: 'recoil .5s ease-in-out',
        flash: 'flash .9s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
