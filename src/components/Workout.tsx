'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Undo2, X } from 'lucide-react';
import { REST_SECONDS, todaysQuest, type GameState, type Rir } from '@/lib/game';
import { rewardFor } from '@/lib/gear';
import { getPath } from '@/lib/skills';
import { answer, strike, undoBlow, type Grade } from '@/lib/fight';
import { music } from '@/lib/music';
import { FightStrip, FoeTurn } from './WorkoutFight';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onClose: () => void;
  onFinish: () => void;
}

const RIR_BUTTONS: { rir: Rir; label: string; hint: string }[] = [
  { rir: '4+', label: '4+', hint: 'Easy' },
  { rir: '2-3', label: '2-3', hint: 'Just right' },
  { rir: '0-1', label: '0-1', hint: 'Very hard' },
];

/**
 * Full-screen set logger: one exercise at a time, one tap per set, rest timer between sets. The
 * workout is also a fight (src/lib/fight.ts): each set hits the foe, and each rest opens with its answer.
 */
export function Workout({ state, update, onClose, onFinish }: Props) {
  const quest = todaysQuest(state);
  const sets = state.draft?.sets ?? {};
  const firstOpen = quest.findIndex((q) => (sets[q.id]?.length ?? 0) < q.sets);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [turnOver, setTurnOver] = useState(true);
  const q = quest[Math.min(index, quest.length - 1)];
  const logged = sets[q.id] ?? [];
  const [reps, setReps] = useState(q.reps);
  const totalLogged = quest.reduce((a, e) => a + Math.min(sets[e.id]?.length ?? 0, e.sets), 0);
  const allDone = quest.every((e) => (sets[e.id]?.length ?? 0) >= e.sets);
  const exerciseDone = logged.length >= q.sets;
  const path = getPath(q.path);
  const unit = q.unit === 'sec' ? 's' : '';
  const reward = q.canUnlock ? rewardFor(state.profile.classId, state.progress, q.path, state.progress[q.path]) : null;
  const fight = state.draft?.fight;

  const onAnswer = useCallback(
    (grades: Grade[]) => update((s) => (s.draft?.fight ? { ...s, draft: { ...s.draft, fight: answer(s, s.draft.fight, grades) } } : s)),
    [update],
  );
  const onSettled = useCallback(() => setTurnOver(true), []);
  const endRest = useCallback(() => setRestUntil(null), []);

  useEffect(() => {
    setReps(q.reps);
  }, [q.id, q.reps]);

  const log = (rir: Rir) => {
    update((s) => {
      const draft = s.draft ?? { startedAt: new Date().toISOString(), checkin: 'normal' as const, sets: {} };
      const list = [...(draft.sets[q.id] ?? []), { reps, rir }];
      const fight = draft.fight && strike(s, draft.fight, q, reps);
      return { ...s, draft: { ...draft, sets: { ...draft.sets, [q.id]: list }, fight } };
    });
    navigator.vibrate?.(30);
    const finishedExercise = logged.length + 1 >= q.sets;
    const lastOfAll = finishedExercise && quest.every((e) => e.id === q.id || (sets[e.id]?.length ?? 0) >= e.sets);
    if (lastOfAll && fight) music.sting('victory');
    if (!lastOfAll) {
      setTurnOver(!fight);
      setRestUntil(Date.now() + REST_SECONDS * 1000);
    }
    if (finishedExercise && !lastOfAll) {
      const next = quest.findIndex((e, i) => i !== index && (sets[e.id]?.length ?? 0) < e.sets);
      if (next !== -1) setIndex(next);
    }
  };

  const undo = () =>
    update((s) => {
      if (!s.draft) return s;
      const list = (s.draft.sets[q.id] ?? []).slice(0, -1);
      const fight = s.draft.fight && undoBlow(s.draft.fight, q.id);
      return { ...s, draft: { ...s.draft, sets: { ...s.draft.sets, [q.id]: list }, fight } };
    });

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950">
      <header className="safe-top flex items-center justify-between px-4 pb-2">
        <button onClick={onClose} aria-label="Back to Today" className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800">
          <X size={18} />
        </button>
        <div className="flex gap-1.5">
          {quest.map((e, i) => (
            <button
              key={e.id}
              onClick={() => setIndex(i)}
              aria-label={e.name}
              className={`h-2.5 w-8 rounded-sm ${i === index ? 'bg-gold-400' : (sets[e.id]?.length ?? 0) >= e.sets ? 'bg-emerald-500' : 'bg-ink-600'}`}
            />
          ))}
        </div>
        <span className="w-10 text-right font-mono text-xs text-slate-500">
          {index + 1}/{quest.length}
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pb-4">
        {fight && <FightStrip state={state} fight={fight} quest={quest} finished={allDone} />}

        <div className="mt-2 flex items-center justify-between">
          <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="p-2 text-slate-400 disabled:opacity-20" aria-label="Previous exercise">
            <ChevronLeft />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: path.color }}>
              {path.name} · {q.role}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-50">{q.name}</h2>
          </div>
          <button
            onClick={() => setIndex(Math.min(quest.length - 1, index + 1))}
            disabled={index === quest.length - 1}
            className="p-2 text-slate-400 disabled:opacity-20"
            aria-label="Next exercise"
          >
            <ChevronRight />
          </button>
        </div>
        <p className="mt-1 text-center text-sm text-slate-400">{q.cue}</p>

        <div className="mt-5 flex justify-center gap-2">
          {Array.from({ length: q.sets }).map((_, i) => (
            <div
              key={i}
              className={`grid h-12 w-12 place-items-center rounded-lg font-mono text-sm font-bold ${
                i < logged.length ? 'bg-gold-400 text-ink-950' : i === logged.length ? 'bg-ink-700 text-slate-100 ring-2 ring-gold-400' : 'bg-ink-800 text-slate-500'
              }`}
            >
              {i < logged.length ? logged[i].reps : i + 1}
            </div>
          ))}
        </div>

        {allDone && fight ? (
          <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-pixel text-xs text-gold-300">Your last set was the finishing blow</p>
            <p className="mt-2 text-sm text-slate-400">Complete the quest to claim the stop.</p>
          </div>
        ) : exerciseDone ? (
          <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center">
            <p className="font-pixel text-xs text-emerald-400">{q.name} done</p>
            <p className="mt-2 text-sm text-slate-400">{logged.reduce((a, s) => a + s.reps, 0)}{unit ? ' seconds' : ' reps'} total. Clean work.</p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-center font-pixel text-[10px] text-slate-400">
              Set {logged.length + 1} of {q.sets}
            </p>
            <div className="mt-3 flex items-center justify-center gap-5">
              <button onClick={() => setReps(Math.max(1, reps - (unit ? 2 : 1)))} aria-label="Fewer" className="grid h-14 w-14 place-items-center rounded-xl bg-ink-800 active:scale-95">
                <Minus />
              </button>
              <p className="w-28 text-center">
                <span className="font-mono text-6xl font-bold text-slate-50">{reps}</span>
                <span className="ml-1 text-lg text-slate-400">{unit}</span>
              </p>
              <button onClick={() => setReps(reps + (unit ? 2 : 1))} aria-label="More" className="grid h-14 w-14 place-items-center rounded-xl bg-ink-800 active:scale-95">
                <Plus />
              </button>
            </div>
            <p className="mt-1 text-center text-xs text-slate-500">Target {q.reps}{unit}. Stop with two in the tank.</p>

            <p className="mt-6 text-center text-sm font-semibold text-slate-200">Done? How many {unit ? 'seconds' : 'reps'} were left in the tank?</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {RIR_BUTTONS.map((b) => (
                <button
                  key={b.rir}
                  onClick={() => log(b.rir)}
                  className={`rounded-xl py-4 transition active:scale-95 ${b.rir === '2-3' ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-100'}`}
                >
                  <span className="block font-mono text-xl font-bold">{b.label}</span>
                  <span className="block text-[11px] opacity-80">{b.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {reward && (
          <p className="mt-6 text-center text-xs text-slate-400">
            Beat it at {q.node.unlockSets}×{q.node.unlockReps}
            {unit} to forge <span style={{ color: reward.color }}>{reward.name}</span>
          </p>
        )}

        {logged.length > 0 && (
          <button onClick={undo} className="mx-auto mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <Undo2 size={14} /> Undo last set
          </button>
        )}
      </main>

      <footer className="safe-bottom mx-auto w-full max-w-md px-4 pt-2">
        {allDone ? (
          <button onClick={onFinish} className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
            Complete quest
          </button>
        ) : (
          <button onClick={onFinish} disabled={totalLogged === 0} className="w-full py-3 text-sm text-slate-400 disabled:opacity-30">
            {totalLogged === 0 ? 'Log a set to begin' : 'End here (what you did still counts)'}
          </button>
        )}
      </footer>

      {restUntil && (
        <Rest until={restUntil} next={exerciseDone ? null : `Set ${logged.length + 1} of ${q.name}`} locked={!turnOver} onDone={endRest}>
          {fight && fight.blows.length > 0 && <FoeTurn state={state} fight={fight} onAnswer={onAnswer} onSettled={onSettled} />}
        </Rest>
      )}
    </div>
  );
}

interface RestProps {
  until: number;
  next: string | null;
  /** The foe's turn is still playing: the rest can't end or be skipped yet. */
  locked: boolean;
  onDone: () => void;
  children?: ReactNode;
}

function Rest({ until, next, locked, onDone, children }: RestProps) {
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, Math.ceil((until - now) / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (left === 0 && !locked) {
      navigator.vibrate?.([80, 60, 80]);
      onDone();
    }
  }, [left, locked, onDone]);

  const pct = 1 - left / REST_SECONDS;
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center ${children ? 'bg-ink-950' : 'bg-ink-950/95'}`}>
      {children}
      <p className={`font-pixel text-[10px] text-slate-400 ${children ? 'mt-4' : ''}`}>Rest</p>
      <p className={`mt-3 font-mono font-bold text-slate-50 ${children ? 'text-5xl' : 'text-7xl'}`}>
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </p>
      <div className="mt-4 h-3 w-56 overflow-hidden rounded-sm bg-ink-700">
        <div className="h-full bg-gold-400 transition-all" style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="mt-4 text-sm text-slate-400">{next ? `Next: ${next}` : 'Next exercise is ready.'}</p>
      <p className="mt-1 text-xs text-slate-500">Breathe. Shake out your arms.</p>
      <button onClick={onDone} disabled={locked} className="mt-6 rounded-xl bg-ink-800 px-6 py-3 text-sm font-semibold text-slate-200 disabled:opacity-30">
        Skip rest
      </button>
    </div>
  );
}
