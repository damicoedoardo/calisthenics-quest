'use client';

import { useEffect, useRef, useState } from 'react';
import { Sprite } from './Sprite';
import { SoundToggle } from './Sound';
import { music } from '@/lib/music';
import { dayNumber } from '@/lib/days';
import type { GameState } from '@/lib/game';

/* The few seconds when the app opens: the small flame catches, FORMA lands one letter per note, and the
   day's number shows which day of the book this is. Once per app open; a tap skips it. Where sound
   needs a tap first (iPhones), the flame waits on "Tap to start", like an old console. */

const KEY = 'forma-opened';
/** One step of the opening sting (100 bpm, four steps a beat), so letters land on its notes. */
const STEP = 150;
const LETTERS = ['F', 'O', 'R', 'M', 'A'];
/** The first letter lands on the sting's fourth step. */
const FIRST = 3 * STEP;
const LINE_AT = 9 * STEP;
const LEAVE_AT = 2700;
const FADE = 320;
/** Rising sparks: left offset in px, delay and length in ms. */
const SPARKS: [number, number, number][] = [
  [-34, 100, 2200],
  [-14, 500, 1900],
  [6, 250, 2400],
  [24, 700, 2000],
  [40, 350, 2300],
  [-44, 900, 2100],
];

/** True the first time in this app open (a reload in the same tab doesn't count again). */
export function openingDue(): boolean {
  try {
    if (sessionStorage.getItem(KEY)) return false;
    sessionStorage.setItem(KEY, '1');
  } catch {
    // Storage blocked: play it this time, the page state keeps it from repeating.
  }
  return true;
}

export function Opening({ state, onDone }: { state: GameState; onDone: () => void }) {
  // 'wait': up to a fifth of a second to learn if sound may play without a tap. 'gate': it may not
  // (an iPhone just opened), so the flame waits for a tap to start, and that tap plays the jingle.
  const [phase, setPhase] = useState<'wait' | 'gate' | 'play' | 'out'>('wait');
  const sounded = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  const day = dayNumber(state, new Date());

  const leave = () => {
    setPhase('out');
    later(onDone, FADE);
  };

  // FORMA lands, the line shows, and the opening leaves on its own.
  const play = (sound: boolean) => {
    if (sound) {
      sounded.current = true;
      music.sting('opening');
    }
    setPhase('play');
    later(() => setPhase((p) => (p === 'play' ? 'out' : p)), LEAVE_AT);
    later(onDone, LEAVE_AT + FADE);
  };

  useEffect(() => {
    let gone = false;
    // Muted: don't wake the sound at all. Otherwise some browsers let it start right away.
    if (music.muted) play(false);
    else
      void music.tryStart().then((sound) => {
        if (!gone) sound ? play(true) : setPhase('gate');
      });
    return () => {
      gone = true;
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On click, not pointerdown: a phone only lets a touch start sound once the finger lifts.
  const tap = () => {
    if (phase === 'gate') {
      music.unlock();
      // Muted from the toggle while waiting: still start, quietly.
      return play(!music.muted);
    }
    if (phase === 'play') leave();
  };

  const go = phase !== 'wait';
  const playing = phase === 'play' || phase === 'out';

  return (
    <div
      role="presentation"
      onClick={tap}
      className={`fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-ink-950 transition-opacity duration-300 ${phase === 'out' ? 'pointer-events-none opacity-0' : ''}`}
    >
      <div className="safe-top absolute right-2 top-2 [@media(orientation:landscape)_and_(max-height:600px)]:right-[max(env(safe-area-inset-right),8px)]">
        <SoundToggle />
      </div>
      {go && (
        <>
          <div className="relative grid h-48 w-48 place-items-center">
            {/* A soft round glow drawn as a gradient: a blurred box shows square edges on iPhones while it grows. */}
            <div
              className="absolute inset-0 animate-ignite motion-reduce:animate-none"
              style={{ background: 'radial-gradient(circle closest-side, rgba(249,115,22,.32), rgba(249,115,22,.12) 55%, transparent)' }}
            />
            {SPARKS.map(([x, delay, dur], i) => (
              <span
                key={i}
                aria-hidden
                className="absolute bottom-10 h-[3px] w-[3px] animate-rise bg-gold-400 opacity-0 motion-reduce:hidden"
                style={{ left: `calc(50% + ${x}px)`, animationDelay: `${delay}ms`, animationDuration: `${dur}ms` }}
              />
            ))}
            <div className="relative animate-pop motion-reduce:animate-none">
              <Sprite id="ember" size={192} opts={{ stage: 'spark', mood: 'bright' }} label="Your flame" />
            </div>
          </div>
          {/* Same height either way, so the flame doesn't move when FORMA lands. */}
          <div className="mt-4 flex h-24 flex-col items-center">
            {playing ? (
              <>
                <h1 aria-label="FORMA" className="flex gap-1 font-pixel text-4xl text-gold-300" style={{ textShadow: '3px 3px 0 #b45309' }}>
                  {LETTERS.map((l, i) => (
                    <span key={i} aria-hidden className="animate-pop motion-reduce:animate-none" style={{ animationDelay: `${FIRST + i * STEP}ms` }}>
                      {l}
                    </span>
                  ))}
                </h1>
                <p className="mt-6 animate-fadein font-pixel text-[10px] tracking-wide text-slate-400 motion-reduce:animate-none" style={{ animationDelay: `${LINE_AT}ms` }}>
                  Day {day} <span className="text-slate-600">·</span> <span className="text-orange-300">the fire&apos;s lit</span>
                </p>
              </>
            ) : (
              <p className="mt-6 animate-blink font-pixel text-xs text-gold-300 motion-reduce:animate-none">Tap to start</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
