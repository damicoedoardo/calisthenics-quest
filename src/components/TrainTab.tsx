'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, ChevronRight } from 'lucide-react';
import { dayType, repsFor, type GameState } from '@/lib/game';
import { PLAN, ROLE_LABEL, type DayType, type Kit } from '@/lib/program';
import { EMBERS, embersOf } from '@/lib/forge';

// The library carries the whole exercise catalog, so it loads only when opened.
const ExerciseLibrary = dynamic(() => import('./ExerciseLibrary').then((m) => m.ExerciseLibrary), { ssr: false });

const KITS: { id: Kit; label: string; note: string }[] = [
  { id: 'gym', label: 'Gym', note: 'Barbell, dumbbells, cables' },
  { id: 'home', label: 'Home', note: 'No kit: a chair and a table' },
];

/** Training: the exercise library, what you train with, and the plan your workouts follow. */
export function TrainTab({ state, update }: { state: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const [library, setLibrary] = useState(false);
  const kit = state.profile.kit ?? 'gym';
  const next = dayType(state);
  return (
    <div className="space-y-6">
      <button onClick={() => setLibrary(true)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-ink-700 active:bg-ink-700">
        <BookOpen size={18} className="shrink-0 text-gold-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Exercise library</span>
          <span className="block text-xs text-slate-400">870+ exercises, how to do each, pixel demos</span>
        </span>
        <ChevronRight size={16} className="text-slate-500" />
      </button>
      {library && <ExerciseLibrary state={state} onClose={() => setLibrary(false)} />}

      <section>
        <h2 className="font-pixel text-xs text-gold-300">I train at</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {KITS.map((k) => (
            <button
              key={k.id}
              aria-pressed={kit === k.id}
              onClick={() => update((s) => ({ ...s, profile: { ...s.profile, kit: k.id } }))}
              className={`rounded-xl p-3 text-left ${kit === k.id ? 'bg-ink-700 ring-1 ring-gold-400' : 'bg-ink-800'}`}
            >
              <span className="block text-sm font-semibold">{k.label}</span>
              <span className="block text-[11px] text-slate-400">{k.note}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="font-pixel text-xs text-gold-300">Your plan</h2>
          <p className="text-xs text-slate-400">Two days, one after the other</p>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Every workout opens with a warm-up and ends with a stretch. Do every set with a couple of reps left in the tank, and the target goes up a rep at a time.
        </p>
        {(['A', 'B'] as DayType[]).map((day) => (
          <div key={day} className={`mt-3 rounded-xl p-3 ${day === next ? 'bg-ink-700 ring-1 ring-sky-400/50' : 'bg-ink-800'}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Day {day}
              {day === next && <span className="ml-2 font-normal normal-case tracking-normal text-sky-300">next</span>}
            </p>
            <ul className="mt-2 space-y-1.5">
              {PLAN[kit][day].map((slot) => {
                const unit = slot.unit === 'sec' ? 's' : '';
                const target = repsFor(state, slot);
                return (
                  <li key={slot.id} className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      {slot.name}
                      {slot.role !== 'main' && <span className="ml-1.5 text-[11px] text-slate-500">{ROLE_LABEL[slot.role]}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-300">
                      {slot.sets > 1 ? `${slot.sets}×` : ''}
                      {target}
                      {unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <p className="rounded-xl bg-ink-900 px-3 py-2 text-xs text-slate-400">
        Each workout earns <span className="text-slate-200">{EMBERS.full} embers</span> ({EMBERS.mini} for the minimum quest) for Mira&apos;s forge on the Play tab. You have <span className="text-gold-300">{embersOf(state)}</span>.
      </p>

      <p className="text-center text-xs text-slate-500">Soon: tell your coach what you feel like, and it builds the workout from the library.</p>
    </div>
  );
}
