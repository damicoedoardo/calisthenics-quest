'use client';

import { useState } from 'react';
import { Hero } from './Hero';
import { CLASSES, makeGear, tiersAt, uniformGear, type ClassId, type Gear, type GearSlot, type Tier } from '@/lib/gear';

interface Props {
  /** Workouts done: the preview wears the gear they've forged (at least tier 2, so it looks the part). */
  workouts: number;
  current?: ClassId;
  onPick: (id: ClassId) => void;
  onCancel?: () => void;
  /** The line under the classes (the opening says it in the flame's words). */
  note?: string;
  /** Sweat coins a change costs now, and how many you have (src/lib/sweat.ts). */
  cost?: number;
  coins?: number;
}

/** Four weapons in the ash: the player picks who they fight as. */
export function ClassPicker({ workouts, current, onPick, onCancel, note, cost = 0, coins = 0 }: Props) {
  const [pick, setPick] = useState<ClassId>(current ?? 'warrior');
  const cls = CLASSES.find((c) => c.id === pick)!;
  const tiers = tiersAt(workouts);
  const preview = Object.fromEntries((['weapon', 'armor', 'shield'] as GearSlot[]).map((s) => [s, makeGear(s, Math.max(tiers[s], 2) as Tier, pick)])) as Record<GearSlot, Gear>;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950">
      {/* Held sideways: the hero you'd be on the left, the four classes and the button on the right. */}
      <div className="safe-top land-safe-x mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 [@media(orientation:landscape)_and_(max-height:600px)]:min-h-0 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:flex-row [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:gap-8 [@media(orientation:landscape)_and_(max-height:600px)]:pb-3">
        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:items-center">
        <p className="mt-4 text-center font-pixel text-xs text-gold-300 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">Choose your class</p>
        <div className="mt-4 flex justify-center [@media(orientation:landscape)_and_(max-height:600px)]:mt-2">
          <Hero gear={preview} classId={pick} size={170} />
        </div>
        <p className="mt-2 text-center text-xl font-bold text-slate-50">{cls.name}</p>
        <p className="text-center text-sm text-slate-300">{cls.pitch}</p>
        <p className="mt-1 text-center text-xs text-slate-500">
          In the Fog it leans to {cls.lean}, a little. Your stat points do the rest.
        </p>

        </div>
        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:flex-col">
        <div className="mt-6 grid grid-cols-2 gap-2 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setPick(c.id)}
              className={`flex items-center gap-2 rounded-xl py-2 pl-2 pr-3 text-left text-sm font-semibold transition active:scale-95 ${pick === c.id ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-300'}`}
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-950/40">
                {/* a bust: the 64px figure, its head and shoulders in the frame */}
                <span className="-ml-2 -mt-0.5 block">
                  <Hero gear={uniformGear(c.id, 2)} classId={c.id} size={64} bounce={false} />
                </span>
              </span>
              <span className="min-w-0">
                {c.name}
                <span className="block text-[11px] font-normal opacity-80">{c.lean}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 [@media(orientation:landscape)_and_(max-height:600px)]:hidden" />
        <p className="mb-3 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 text-center text-xs text-slate-500">{note ?? (current ? (cost ? `It only changes how you fight in the Fog. A change costs ${cost} sweat coins; every workout earns one.` : 'It only changes how you fight in the Fog. Your first change is free.') : 'It only changes how you fight in the Fog. You can change class later on the Hero tab.')}</p>
        <button
          onClick={() => onPick(pick)}
          disabled={pick === current || coins < cost}
          className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:bg-ink-700 disabled:text-slate-500 disabled:shadow-none"
        >
          {pick === current ? `You are ${/^[AEIOU]/.test(cls.name) ? 'an' : 'a'} ${cls.name}` : `Become ${/^[AEIOU]/.test(cls.name) ? 'an' : 'a'} ${cls.name}${cost ? ` · ${cost} sweat coins` : ''}`}
        </button>
        {cost > 0 && pick !== current && coins < cost && (
          <p className="mt-2 text-center text-xs text-red-300">
            You have {coins} sweat coin{coins === 1 ? '' : 's'}. Every workout earns one.
          </p>
        )}
        {onCancel && (
          <button onClick={onCancel} className="mt-2 w-full py-2 text-sm text-slate-500">
            Not now
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
