'use client';

import { useState, type ReactNode } from 'react';
import { Ember } from './Characters';
import { Sprite } from './Sprite';
import type { GameState } from '@/lib/game';
import { heroCode, needsCarry, readHeroCode, type Platform } from '@/lib/install';
import type { InstallStep } from '@/sprites/characters/install';

/* After the prologue, a phone that runs FORMA in a browser tab is asked to install it before the
   game goes on: it opens full screen, works with no signal, and the browser won't clear the save.
   The guide is for this phone's browser, a picture per step. On iPhones the installed app starts
   with its own empty storage, so the hero goes across as a code: copied here, pasted there
   (BringHero, on the installed app's first screen). The rules are in src/lib/install.ts. */

const goldButton =
  'w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-40';

interface Step {
  art?: InstallStep;
  title: string;
  text: ReactNode;
  /** A button or note under the words. */
  extra?: ReactNode;
}

interface Props {
  state: GameState;
  platform: Platform;
  /** Android: the browser's own install prompt is ready. */
  canPrompt: boolean;
  /** Android: the app was just installed from here. */
  installed: boolean;
  onInstall: () => void;
  /** Developer mode: play on in the browser. */
  onSkip?: () => void;
}

export function InstallGate({ state, platform, canPrompt, installed, onInstall, onSkip }: Props) {
  const host = typeof window === 'undefined' ? '' : window.location.host;
  const copy = <CopyHero state={state} />;
  const openIt: Step = {
    art: 'home',
    title: 'Open FORMA from your home screen',
    text: needsCarry(platform) ? (
      <>
        Tap <b className="text-gold-300">Paste my hero</b> on the first screen, and you&apos;re back where you left off.
      </>
    ) : (
      'Your hero is already there.'
    ),
  };
  const copyStep: Step = {
    title: 'Copy your hero',
    text: 'Your progress is saved in this browser. The app starts empty, so take your hero with you.',
    extra: copy,
  };
  const addStep: Step = {
    art: 'iosAdd',
    title: 'Tap Add to Home Screen',
    text: (
      <>
        Scroll down if it isn&apos;t there, or tap <b>View More</b>. Leave <b>Open as Web App</b> on, then tap <b>Add</b>.
      </>
    ),
  };

  const steps: Step[] =
    platform === 'ios-safari'
      ? [
          copyStep,
          {
            art: 'iosShare',
            title: 'Tap Share',
            text: (
              <>
                The square with the arrow, at the bottom of Safari. If you only see <b>⋯</b>, tap it first, then <b>Share</b>.
              </>
            ),
          },
          addStep,
          openIt,
        ]
      : platform === 'ios-chrome'
        ? [copyStep, { art: 'iosChromeShare', title: 'Tap Share', text: 'The square with the arrow, at the right end of the address bar.' }, addStep, openIt]
        : platform === 'ios-other'
          ? [
              copyStep,
              {
                art: 'safari',
                title: 'Open FORMA in Safari',
                text: (
                  <>
                    This browser can&apos;t add apps to the home screen. Open Safari and go to <b className="select-all text-gold-300">{host}</b>
                  </>
                ),
              },
              { art: 'home', title: 'Tap Paste my hero', text: 'On the first screen in Safari. Then it shows you how to install.' },
            ]
          : canPrompt
            ? [
                {
                  title: 'Install FORMA',
                  text: 'One tap, and it lands on your home screen.',
                  extra: (
                    <button onClick={onInstall} className={`mt-3 ${goldButton}`}>
                      Install
                    </button>
                  ),
                },
                openIt,
              ]
            : [
                { art: 'androidMenu', title: 'Tap the menu', text: <>The three dots <b>⋮</b> at the top right of the browser.</> },
                {
                  art: 'androidAdd',
                  title: 'Tap Install app',
                  text: (
                    <>
                      Some browsers call it <b>Add to Home screen</b>. Then tap <b>Install</b>. If it says <b>Open app</b>, it&apos;s already installed.
                    </>
                  ),
                },
                openIt,
              ];

  return (
    <div className="safe-top fixed inset-0 z-40 overflow-y-auto bg-ink-950 land-safe-x">
      <div className="mx-auto flex max-w-md flex-col px-5 pb-10 pt-6 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-[15rem_minmax(0,1fr)] [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-8 [@media(orientation:landscape)_and_(max-height:600px)]:pt-4">
        <div className="flex flex-col items-center text-center [@media(orientation:landscape)_and_(max-height:600px)]:sticky [@media(orientation:landscape)_and_(max-height:600px)]:top-4 [@media(orientation:landscape)_and_(max-height:600px)]:self-start">
          <Ember size={64} stage="spark" />
          <h1 className="mt-4 font-pixel text-sm leading-relaxed text-gold-400">One last step</h1>
          <p className="mt-3 text-sm text-slate-300">
            Put FORMA on your home screen. It opens full screen, works with no signal, and keeps your hero safe.
          </p>
          {installed && (
            <p role="status" className="mt-4 rounded-xl bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200 ring-1 ring-emerald-500/40">
              Installed. Open FORMA from your home screen.
            </p>
          )}
        </div>
        <ol className="mt-6 space-y-3 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-2xl bg-ink-900 p-4 pixel-border">
              <div className="flex w-[88px] shrink-0 flex-col items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-700 font-pixel text-[10px] text-gold-300">{i + 1}</span>
                {s.art && <Sprite id="installStep" opts={{ step: s.art }} size={s.art === 'safari' ? 56 : 88} label="" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-pixel text-[10px] leading-relaxed text-gold-300">{s.title}</h2>
                <p className="mt-1.5 text-sm text-slate-300">{s.text}</p>
                {s.extra}
              </div>
            </li>
          ))}
          {onSkip && (
            <li className="list-none pt-2 text-center">
              <button onClick={onSkip} className="rounded-xl border border-dashed border-sky-400/60 px-4 py-2.5 text-sm text-sky-300">
                Play here without installing (developer mode)
              </button>
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}

/** Copies the hero code. If the clipboard is blocked, shows the code to copy by hand. */
function CopyHero({ state }: { state: GameState }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const code = heroCode(state);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('copied');
    } catch {
      setStatus('manual');
    }
  };
  return (
    <div className="mt-3">
      <button onClick={copy} className={goldButton}>
        {status === 'copied' ? 'Copied ✓' : 'Copy my hero'}
      </button>
      {status === 'manual' && (
        <>
          <p className="mt-2 text-xs text-slate-400">Press and hold the box, Select All, then Copy.</p>
          <textarea readOnly value={code} onFocus={(e) => e.currentTarget.select()} className="mt-1 h-16 w-full rounded-lg bg-ink-950 p-2 font-mono text-[10px] text-slate-400" />
        </>
      )}
    </div>
  );
}

