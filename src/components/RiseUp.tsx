'use client';

import { useEffect, useRef, useState } from 'react';
import { Hero } from './Hero';
import { Hollow } from './Characters';
import { SoundToggle, useMusic } from './Sound';
import { Weather } from './Weather';
import { FALLEN, RISE_WORDS } from '@/lib/prologue';
import type { Gear, GearSlot } from '@/lib/gear';

const HOLD_MS = 3200;
const SINK_MS = 5000;

/** On the ground after the first fight. The player holds a button to stand back up. */
export function RiseUp({ gear, onDone }: { gear: Record<GearSlot, Gear>; onDone: () => void }) {
  const [line, setLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [stood, setStood] = useState(false);
  const [canGo, setCanGo] = useState(false);
  const holdingRef = useRef(false);
  const progressRef = useRef(0);
  const atHold = line >= FALLEN.length;
  useMusic(stood ? 'rise' : 'heartbeat');

  useEffect(() => {
    holdingRef.current = holding;
  }, [holding]);

  // Holding lifts you; letting go lets you sink back, slowly.
  useEffect(() => {
    if (!atHold || stood) return;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      const p = progressRef.current;
      const next = holdingRef.current ? Math.min(1, p + dt / HOLD_MS) : Math.max(0, p - dt / SINK_MS);
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        setStood(true);
        navigator.vibrate?.([60, 80, 200]);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [atHold, stood]);

  // Let the moment land before a tap can move on.
  useEffect(() => {
    if (!stood) return;
    const t = setTimeout(() => setCanGo(true), 2400);
    return () => clearTimeout(t);
  }, [stood]);

  const current = FALLEN[line];
  const tilt = -90 + 90 * progress;

  return (
    <div
      className="fixed inset-0 z-50 flex select-none flex-col bg-ink-950"
      onClick={() => {
        if (!atHold) setLine((l) => l + 1);
        else if (canGo) onDone();
      }}
    >
      <Weather kind="ash" />
      {stood && <div className="pointer-events-none fixed inset-0 z-[55] animate-flash bg-amber-200" aria-hidden />}
      <div className="safe-top flex px-4">
        <SoundToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8">
        <div className="relative flex flex-1 items-end justify-center pb-4">
          <div className="absolute right-4 top-6 transition-opacity duration-1000" style={{ opacity: stood ? 0.15 : 0.45 }}>
            <Hollow size={90} />
          </div>
          <div
            className="transition-[filter] duration-500"
            style={{
              transform: `rotate(${tilt}deg) translateX(${(-30 * (1 - progress)).toFixed(1)}px)`,
              filter: `grayscale(${1 - progress}) brightness(${0.6 + 0.4 * progress})`,
            }}
          >
            <Hero gear={gear} size={150} bounce={false} />
          </div>
        </div>

        <div className="min-h-[150px] text-center">
          {!atHold && current && (
            <p key={line} className={`animate-fadein text-xl leading-relaxed ${current.who === 'hollow' ? 'text-red-300' : 'text-slate-200'}`}>
              {current.text}
              <span className="mt-4 block text-xs text-slate-600">tap</span>
            </p>
          )}
          {atHold && !stood && (
            <div className="space-y-2">
              {RISE_WORDS.filter((w) => progress >= w.at).map((w) => (
                <p key={w.at} className="animate-fadein text-xl text-slate-100">
                  {w.text}
                </p>
              ))}
            </div>
          )}
          {stood && (
            <div className="space-y-3">
              <p className="animate-fadein text-2xl font-semibold text-gold-300">You&apos;re standing.</p>
              <p className="animate-fadein text-base text-red-300/70 [animation-delay:1.2s]">The Hollow: &ldquo;...We&apos;ll see.&rdquo;</p>
              <p className="animate-fadein text-xs text-slate-500 [animation-delay:2.4s]">tap to go on</p>
            </div>
          )}
        </div>

        {atHold && !stood && (
          <button
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setHolding(true);
            }}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            className="relative mt-2 w-full touch-none overflow-hidden rounded-2xl bg-ink-800 py-5 font-pixel text-xs text-gold-300 pixel-border"
          >
            <span className="absolute inset-y-0 left-0 bg-gold-400/30" style={{ width: `${progress * 100}%` }} />
            <span className="relative">{holding ? 'Keep going...' : 'Hold to get up'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
