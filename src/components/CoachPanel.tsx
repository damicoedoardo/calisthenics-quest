'use client';

import { useState } from 'react';
import { RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { ROLE_COLOR, ROLE_LABEL } from '@/lib/program';
import { minutesOf } from '@/lib/coach/validate';
import { liveNotes, removeNote } from '@/lib/coach/notes';
import { PATTERNS, type Mode, type PlanItem } from '@/lib/coach/types';
import { CoachSetup } from './CoachSetup';
import { useRebuild } from './useCoach';

/* The coach on the Train tab: set it up, see your next workout and build another, and read what the
   coach knows about you (profile, levels, notes), each note deletable. */

type Update = (fn: (s: GameState) => GameState) => void;

const MODE_LABEL: Record<Mode, string> = { gym: 'Gym', calisthenics: 'Calisthenics', running: 'Running' };
const GOAL_LABEL = { health: 'feel good', strength: 'get stronger', muscle: 'build muscle', endurance: 'go longer', skill: 'learn a skill' } as const;

/** One item's dose: 3×8-12, 60s, a 20 min run. */
export function doseOf(it: Pick<PlanItem, 'sets' | 'low' | 'high' | 'unit' | 'run' | 'role'>, target?: number): string {
  if (it.run) return `${Math.round(it.low / 60)} min`;
  const unit = it.unit === 'sec' ? 's' : '';
  if (it.role === 'warmup' || it.role === 'stretch') return `${it.low}${unit}`;
  const reps = target !== undefined ? `${target}` : it.low === it.high ? `${it.low}` : `${it.low}-${it.high}`;
  return `${it.sets}×${reps}${unit}`;
}

export function CoachPanel({ state, update }: { state: GameState; update: Update }) {
  const [setup, setSetup] = useState(false);
  const rebuild = useRebuild(update);
  const coach = state.coach;
  const profile = coach?.profile;
  const plan = coach?.plan;
  const inProgress = !!state.draft && Object.values(state.draft.sets).some((s) => s.length > 0);
  const notes = liveNotes(coach, new Date());

  if (!profile)
    return (
      <>
        <button onClick={() => setSetup(true)} className="flex w-full items-center gap-3 rounded-2xl bg-ink-800 p-4 text-left ring-1 ring-gold-400/60 active:scale-[.98]">
          <Sparkles size={22} className="shrink-0 text-gold-300" />
          <span className="min-w-0 flex-1">
            <span className="block font-pixel text-[10px] text-gold-300">New: your coach</span>
            <span className="mt-1 block text-sm text-slate-200">Tell it what you train and where you start. It builds every workout for you: gym, calisthenics, running, or a mix.</span>
            <span className="mt-1 block text-xs text-slate-400">8 quick taps, about 2 minutes.</span>
          </span>
        </button>
        {setup && <CoachSetup state={state} update={update} onClose={() => setSetup(false)} />}
      </>
    );

  return (
    <div className="space-y-4 land:grid land:grid-cols-2 land:items-start land:gap-3 land:space-y-0">
      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-pixel text-xs text-gold-300">Next workout</h2>
          {plan && <span className="text-xs text-slate-400">about {minutesOf(plan.items)} min</span>}
        </div>
        {plan ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-100">{plan.title}</p>
            <ul className="mt-2 space-y-1.5">
              {plan.items.map((it) => (
                <li key={it.id} className={`flex items-baseline justify-between gap-2 text-sm ${it.skipped ? 'text-slate-500 line-through' : ''}`}>
                  <span className="min-w-0">
                    {it.name}
                    {it.role !== 'main' && (
                      <span className="ml-1.5 text-[11px]" style={{ color: ROLE_COLOR[it.role] }}>
                        {ROLE_LABEL[it.role]}
                      </span>
                    )}
                    {it.changed && <span className="ml-1.5 text-[11px] text-sky-300">{it.changed.how === 'easier' ? 'easier' : 'swapped'}</span>}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-300">{doseOf(it, state.reps[it.id])}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Too hard, or the machine is taken? In the workout every exercise has an easier one and a swap.</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-400">Building your workout…</p>
        )}
        {!inProgress && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => rebuild()} className="flex items-center gap-1.5 rounded-lg bg-ink-700 px-3 py-2 text-xs font-semibold text-slate-100 active:scale-95">
              <RefreshCw size={13} /> Another one
            </button>
            {profile.modes.length > 1 &&
              profile.modes
                .filter((m) => m !== plan?.mode)
                .map((m) => (
                  <button key={m} onClick={() => rebuild(m)} className="rounded-lg bg-ink-700 px-3 py-2 text-xs font-semibold text-slate-100 active:scale-95">
                    {MODE_LABEL[m]} instead
                  </button>
                ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-pixel text-xs text-gold-300">What your coach knows</h2>
          <button onClick={() => setSetup(true)} className="text-xs font-semibold text-sky-300">
            Redo setup
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-200">
          {profile.modes.map((m) => MODE_LABEL[m]).join(' + ')}, to {GOAL_LABEL[profile.goal]}. {profile.days} a week, {profile.minutes} min.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PATTERNS.map((p) => (
            <span key={p} className="rounded-md bg-ink-900 px-2 py-1 text-[11px] text-slate-300" title={profile.levels[p].source === 'setup' ? 'From setup' : 'From your workouts'}>
              {p} <span className="font-mono text-gold-300">{profile.levels[p].level}</span>
              {profile.levels[p].source === 'log' && <span className="text-emerald-300"> ✓</span>}
            </span>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Levels 1 to 5. A ✓ means your workouts set it; it moves when sets feel easy or very hard.</p>
        {profile.avoid.length > 0 && <p className="mt-2 text-xs text-slate-300">Sparing: {profile.avoid.map((a) => a.text ?? a.area).join(', ')}</p>}
        {notes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start gap-2 rounded-lg bg-ink-900 px-2.5 py-2 text-xs text-slate-300">
                <span className="min-w-0 flex-1">
                  <span className="text-slate-500">{n.type}: </span>
                  {n.text}
                </span>
                <button aria-label="Forget this" onClick={() => update((s) => (s.coach ? { ...s, coach: removeNote(s.coach, n.id) } : s))} className="shrink-0 text-slate-500 active:text-red-300">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {setup && <CoachSetup state={state} update={update} onClose={() => setSetup(false)} />}
    </div>
  );
}