/**
 * On the first screen on iPhones (the installed app, or Safari after another browser): brings in
 * the hero copied there. Reads the
 * clipboard when it may; otherwise the player pastes the code into a box.
 */
export function BringHero({ onBring, startOpen = false }: { onBring: (s: GameState) => void; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [note, setNote] = useState('');
  const [manual, setManual] = useState(false);
  const take = (text: string) => {
    const s = readHeroCode(text);
    if (s) return onBring(s);
    setNote('No hero there. Open FORMA where you started, tap Copy my hero, then come back.');
  };
  const paste = async () => {
    setNote('');
    try {
      take(await navigator.clipboard.readText());
    } catch {
      setManual(true);
    }
  };
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-6 text-sm text-slate-400 underline underline-offset-4">
        Started in another browser? Bring your hero
      </button>
    );
  return (
    <div className="mt-6 w-full max-w-xs rounded-2xl bg-ink-900 p-4 text-left pixel-border">
      <p className="mb-3 text-sm text-slate-300">{startOpen ? 'Started in Safari? Bring the hero you copied there.' : 'Bring in the hero you copied.'}</p>
      <button onClick={paste} className={goldButton}>
        Paste my hero
      </button>
      {manual && (
        <textarea
          aria-label="Your hero code"
          placeholder="Press and hold here, then Paste"
          onChange={(e) => take(e.target.value)}
          className="mt-3 h-16 w-full rounded-lg bg-ink-950 p-2 font-mono text-[10px] text-slate-300"
        />
      )}
      {note && <p className="mt-2 text-xs text-gold-300">{note}</p>}
    </div>
  );
}
