'use client';

import { useState } from 'react';
import { Minus, Plus, Wrench, X } from 'lucide-react';
import { initialState, type GameState } from '@/lib/game';
import { CLASSES } from '@/lib/gear';
import { PATHS } from '@/lib/skills';
import { ZONES } from '@/lib/fog';
import { addFakeWorkouts, clearNextZone, resetFog } from '@/lib/dev';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  /** On the live app dev mode can be turned off again; previews always have it. */
  onTurnOff?: () => void;
}

const chip = 'rounded-lg bg-ink-700 px-3 py-2 text-sm text-slate-200 active:scale-95';

/** Developer mode: shortcuts that normal players don't get. */
export function DevPanel({ state, update, onTurnOff }: Props) {
  const [open, setOpen] = useState(false);
  const [skipStory, setSkipStory] = useState(true);
  const [wipe, setWipe] = useState(false);
  const cleared = state.fog?.cleared ?? 0;

  const workouts = (n: number) => update((s) => addFakeWorkouts(s, n, new Date(), skipStory));

  if (!open)
    return (
      <button
        aria-label="Developer mode"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-3 z-30 grid h-10 w-10 place-items-center rounded-full border border-dashed border-sky-400/60 bg-ink-900/90 text-sky-300"
      >
        <Wrench size={18} />
      </button>
    );

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-ink-950/70" onClick={() => setOpen(false)}>
      <div className="safe-bottom mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ink-900 p-4 ring-1 ring-sky-400/30" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-pixel text-[10px] text-sky-300">Developer mode</p>
          <button aria-label="Close" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-slate-300">
            <X size={16} />
          </button>
        </div>

        <section className="mt-4">
          <p className="text-xs text-slate-400">Workouts: {state.sessions.length} logged</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => workouts(1)} className={chip}>
              + 1 workout
            </button>
            <button onClick={() => workouts(5)} className={chip}>
              + 5 workouts
            </button>
            <button onClick={() => update((s) => ({ ...s, sessions: [], draft: null }))} className={chip}>
              Clear all
            </button>
          </div>
          <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={skipStory} onChange={(e) => setSkipStory(e.target.checked)} />
            Skip the story scenes they unlock
          </label>
        </section>

        <section className="mt-5">
          <p className="text-xs text-slate-400">Class</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CLASSES.map((c) => (
              <button
                key={c.id}
                onClick={() => update((s) => ({ ...s, profile: { ...s.profile, classId: c.id } }))}
                className={`rounded-lg py-2 text-xs ${state.profile.classId === c.id ? 'bg-sky-500/30 text-sky-100 ring-1 ring-sky-400' : 'bg-ink-700 text-slate-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-2">
          <p className="text-xs text-slate-400">Skill tree</p>
          {PATHS.map((path) => {
            const lv = state.progress[path.id];
            const set = (v: number) => update((s) => ({ ...s, progress: { ...s.progress, [path.id]: Math.max(0, Math.min(path.nodes.length, v)) } }));
            return (
              <div key={path.id} className="flex items-center gap-2">
                <span className="w-12 text-sm text-slate-300">{path.name}</span>
                <button aria-label={`Lower ${path.name}`} onClick={() => set(lv - 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-700">
                  <Minus size={14} />
                </button>
                <span className="min-w-0 flex-1 truncate text-center text-xs text-slate-200">{path.nodes[lv]?.name ?? 'All beaten'}</span>
                <button aria-label={`Raise ${path.name}`} onClick={() => set(lv + 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-700">
                  <Plus size={14} />
                </button>
              </div>
            );
          })}
        </section>

        <section className="mt-5">
          <p className="text-xs text-slate-400">
            The Fog: {cleared} of {ZONES.length} bosses beaten
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => update(clearNextZone)} disabled={cleared >= ZONES.length} className={`${chip} disabled:opacity-40`}>
              Beat the next boss
            </button>
            <button onClick={() => update(resetFog)} className={chip}>
              Reset the Fog
            </button>
          </div>
        </section>

        <section className="mt-5 border-t border-ink-700 pt-4">
          <button
            onClick={() => {
              if (!wipe) return setWipe(true);
              update(() => initialState());
              setWipe(false);
              setOpen(false);
            }}
            className="w-full rounded-lg bg-red-500/15 py-2.5 text-sm text-red-300"
          >
            {wipe ? 'Tap again to wipe this save' : 'Start over as a new player'}
          </button>
          {onTurnOff && (
            <button
              onClick={() => {
                setOpen(false);
                onTurnOff();
              }}
              className="mt-2 w-full py-2 text-xs text-slate-500"
            >
              Turn off developer mode
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
