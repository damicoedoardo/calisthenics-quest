'use client';

import { Check, Flame, Minus, Plus, Swords } from 'lucide-react';
import { WEEKLY_GOAL, sessionsThisWeek, streakMultiplier, todaysQuest, weekStreak, type GameState, type QuestExercise } from '@/lib/game';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onFinish: () => void;
}

export function QuestTab({ state, update, onFinish }: Props) {
  const now = new Date();
  const quest = todaysQuest(state);
  const done = state.draft?.done ?? {};
  const week = sessionsThisWeek(state, now);
  const streak = weekStreak(state, now);
  const setsDone = quest.reduce((a, q) => a + Math.min(done[q.id] ?? 0, q.sets), 0);
  const setsTotal = quest.reduce((a, q) => a + q.sets, 0);
  const isFull = setsDone * 2 >= setsTotal;

  const tapSet = (q: QuestExercise, index: number) =>
    update((s) => {
      const draft = s.draft ?? { startedAt: new Date().toISOString(), done: {} };
      const current = draft.done[q.id] ?? 0;
      // Tapping the last done pip undoes it; any other pip fills up to it.
      const next = index + 1 === current ? index : index + 1;
      return { ...s, draft: { ...draft, done: { ...draft.done, [q.id]: next } } };
    });

  const changeReps = (q: QuestExercise, delta: number) =>
    update((s) => {
      const step = q.unit === 'sec' ? 2 : 1;
      const value = Math.max(1, q.reps + delta * step);
      return { ...s, reps: { ...s.reps, [q.id]: value } };
    });

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-ink-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Weekly quest</p>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: WEEKLY_GOAL }).map((_, i) => (
              <div key={i} className={`h-3 flex-1 rounded-sm ${i < week ? 'bg-gold-400' : 'bg-ink-600'}`} />
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {week >= WEEKLY_GOAL ? 'Week won! 🏆' : `${week} / ${WEEKLY_GOAL} sessions`}
          </p>
        </div>
        <div className="rounded-2xl bg-ink-800 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-400">Streak</p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold">
            <Flame className={streak > 0 ? 'text-orange-400' : 'text-slate-600'} size={22} />
            {streak} {streak === 1 ? 'week' : 'weeks'}
          </p>
          <p className="text-sm text-slate-400">XP ×{streakMultiplier(streak).toFixed(1)}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-pixel text-xs text-gold-300">Today&apos;s quest</h2>
          <p className="text-xs text-slate-400">Stop every set with 2-3 reps left</p>
        </div>
        {quest.map((q) => {
          const n = Math.min(done[q.id] ?? 0, q.sets);
          const complete = n >= q.sets;
          const node = q.node;
          return (
            <article key={q.id} className={`rounded-2xl p-4 transition ${complete ? 'bg-emerald-950/60 ring-1 ring-emerald-500/40' : 'bg-ink-800'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-slate-400">{q.path ? `${q.path} path` : 'Bonus · legs'}</p>
                  <h3 className="text-lg font-semibold leading-tight">{q.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-400">{q.cue}</p>
                </div>
                {complete && <Check className="mt-1 shrink-0 text-emerald-400" />}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button aria-label="Fewer" onClick={() => changeReps(q, -1)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-700 active:scale-95">
                    <Minus size={16} />
                  </button>
                  <p className="min-w-[88px] text-center">
                    <span className="text-xl font-bold">{q.sets}×{q.reps}</span>
                    <span className="ml-1 text-sm text-slate-400">{q.unit === 'sec' ? 's' : ''}</span>
                  </p>
                  <button aria-label="More" onClick={() => changeReps(q, 1)} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-700 active:scale-95">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {Array.from({ length: q.sets }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => tapSet(q, i)}
                    aria-label={`Set ${i + 1}`}
                    className={`h-11 flex-1 rounded-xl text-sm font-semibold transition active:scale-95 ${
                      i < n ? 'bg-gold-400 text-ink-950' : 'bg-ink-700 text-slate-400'
                    }`}
                  >
                    {i < n ? <Check size={18} className="mx-auto" /> : i + 1}
                  </button>
                ))}
              </div>

              {node && (
                <p className="mt-3 text-xs text-slate-400">
                  🔓 Unlock <span className="text-gold-300">{node.reward.name}</span> at {node.unlockSets}×{node.unlockReps}
                  {node.unit === 'sec' ? 's' : ''}
                  <span className="ml-1 text-slate-500">
                    ({Math.min(q.reps, node.unlockReps)}/{node.unlockReps})
                  </span>
                </p>
              )}
            </article>
          );
        })}
      </section>

      <button
        onClick={onFinish}
        disabled={setsDone === 0}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-lg shadow-gold-500/20 transition active:scale-[.98] disabled:bg-ink-700 disabled:text-slate-500 disabled:shadow-none"
      >
        <Swords size={18} />
        {setsDone === 0 ? 'Tap a set to begin' : isFull ? 'Complete quest' : 'Claim mini quest'}
      </button>
      <p className="pb-2 text-center text-xs text-slate-500">
        Bad day? One exercise still counts as a mini quest and keeps your week alive.
      </p>
    </div>
  );
}
