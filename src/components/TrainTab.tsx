'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, ChevronRight } from 'lucide-react';
import { dayType, repsFor, type GameState } from '@/lib/game';
import { PLAN, ROLE_LABEL, type DayType, type Kit } from '@/lib/program';
import { useLand } from './useLand';
import { CoachPanel } from './CoachPanel';

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
  const land = useLand();
  const setKit = (k: Kit) => update((s) => ({ ...s, profile: { ...s.profile, kit: k } }));
  const intro = 'Every workout opens with a warm-up and ends with a stretch. Do every set with a couple of reps left in the tank, and the target goes up a rep at a time.';

  const libraryButton = (
    <button onClick={() => setLibrary(true)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-ink-700 active:bg-ink-700">
      <BookOpen size={18} className="shrink-0 text-gold-300" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">Exercise library</span>
        <span className="block text-xs text-slate-400">870+ exercises, how to do each, pixel demos</span>
      </span>
      <ChevronRight size={16} className="text-slate-500" />
    </button>
  );

  // Once the coach is set up it builds the workouts: its panel takes the place of the built-in plan.
  if (state.coach?.profile)
    return (
      <div className="space-y-4">
        <CoachPanel state={state} update={update} />
        {libraryButton}
        {library && <ExerciseLibrary state={state} onClose={() => setLibrary(false)} />}
      </div>
    );

  // Sideways, one screen: a side column (the library, gym or home) beside the plan, its
  // two days as two equal panels that fill the height.
  if (land)
    return (
      <div className="flex h-full gap-3">
        <div className="flex w-48 shrink-0 flex-col gap-3 min-[800px]:w-60">
          <button onClick={() => setLibrary(true)} className="flex w-full shrink-0 items-center gap-3 rounded-xl bg-ink-800 px-3 py-2.5 text-left ring-1 ring-ink-700 active:bg-ink-700">
            <BookOpen size={18} className="shrink-0 text-gold-300" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Exercise library</span>
              <span className="block text-xs text-slate-400">870+ exercises, how to do each, pixel demos</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-slate-500" />
          </button>
          <section className="rounded-xl bg-ink-800 p-3">
            <h2 className="font-pixel text-[10px] text-gold-300">I train at</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {KITS.map((k) => (
                <button
                  key={k.id}
                  aria-pressed={kit === k.id}
                  onClick={() => setKit(k.id)}
                  className={`flex flex-col justify-start rounded-lg p-2 text-left ${kit === k.id ? 'bg-ink-700 ring-1 ring-gold-400' : 'bg-ink-900'}`}
                >
                  <span className="block text-sm font-semibold">{k.label}</span>
                  <span className="block text-[10px] leading-tight text-slate-400">{k.note}</span>
                </button>
              ))}
            </div>
          </section>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CoachPanel state={state} update={update} />
          </div>
        </div>
        {library && <ExerciseLibrary state={state} onClose={() => setLibrary(false)} />}

        <section className="flex min-w-0 flex-1 flex-col rounded-2xl bg-ink-800 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-pixel text-xs text-gold-300">Your plan</h2>
            <p className="text-xs text-slate-400">Two days, one after the other</p>
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{intro}</p>
          <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-3">
            {(['A', 'B'] as DayType[]).map((day) => (
              <PlanDay key={day} state={state} kit={kit} day={day} next={day === next} land />
            ))}
          </div>
        </section>
      </div>
    );

  return (
    <div className="space-y-6">
      <CoachPanel state={state} update={update} />
      {libraryButton}
      {library && <ExerciseLibrary state={state} onClose={() => setLibrary(false)} />}

      <section>
        <h2 className="font-pixel text-xs text-gold-300">I train at</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {KITS.map((k) => (
            <button
              key={k.id}
              aria-pressed={kit === k.id}
              onClick={() => setKit(k.id)}
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
        <p className="mt-2 text-xs text-slate-400">{intro}</p>
        {(['A', 'B'] as DayType[]).map((day) => (
          <PlanDay key={day} state={state} kit={kit} day={day} next={day === next} />
        ))}
      </section>

    </div>
  );
}

/** One day of the plan with today's targets. Sideways it is a panel as tall as the plan allows. */
function PlanDay({ state, kit, day, next, land }: { state: GameState; kit: Kit; day: DayType; next: boolean; land?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${next ? 'bg-ink-700 ring-1 ring-sky-400/50' : land ? 'bg-ink-900' : 'bg-ink-800'} ${land ? 'flex min-h-0 flex-col' : 'mt-3'}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
        Day {day}
        {next && <span className="ml-2 font-normal normal-case tracking-normal text-sky-300">next</span>}
      </p>
      <ul className={land ? 'mt-1.5 min-h-0 flex-1 space-y-1 overflow-y-auto [@media(max-height:370px)]:space-y-0.5' : 'mt-2 space-y-1.5'}>
        {PLAN[kit][day].map((slot) => {
          const unit = slot.unit === 'sec' ? 's' : '';
          const target = repsFor(state, slot);
          return (
            <li key={slot.id} className={`flex items-baseline justify-between gap-2 ${land ? 'text-[13px] leading-tight' : 'text-sm'}`}>
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
  );
}
