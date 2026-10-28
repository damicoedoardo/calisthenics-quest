'use client';

import { Trash2 } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { liveNotes, removeNote } from '@/lib/coach/notes';
import { PATTERNS, type Mode, type PlanItem } from '@/lib/coach/types';

/* Pieces of the coach screen (CoachChat.tsx): a workout item's dose, and what the coach knows about
   you (profile, levels, notes), each note deletable. */

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

/** What the coach knows: profile, levels, and its notes, each one deletable. To change the
    profile, tell the coach in the chat. */
export function CoachKnows({ state, update }: { state: GameState; update: Update }) {
  const coach = state.coach;
  const profile = coach?.profile;
  const notes = liveNotes(coach, new Date());
  if (!profile) return null;
  return (
    <>
      <div className="rounded-xl bg-ink-900 p-3">
        <h2 className="font-pixel text-[10px] text-gold-300">What I know about you</h2>
        <p className="mt-2 text-sm text-slate-200">
          {profile.modes.map((m) => MODE_LABEL[m]).join(' + ')}, to {GOAL_LABEL[profile.goal]}. {profile.days} a week, {profile.minutes} min.
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PATTERNS.map((p) => (
            <span key={p} className="rounded-md bg-ink-800 px-2 py-1 text-[11px] text-slate-300" title={profile.levels[p].source === 'setup' ? 'From setup' : 'From your workouts'}>
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
              <li key={n.id} className="flex items-start gap-2 rounded-lg bg-ink-800 px-2.5 py-2 text-xs text-slate-300">
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
      </div>
    </>
  );
}
