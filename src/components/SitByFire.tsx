'use client';

import { useEffect, useState } from 'react';
import { Ember } from './Characters';
import { PlaceBackdrop } from './Place';
import { PixelSnap } from './sideways';
import { SoundToggle, useMusic } from './Sound';
import { useModal } from './useModal';
import type { FlameStage } from '@/sprites/characters/ember';

interface Props {
  name: string;
  stage: FlameStage;
  /** What the flame says once the minute is over. */
  line: string;
  /** Called with true when the whole minute was sat through. */
  onDone: (sat: boolean) => void;
  seconds?: number;
}

/** One minute of slow breathing by the fire: the flame grows as you breathe in and settles as you breathe out. */
export function SitByFire({ name, stage, line, onDone, seconds = 60 }: Props) {
  const [left, setLeft] = useState(seconds);
  const done = left <= 0;
  useMusic('camp');
  // Escape stops, or leaves once the minute is done.
  const box = useModal<HTMLDivElement>(() => onDone(done));

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left, done]);

  // The breathe animation is 10 s: in for 5, out for 5.
  const breathingIn = (seconds - left) % 10 < 5;

  return (
    <PixelSnap.Provider value>
      <div ref={box} className="fixed inset-0 z-50 !mt-0 flex flex-col overflow-hidden bg-ink-950 outline-none" role="dialog" aria-modal="true" aria-label="Sit by the fire">
        <PlaceBackdrop id="ashlands-camp" className="absolute inset-0" stage={0.25} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950 via-ink-950/80 to-transparent [@media(orientation:landscape)_and_(max-height:600px)]:h-1/4" />

        <div className="safe-top land-safe-x relative z-10 flex justify-between px-4">
          <SoundToggle />
          {!done && (
            <button onClick={() => onDone(false)} className="rounded-md px-3 py-2 text-xs text-slate-400">
              Stop
            </button>
          )}
        </div>

        {/* Held sideways: the flame on the left, the breathing words on the right. */}
        <div className="land-safe-x contents [@media(orientation:landscape)_and_(max-height:600px)]:relative [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:min-h-0 [@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:gap-8">
        <div className="relative flex flex-1 items-end justify-center pb-8 [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:pb-4">
          <div className={done ? 'animate-pop' : 'animate-breathe'}>
            <Ember size={stage === 'spark' ? 200 : 140} stage={stage} mood={done ? 'happy' : 'sleepy'} />
          </div>
        </div>

        <div className="safe-bottom relative mx-auto w-full max-w-md px-6 pb-10 text-center [@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:pb-4">
          {done ? (
            <div className="animate-fadein">
              <p className="font-pixel text-[10px] text-orange-300">{name}</p>
              <p className="mt-2 text-lg text-slate-100">&ldquo;{line}&rdquo;</p>
              <p className="mt-3 text-xs text-slate-400">That counts as rest. Your Fog runs today start Rested.</p>
              <button
                onClick={() => onDone(true)}
                className="mt-6 w-full rounded-2xl bg-gold-400 py-3.5 font-pixel text-[10px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
              >
                Back to today
              </button>
            </div>
          ) : (
            <>
              <p key={breathingIn ? 'in' : 'out'} className="animate-fadein text-2xl text-slate-100">
                {breathingIn ? 'Breathe in…' : 'Breathe out…'}
              </p>
              <p className="mt-2 text-sm text-slate-400">{name} breathes with you.</p>
              <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-ink-700">
                <div className="h-full bg-orange-300/70 transition-all duration-1000 ease-linear" style={{ width: `${((seconds - left) / seconds) * 100}%` }} />
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </PixelSnap.Provider>
  );
}
