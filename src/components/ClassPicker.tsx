'use client';

import { useState } from 'react';
import { Hero } from './Hero';
import { CLASSES, equippedGear, type ClassId } from '@/lib/gear';
import { getPath, type PathId } from '@/lib/skills';

interface Props {
  progress: Record<PathId, number>;
  current?: ClassId;
  onPick: (id: ClassId) => void;
  onCancel?: () => void;
}

/** Four weapons in the ash: the player picks who they fight as. */
export function ClassPicker({ progress, current, onPick, onCancel }: Props) {
  const [pick, setPick] = useState<ClassId>(current ?? 'warrior');
  const cls = CLASSES.find((c) => c.id === pick)!;
  const pathLabel = cls.path === 'balance' ? 'Your weakest path' : getPath(cls.path).name;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950">
      <div className="safe-top mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6">
        <p className="mt-4 text-center font-pixel text-xs text-gold-300">Choose your class</p>
        <div className="mt-4 flex justify-center">
          <Hero gear={equippedGear(pick, { push: Math.max(progress.push, 2), pull: Math.max(progress.pull, 2), core: Math.max(progress.core, 2) })} classId={pick} size={170} />
        </div>
        <p className="mt-2 text-center text-xl font-bold text-slate-50">{cls.name}</p>
        <p className="text-center text-sm text-slate-300">{cls.pitch}</p>
        <p className="mt-1 text-center text-xs text-slate-500">
          +10% XP on {pathLabel}. Your {cls.weapon} is forged by it.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              onClick={() => setPick(c.id)}
              className={`flex items-center gap-2 rounded-xl py-2 pl-2 pr-3 text-left text-sm font-semibold transition active:scale-95 ${pick === c.id ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-300'}`}
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-950/40">
                {/* a bust: the 64px figure, its head and shoulders in the frame */}
                <span className="-ml-2 -mt-0.5 block">
                  <Hero gear={equippedGear(c.id, { push: 2, pull: 2, core: 2 })} classId={c.id} size={64} bounce={false} />
                </span>
              </span>
              <span className="min-w-0">
                {c.name}
                <span className="block text-[11px] font-normal opacity-80">{c.path === 'balance' ? 'Balance' : getPath(c.path).name}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1" />
        <p className="mb-3 text-center text-xs text-slate-500">You still train everything. You can change class later on the Hero tab.</p>
        <button
          onClick={() => onPick(pick)}
          className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
        >
          Become {/^[AEIOU]/.test(cls.name) ? 'an' : 'a'} {cls.name}
        </button>
        {onCancel && (
          <button onClick={onCancel} className="mt-2 w-full py-2 text-sm text-slate-500">
            Not now
          </button>
        )}
      </div>
    </div>
  );
}
