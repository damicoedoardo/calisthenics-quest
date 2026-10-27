import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        // A phone held sideways: short and wide. The tabs get a side rail and two columns.
        // (Tailwind's own `landscape:` stays as it is; this one leaves tablets and desktops out.)
        land: { raw: '(orientation: landscape) and (max-height: 600px)' },
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        ink: { 950: '#0b0d14', 900: '#11141f', 800: '#181c2b', 700: '#232840', 600: '#30375a' },
        gold: { 300: '#fde68a', 400: '#fbbf24', 500: '#f59e0b' },
        // Tailwind's slate-500 reads at under 4:1 on the ink cards; this one keeps it the quiet
        // grey under slate-400 but clears 4.5:1 on ink-950 to ink-700.
        slate: { 500: '#8291a7' },
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        fall: { '0%': { transform: 'translateY(-10vh) rotate(0)' }, '100%': { transform: 'translateY(110vh) rotate(540deg)' } },
        flicker: { '0%,100%': { transform: 'scale(1,1)' }, '25%': { transform: 'scale(.97,1.04)' }, '50%': { transform: 'scale(1.03,.97)' }, '75%': { transform: 'scale(.98,1.02)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%': { transform: 'translateX(-6px)' }, '40%': { transform: 'translateX(6px)' }, '60%': { transform: 'translateX(-4px)' }, '80%': { transform: 'translateX(4px)' } },
        hit: { '0%': { transform: 'translate(0,0) scale(.6)', opacity: '0' }, '20%': { opacity: '1' }, '100%': { transform: 'translate(0,-48px) scale(1.2)', opacity: '0' } },
        beacon: { '0%,5%': { opacity: '1' }, '6%,11%': { opacity: '0' }, '12%,17%': { opacity: '1' }, '18%,100%': { opacity: '0' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        rain: { '0%': { transform: 'translateY(-20vh)' }, '100%': { transform: 'translateY(120vh)' } },
        ash: { '0%': { transform: 'translate(0,-10vh)' }, '50%': { transform: 'translate(12px,50vh)' }, '100%': { transform: 'translate(-8px,110vh)' } },
        fadein: { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        lunge: { '0%,100%': { transform: 'translateX(0)' }, '40%': { transform: 'translateX(28px)' } },
        recoil: { '0%,100%': { transform: 'translateX(0)' }, '40%': { transform: 'translateX(-28px)' } },
        flash: { '0%,100%': { opacity: '0' }, '20%': { opacity: '.7' } },
        rise: { '0%': { transform: 'translate(0,10vh)', opacity: '0' }, '15%': { opacity: '1' }, '100%': { transform: 'translate(10px,-90vh)', opacity: '0' } },
        snow: { '0%': { transform: 'translate(0,-10vh)' }, '50%': { transform: 'translate(-14px,50vh)' }, '100%': { transform: 'translate(10px,110vh)' } },
        drift: { '0%,100%': { transform: 'translateX(-12%)' }, '50%': { transform: 'translateX(12%)' } },
        enterleft: { '0%': { transform: 'translateX(-60vw)' }, '100%': { transform: 'translateX(0)' } },
        enterright: { '0%': { transform: 'translateX(60vw)' }, '100%': { transform: 'translateX(0)' } },
        enterbelow: { '0%': { transform: 'translateY(40%)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        bigshake: { '0%,100%': { transform: 'translate(0,0)' }, '15%': { transform: 'translate(-10px,4px)' }, '30%': { transform: 'translate(9px,-5px)' }, '45%': { transform: 'translate(-7px,3px)' }, '60%': { transform: 'translate(6px,-2px)' }, '80%': { transform: 'translate(-3px,1px)' } },
        breathe: { '0%,100%': { transform: 'scale(.86)' }, '50%': { transform: 'scale(1.14)' } },
        ignite: { '0%': { transform: 'scale(.2)', opacity: '0' }, '40%': { transform: 'scale(1.1)', opacity: '1' }, '100%': { transform: 'scale(1)', opacity: '.6' } },
        turn: { '0%,20%': { transform: 'rotate(0)' }, '55%,85%': { transform: 'rotate(90deg)' }, '100%': { transform: 'rotate(0)' } },
      },
      animation: {
        pop: 'pop .45s ease-out both',
        float: 'float 2.4s ease-in-out infinite',
        fall: 'fall linear forwards',
        flicker: 'flicker 1.6s ease-in-out infinite',
        shake: 'shake .4s ease-in-out',
        hit: 'hit .9s ease-out forwards',
        blink: 'blink 1s step-end infinite',
        beacon: 'beacon 5s step-end infinite',
        rain: 'rain linear infinite',
        ash: 'ash linear infinite',
        fadein: 'fadein 1s ease-out both',
        lunge: 'lunge .5s ease-in-out',
        recoil: 'recoil .5s ease-in-out',
        flash: 'flash .9s ease-out both',
        rise: 'rise linear infinite',
        snow: 'snow linear infinite',
        drift: 'drift 14s ease-in-out infinite',
        enterleft: 'enterleft .7s cubic-bezier(.2,.8,.3,1) both',
        enterright: 'enterright .7s cubic-bezier(.2,.8,.3,1) both',
        enterbelow: 'enterbelow .7s ease-out both',
        bigshake: 'bigshake .6s ease-in-out',
        breathe: 'breathe 10s ease-in-out infinite',
        turn: 'turn 1.8s ease-in-out infinite',
        ignite: 'ignite .9s ease-out both',
      },
    },
  },
  plugins: [],
} satisfies Config;
