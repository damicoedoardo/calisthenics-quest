'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Undo2, X } from 'lucide-react';
import { REST_SECONDS, gearOf, isTap, todaysQuest, type GameState, type Rir } from '@/lib/game';
import { ROLE_COLOR, ROLE_LABEL } from '@/lib/program';
import { EXERCISES, type ExerciseId } from '@/sprites/characters/exercise';
import { useLook } from './Look';
import { Ember } from './Characters';
import { flameStage } from '@/story/flame';
import { Sprite } from './Sprite';

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

/** Full-screen set logger: one exercise at a time, one tap per set, rest timer between sets. */
export function Workout({ state, update, onClose, onFinish }: Props) {
  const quest = todaysQuest(state);
  const sets = state.draft?.sets ?? {};
  const firstOpen = quest.findIndex((q) => (sets[q.id]?.length ?? 0) < q.sets);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  // Exercises in the order their sets were logged on this screen, so Undo can reach back after the
  // logger has moved on to the next exercise.
  const [history, setHistory] = useState<string[]>([]);
  const q = quest[Math.min(index, quest.length - 1)];
  const logged = sets[q.id] ?? [];
  const [reps, setReps] = useState(q.reps);
  // The warm-up alone isn't a workout yet: it counts once a real set is logged.
  const totalLogged = quest.filter((e) => !isTap(e)).reduce((a, e) => a + Math.min(sets[e.id]?.length ?? 0, e.sets), 0);
  const allDone = quest.every((e) => (sets[e.id]?.length ?? 0) >= e.sets);
  const exerciseDone = logged.length >= q.sets;
  const unit = q.unit === 'sec' ? 's' : '';
  const tap = isTap(q);

  useEffect(() => {
    setReps(q.reps);
  }, [q.id, q.reps]);

  const log = (rir: Rir) => {
    update((s) => {
      const draft = s.draft ?? { startedAt: new Date().toISOString(), checkin: 'normal' as const, sets: {} };
      const list = [...(draft.sets[q.id] ?? []), { reps, rir }];
      return { ...s, draft: { ...draft, sets: { ...draft.sets, [q.id]: list } } };
    });
    setHistory((h) => [...h, q.id]);
    navigator.vibrate?.(30);
    const finishedExercise = logged.length + 1 >= q.sets;
    const lastOfAll = finishedExercise && quest.every((e) => e.id === q.id || (sets[e.id]?.length ?? 0) >= e.sets);
    if (!lastOfAll && !tap) setRestUntil(Date.now() + REST_SECONDS * 1000);
    if (finishedExercise && !lastOfAll) {
      const next = quest.findIndex((e, i) => i !== index && (sets[e.id]?.length ?? 0) < e.sets);
      if (next !== -1) setIndex(next);
    }
  };

  // The last set logged here, else the last one of the exercise on screen.
  const undoId = [...history].reverse().find((id) => (sets[id]?.length ?? 0) > 0) ?? (logged.length > 0 ? q.id : null);
  const undoExercise = quest.find((e) => e.id === undoId);

  const undo = () => {
    if (!undoId) return;
    update((s) => {
      if (!s.draft) return s;
      const list = (s.draft.sets[undoId] ?? []).slice(0, -1);
      return { ...s, draft: { ...s.draft, sets: { ...s.draft.sets, [undoId]: list } } };
    });
    const at = history.lastIndexOf(undoId);
    if (at !== -1) setHistory((h) => h.filter((_, i) => i !== at));
    const i = quest.findIndex((e) => e.id === undoId);
    if (i !== -1) setIndex(i);
    setRestUntil(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950">
      <header className="safe-top land-safe-x flex items-center justify-between px-4 pb-2 [@media(orientation:landscape)_and_(max-height:600px)]:pb-1">
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

      {/* Held sideways: the exercise on the left, its log on the right. */}
      <main className="land-safe-x mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-4 pb-4 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:items-center [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-8 [@media(orientation:landscape)_and_(max-height:600px)]:pb-1">
        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col">
        <div className="mt-2 flex items-center justify-between [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">
          <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="p-2 text-slate-400 disabled:opacity-20" aria-label="Previous exercise">
            <ChevronLeft />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[q.role] }}>
              {ROLE_LABEL[q.role]}
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

        <Demo state={state} exercise={q.id} name={q.name} cue={q.cue} />
        </div>

        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:justify-center">
        <div className={`mt-5 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0 flex justify-center gap-2 ${tap ? 'hidden' : ''}`}>
          {Array.from({ length: q.sets }).map((_, i) => (
            <div
              key={i}
              className={`pixel-notch grid h-12 w-12 [@media(orientation:landscape)_and_(max-height:600px)]:h-10 [@media(orientation:landscape)_and_(max-height:600px)]:w-10 place-items-center font-mono text-sm font-bold ${
                i < logged.length
                  ? 'bg-gold-400 text-ink-950 shadow-[inset_0_-4px_0_#b45309,inset_0_3px_0_#fde68a]'
                  : i === logged.length
                    ? 'bg-ink-700 text-slate-100 shadow-[inset_0_0_0_3px_#fbbf24]'
                    : 'bg-ink-800 text-slate-500 shadow-[inset_0_-4px_0_#0b0d14]'
              }`}
            >
              {i < logged.length ? logged[i].reps : i + 1}
            </div>
          ))}
        </div>

        {exerciseDone ? (
          <div className="mt-8 flex flex-1 flex-col items-center justify-center text-center [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 [@media(orientation:landscape)_and_(max-height:600px)]:flex-none">
            <p className="font-pixel text-xs text-emerald-400">{q.name} done</p>
            <p className="mt-2 text-sm text-slate-400">
              {tap ? (q.role === 'warmup' ? 'Warm and ready.' : 'Good. Your body thanks you.') : `${logged.reduce((a, s) => a + s.reps, 0)}${unit ? ' seconds' : ' reps'} total. Clean work.`}
            </p>
          </div>
        ) : tap ? (
          <div className="mt-6 text-center [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">
            <p className="font-mono text-5xl font-bold text-slate-50">
              {q.reps >= 60 ? `${Math.floor(q.reps / 60)}:${String(q.reps % 60).padStart(2, '0')}` : `${q.reps}s`}
            </p>
            <p className="mt-2 text-sm text-slate-400">{q.role === 'warmup' ? 'Easy and slow: get everything moving before the work.' : 'Breathe out and let it go a little further. Never into pain.'}</p>
            <button
              onClick={() => log('4+')}
              className="mt-6 w-full rounded-2xl bg-gold-400 py-4 font-pixel [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-center font-pixel text-[10px] text-slate-400 [@media(orientation:landscape)_and_(max-height:600px)]:mt-3">
              Set {logged.length + 1} of {q.sets}
            </p>
            <div className="mt-3 flex items-center justify-center gap-5 [@media(orientation:landscape)_and_(max-height:600px)]:mt-1">
              <button onClick={() => setReps(Math.max(1, reps - (unit ? 2 : 1)))} aria-label="Fewer" className="grid h-14 w-14 place-items-center rounded-xl bg-ink-800 active:scale-95 [@media(orientation:landscape)_and_(max-height:600px)]:h-12 [@media(orientation:landscape)_and_(max-height:600px)]:w-12">
                <Minus />
              </button>
              <p className="w-28 text-center">
                <span className="font-mono text-6xl font-bold text-slate-50 [@media(orientation:landscape)_and_(max-height:600px)]:text-5xl">{reps}</span>
                <span className="ml-1 text-lg text-slate-400">{unit}</span>
              </p>
              <button onClick={() => setReps(reps + (unit ? 2 : 1))} aria-label="More" className="grid h-14 w-14 place-items-center rounded-xl bg-ink-800 active:scale-95 [@media(orientation:landscape)_and_(max-height:600px)]:h-12 [@media(orientation:landscape)_and_(max-height:600px)]:w-12">
                <Plus />
              </button>
            </div>
            <p className="mt-1 text-center text-xs text-slate-500">
              Target {q.reps}
              {unit}. Stop with two in the tank.{q.slot.weighted ? ' Pick a weight you could lift about two more times.' : ''}
            </p>

            <p className="mt-6 text-center text-sm font-semibold text-slate-200 [@media(orientation:landscape)_and_(max-height:600px)]:mt-3">Done? How many {unit ? 'seconds' : 'reps'} were left in the tank?</p>
            <div className="mt-3 grid grid-cols-3 gap-2 [@media(orientation:landscape)_and_(max-height:600px)]:mt-2">
              {RIR_BUTTONS.map((b) => (
                <button
                  key={b.rir}
                  onClick={() => log(b.rir)}
                  className={`rounded-xl py-4 transition [@media(orientation:landscape)_and_(max-height:600px)]:py-2.5 active:scale-95 ${b.rir === '2-3' ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-100'}`}
                >
                  <span className="block font-mono text-xl font-bold">{b.label}</span>
                  <span className="block text-[11px] opacity-80">{b.hint}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {undoExercise && (
          <button onClick={undo} className="mx-auto mt-4 flex items-center gap-1.5 text-xs text-slate-500 [@media(orientation:landscape)_and_(max-height:600px)]:mt-2 [@media(orientation:landscape)_and_(max-height:600px)]:py-1">
            <Undo2 size={14} /> Undo last set{undoExercise.id !== q.id ? ` of ${undoExercise.name}` : ''}
          </button>
        )}
        </div>
      </main>

      <footer className="safe-bottom land-safe-x mx-auto w-full max-w-md px-4 pt-2 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:pt-1">
        {allDone ? (
          <button onClick={onFinish} className="w-full rounded-2xl bg-gold-400 py-4 [@media(orientation:landscape)_and_(max-height:600px)]:py-3 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
            Complete quest
          </button>
        ) : (
          <button onClick={onFinish} disabled={totalLogged === 0} className="w-full py-3 [@media(orientation:landscape)_and_(max-height:600px)]:py-2 text-sm text-slate-400 disabled:opacity-30">
            {totalLogged === 0 ? 'Log a set to begin' : 'End here (what you did still counts)'}
          </button>
        )}
      </footer>

      {restUntil && <Rest stage={flameStage(state.sessions.length).id} until={restUntil} next={exerciseDone ? null : `Set ${logged.length + 1} of ${q.name}`} onDone={() => setRestUntil(null)} />}
    </div>
  );
}

/** You doing the exercise, looping one rep: small above the sets, tap for a big one. */
function Demo({ state, exercise, name, cue }: { state: GameState; exercise: string; name: string; cue: string }) {
  const [big, setBig] = useState(false);
  const look = useLook();
  if (!(EXERCISES as string[]).includes(exercise)) return null;
  const opts = { exercise: exercise as ExerciseId, gear: gearOf(state), classId: state.profile.classId, look };
  return (
    <>
      <button onClick={() => setBig(true)} aria-label={`Show how to do ${name}`} className="mx-auto mt-3 block rounded-xl bg-ink-900 p-1 ring-1 ring-ink-700 active:scale-95">
        <Sprite id="exercise" opts={opts} size={128} label={`${name}, demo`} />
      </button>
      {big && (
        // Held sideways: the demo on the left, its name and cue beside it.
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950/95 px-6 text-center [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-[auto_minmax(0,18rem)] [@media(orientation:landscape)_and_(max-height:600px)]:grid-rows-[1fr_auto_1fr] [@media(orientation:landscape)_and_(max-height:600px)]:content-center [@media(orientation:landscape)_and_(max-height:600px)]:gap-x-8 [@media(orientation:landscape)_and_(max-height:600px)]:text-left"
          onClick={() => setBig(false)}
        >
          <p className="font-pixel text-xs text-gold-300 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:self-end">{name}</p>
          {exercise === 'diamond-pushup' ? (
            // From the side the diamond can't be seen, so this one also shows the front.
            <div className="mt-4 space-y-2 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-span-3 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-2 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0">
              <div className="mx-auto w-fit rounded-2xl bg-ink-900 p-2 ring-1 ring-ink-700">
                <Sprite id="exercise" opts={opts} size={192} label={`${name}, from the side`} />
              </div>
              <div className="mx-auto w-fit rounded-2xl bg-ink-900 p-2 ring-1 ring-ink-700">
                <Sprite id="exercise" opts={{ ...opts, view: 'front' }} size={192} label={`${name}, from the front`} />
              </div>
              <p className="max-w-xs text-xs text-slate-400 [@media(orientation:landscape)_and_(max-height:600px)]:col-span-2 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-none [@media(orientation:landscape)_and_(max-height:600px)]:text-center">From the front: hands together under your chest, thumbs and fingers touching.</p>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl bg-ink-900 p-2 ring-1 ring-ink-700 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:row-span-3 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-1 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">
              <Sprite id="exercise" opts={opts} size={320} label={`${name}, demo`} />
            </div>
          )}
          <p className="mt-4 max-w-xs text-sm text-slate-300 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:mt-3">{cue}</p>
          <p className="mt-6 text-xs text-slate-500 [@media(orientation:landscape)_and_(max-height:600px)]:col-start-2 [@media(orientation:landscape)_and_(max-height:600px)]:row-start-3 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 [@media(orientation:landscape)_and_(max-height:600px)]:self-start">Tap to close</p>
        </div>
      )}
    </>
  );
}

/** The rest bar's cells: one lights every few seconds. */
const REST_CELLS = 10;

function Rest({ stage, until, next, onDone }: { stage: ReturnType<typeof flameStage>['id']; until: number; next: string | null; onDone: () => void }) {
  const [now, setNow] = useState(Date.now());
  const left = Math.max(0, Math.ceil((until - now) / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (left === 0) {
      navigator.vibrate?.([80, 60, 80]);
      onDone();
    }
  }, [left, onDone]);

  const pct = 1 - left / REST_SECONDS;
  return (
    // Held sideways: the flame on the left, the clock on the right.
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950/95 px-6 text-center [@media(orientation:landscape)_and_(max-height:600px)]:flex-row [@media(orientation:landscape)_and_(max-height:600px)]:gap-12" onClick={onDone}>
      {/* Your flame keeps you company while you rest. */}
      <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:items-center">
        <Ember size={stage === 'spark' ? 120 : 88} stage={stage} mood="happy" />
        <p className="mt-2 font-pixel text-[10px] text-slate-400">Rest</p>
      </div>
      <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:items-center">
      <p className="mt-3 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0 font-mono text-7xl font-bold text-slate-50">
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
      </p>
      <div className="mt-5 flex w-64 gap-1.5" aria-hidden>
        {Array.from({ length: REST_CELLS }).map((_, i) => (
          <div key={i} className={`pixel-notch h-5 flex-1 ${i < Math.floor(pct * REST_CELLS + 0.001) ? 'bg-gold-400 shadow-[inset_0_-3px_0_#b45309]' : 'bg-ink-700 shadow-[inset_0_-3px_0_#1c2033]'}`} />
        ))}
      </div>
      <p className="mt-5 text-sm text-slate-400">{next ? `Next: ${next}` : 'Next exercise is ready.'}</p>
      <p className="mt-1 text-xs text-slate-500">Breathe. Shake out your arms.</p>
      <button className="mt-8 rounded-xl bg-ink-800 px-6 py-3 text-sm font-semibold text-slate-200 [@media(orientation:landscape)_and_(max-height:600px)]:mt-5">Skip rest</button>
      </div>
    </div>
  );
}
