'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, ListOrdered, MessageCircle, Minus, Plus, Shuffle, Timer, TrendingDown, Undo2, X } from 'lucide-react';
import { REST_SECONDS, clockStart, gearOf, isTap, todaysQuest, type GameState, type QuestExercise, type Rir } from '@/lib/game';
import { canMove, changeItem, moveItem, skipItem } from '@/lib/coach/plan';
import { currentPlan } from '@/lib/coach/week';
import { minutesOf, restFor } from '@/lib/coach/time';
import type { Choice, RunStep } from '@/lib/coach/types';
import { ensurePlan } from './useCoach';
import { doseOf } from './CoachPanel';
import { ROLE_COLOR, ROLE_LABEL } from '@/lib/program';
import { EXERCISES, type ExerciseId } from '@/sprites/characters/exercise';
import { anatomyFor, viewName, type AnatomyId, type Variant } from '@/sprites/anatomy/body';
import { AnatomyDemo, MuscleKey } from './AnatomyDemo';
import { useLook } from './Look';
import { Ember } from './Characters';
import { flameStage } from '@/story/flame';
import { Sprite } from './Sprite';
import { useGymMode } from './Gym';
import { ExerciseSheet } from './ExerciseDetail';
import { CoachChat } from './CoachChat';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onClose: () => void;
  onFinish: () => void;
}

/** How a set felt, with the reps left in reserve under it; picked over Done, just right unless you say. */
const RIR_BUTTONS: { rir: Rir; label: string }[] = [
  { rir: '4+', label: 'Easy' },
  { rir: '2-3', label: 'Just right' },
  { rir: '0-1', label: 'Very hard' },
];

/** Full-screen set logger: one exercise at a time, one tap per set, rest timer between sets. */
export function Workout({ state, update, onClose, onFinish }: Props) {
  const quest = todaysQuest(state);
  const sets = state.draft?.sets ?? {};
  const firstOpen = quest.findIndex((q) => (sets[q.id]?.length ?? 0) < q.sets);
  const [index, setIndex] = useState(firstOpen === -1 ? 0 : firstOpen);
  // Kept in the save, so a rest started before the phone locked is still counting when it opens.
  const restUntil = state.draft?.restUntil ?? null;
  const setRestUntil = useCallback(
    (until: number | null) => update((s) => (s.draft ? { ...s, draft: { ...s.draft, restUntil: until } } : s)),
    [update],
  );
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
  // Before the first set: the whole workout, to reorder, make easier, swap or skip.
  const [overview, setOverview] = useState(() => Object.values(sets).every((l) => l.length === 0));
  const [choices, setChoices] = useState<'easier' | 'swap' | null>(null);
  // The how-to page for the exercise on screen, and the chat with the flame.
  const [howTo, setHowTo] = useState(false);
  const [feel, setFeel] = useState<Rir>('2-3');
  const [asking, setAsking] = useState(false);
  const hasPlan = !!currentPlan(state.coach);
  const gym = useGymMode();
  useEffect(() => {
    // The built-in plan becomes a plan with choices, so it can be changed too.
    if (!hasPlan) ensurePlan(update);
  }, [hasPlan, update]);
  const pick = (c: Choice, how: 'easier' | 'swap') => {
    update((s) => changeItem(s, q.id, c, how));
    setChoices(null);
  };

  useEffect(() => {
    setReps(q.reps);
  }, [q.id, q.reps]);
  // A warm-up or stretch counts down once started (Done works any time).
  const [tapEnd, setTapEnd] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setTapEnd(null), [q.id]);
  useEffect(() => {
    if (!tapEnd) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [tapEnd]);
  const tapLeft = tapEnd ? Math.max(0, Math.ceil((tapEnd - now) / 1000)) : q.reps;
  const tapOver = !!tapEnd && tapLeft === 0;
  useEffect(() => {
    if (tapOver) navigator.vibrate?.([60, 60, 60]);
  }, [tapOver]);

  // Marked open, so if the phone closes the app the workout is where it opens again.
  useEffect(() => {
    update((s) => (s.draft && !s.draft.open ? { ...s, draft: { ...s.draft, open: true } } : s));
  }, [update]);
  useWakeLock();

  // No pausing: leaving before the end throws the workout away (it doesn't count), so ask first
  // once a set is logged.
  const [leaving, setLeaving] = useState(false);
  const started = Object.values(sets).some((l) => l.length > 0);
  const close = () => {
    if (started) return setLeaving(true);
    update((s) => (s.draft ? { ...s, draft: { ...s.draft, open: false, restUntil: null } } : s));
    onClose();
  };
  const leave = () => {
    update((s) => ({ ...s, draft: null }));
    setLeaving(false);
    onClose();
  };
  const [restLen, setRestLen] = useState(REST_SECONDS);

  const log = (rir: Rir) => {
    update((s) => {
      const draft = s.draft ?? { startedAt: new Date().toISOString(), checkin: 'normal' as const, sets: {} };
      const list = [...(draft.sets[q.id] ?? []), { reps, rir }];
      return { ...s, draft: { ...draft, sets: { ...draft.sets, [q.id]: list } } };
    });
    setHistory((h) => [...h, q.id]);
    setFeel('2-3');
    navigator.vibrate?.(30);
    const finishedExercise = logged.length + 1 >= q.sets;
    const lastOfAll = finishedExercise && quest.every((e) => e.id === q.id || (sets[e.id]?.length ?? 0) >= e.sets);
    if (!lastOfAll && !tap) {
      const rest = restOf(q);
      setRestLen(rest);
      setRestUntil(Date.now() + rest * 1000);
    }
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

  const leaveSheet = leaving && <LeaveSheet onStay={() => setLeaving(false)} onLeave={leave} />;
  if (overview)
    return (
      <>
        <Overview
          state={state}
          update={update}
          quest={quest}
          onClose={close}
          onStart={() => {
            // The workout's clock starts here, once.
            update((s) => (s.draft && !s.draft.clockAt ? { ...s, draft: { ...s.draft, clockAt: Date.now() } } : s));
            setOverview(false);
          }}
        />
        {leaveSheet}
      </>
    );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950">
      <header className="safe-top land-safe-x flex items-center justify-between px-4 pb-2 [@media(orientation:landscape)_and_(max-height:600px)]:pb-1">
        <button onClick={close} aria-label="Back to Today" className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800">
          <X size={18} />
        </button>
        {/* Where you are: one bar a move (green done, gold now), and the count under it. */}
        <div className="mx-3 min-w-0 flex-1">
          <div className="flex gap-1">
            {quest.map((e, i) => (
              <button
                key={e.id}
                onClick={() => setIndex(i)}
                aria-label={e.name}
                className={`h-2.5 min-w-0 flex-1 rounded-sm ${i === index ? 'bg-gold-400' : (sets[e.id]?.length ?? 0) >= e.sets ? 'bg-emerald-500' : 'bg-ink-600'}`}
              />
            ))}
          </div>
          {state.draft && <SessionClock from={clockStart(state.draft)} />}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAsking(true)} aria-label="Ask your flame" className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800 text-gold-300">
            <MessageCircle size={18} />
          </button>
          <button onClick={() => setOverview(true)} aria-label="The whole workout" className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800 text-slate-300">
            <ListOrdered size={18} />
          </button>
        </div>
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

        {/* The demo in the middle, its small tools in a column on its right: an icon and one word each. */}
        <div className="relative">
          <Demo state={state} exercise={q.demo} name={q.name} cue={q.cue} />
          {!exerciseDone && (
            <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-2">
              <Tool icon={<BookOpen size={16} />} label="How to" onClick={() => setHowTo(true)} />
              {!tap && q.item && q.item.easier.length > 0 && <Tool icon={<TrendingDown size={16} />} label="Easier" onClick={() => setChoices('easier')} />}
              {!tap && q.item && q.item.swaps.length > 0 && <Tool icon={<Shuffle size={16} />} label="Swap" onClick={() => setChoices('swap')} />}
            </div>
          )}
        </div>
        </div>

        <div className="contents [@media(orientation:landscape)_and_(max-height:600px)]:flex [@media(orientation:landscape)_and_(max-height:600px)]:flex-col [@media(orientation:landscape)_and_(max-height:600px)]:justify-center">
        {/* The rounds: which one you're on, then a box each (its reps once done). */}
        <p className={`mt-5 text-center font-pixel text-[9px] uppercase tracking-[0.2em] text-slate-400 [@media(orientation:landscape)_and_(max-height:600px)]:mt-0 ${tap || q.run ? 'hidden' : ''}`}>
          {exerciseDone ? `${q.sets} rounds` : `Round ${logged.length + 1} of ${q.sets}`}
        </p>
        <div className={`mt-2 flex justify-center gap-2 ${tap || q.run ? 'hidden' : ''}`}>
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
        ) : q.run ? (
          <RunView
            steps={q.run}
            runAt={state.draft?.runAt ?? null}
            onStart={() => update((s) => (s.draft ? { ...s, draft: { ...s.draft, runAt: Date.now() } } : s))}
            onDone={(sec, km) => {
              update((s) => {
                const draft = s.draft ?? { startedAt: new Date().toISOString(), checkin: 'normal' as const, sets: {} };
                const list = [...(draft.sets[q.id] ?? []), { reps: sec, rir: '2-3' as Rir, ...(km ? { km } : {}) }];
                return { ...s, draft: { ...draft, runAt: null, sets: { ...draft.sets, [q.id]: list } } };
              });
              setHistory((h) => [...h, q.id]);
              const next = quest.findIndex((e, i) => i !== index && (sets[e.id]?.length ?? 0) < e.sets);
              if (next !== -1) setIndex(next);
            }}
          />
        ) : tap ? (
          <div className="mt-6 text-center [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">
            <p className={`font-mono text-5xl font-bold ${tapOver ? 'text-emerald-400' : 'text-slate-50'}`}>
              {tapLeft >= 60 ? `${Math.floor(tapLeft / 60)}:${String(tapLeft % 60).padStart(2, '0')}` : `${tapLeft}s`}
            </p>
            {tapOver && <p className="mt-1 text-sm text-emerald-400">Time</p>}
            {tapEnd ? (
              <button
                onClick={() => log('4+')}
                className="mt-6 w-full rounded-2xl bg-gold-400 py-4 font-pixel [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setNow(Date.now());
                    setTapEnd(Date.now() + q.reps * 1000);
                  }}
                  className="mt-6 w-full rounded-2xl bg-gold-400 py-4 font-pixel [@media(orientation:landscape)_and_(max-height:600px)]:mt-4 text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
                >
                  Start
                </button>
                <button onClick={() => log('4+')} className="mt-2 w-full py-2 text-sm text-slate-400">
                  Skip the timer
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* The number starts at the target; − and + set what you really did. */}
            <p className={`mt-5 text-center font-pixel text-[9px] uppercase tracking-[0.2em] [@media(orientation:landscape)_and_(max-height:600px)]:mt-1 ${reps === q.reps ? 'text-gold-300' : 'text-slate-400'}`}>
              {reps === q.reps ? `Target ${unit ? 'seconds' : 'reps'}` : `You did · target ${q.reps}`}
            </p>
            <div className="mt-1 flex items-center justify-center gap-5">
              <button onClick={() => setReps(Math.max(1, reps - (unit ? 2 : 1)))} aria-label="Fewer" className="pixel-notch grid h-14 w-14 place-items-center bg-ink-800 active:scale-95 [@media(orientation:landscape)_and_(max-height:600px)]:h-12 [@media(orientation:landscape)_and_(max-height:600px)]:w-12">
                <Minus />
              </button>
              <p className="w-28 text-center">
                <span className={`font-mono text-6xl font-bold [@media(orientation:landscape)_and_(max-height:600px)]:text-5xl ${reps === q.reps ? 'text-slate-50' : 'text-sky-200'}`}>{reps}</span>
                <span className="ml-1 text-lg text-slate-400">{unit}</span>
              </p>
              <button onClick={() => setReps(reps + (unit ? 2 : 1))} aria-label="More" className="pixel-notch grid h-14 w-14 place-items-center bg-ink-800 active:scale-95 [@media(orientation:landscape)_and_(max-height:600px)]:h-12 [@media(orientation:landscape)_and_(max-height:600px)]:w-12">
                <Plus />
              </button>
            </div>

            {/* One Done saves the set; how it felt is set to just right, a tap away if not. */}
            <p className="mt-6 text-center font-pixel text-[9px] uppercase tracking-[0.2em] text-slate-500 [@media(orientation:landscape)_and_(max-height:600px)]:mt-3">How did it feel?</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="How did it feel?">
              {RIR_BUTTONS.map((b) => (
                <button
                  key={b.rir}
                  role="radio"
                  aria-checked={feel === b.rir}
                  onClick={() => setFeel(b.rir)}
                  className={`rounded-xl py-2.5 transition active:scale-95 [@media(orientation:landscape)_and_(max-height:600px)]:py-1.5 ${feel === b.rir ? 'bg-ink-600 text-slate-50 ring-2 ring-gold-400' : 'bg-ink-800 text-slate-400'}`}
                >
                  <span className="block text-sm font-semibold">{b.label}</span>
                  <span className="block font-mono text-xs opacity-80">{b.rir}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => log(feel)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none [@media(orientation:landscape)_and_(max-height:600px)]:py-3"
            >
              <Check size={18} strokeWidth={3} /> Done
            </button>
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
            {gym ? 'Finish workout' : 'Complete quest'}
          </button>
        ) : totalLogged === 0 ? null : (
          <button onClick={onFinish} className="w-full py-3 [@media(orientation:landscape)_and_(max-height:600px)]:py-2 text-sm text-slate-400 disabled:opacity-30">
            End here (it still counts)
          </button>
        )}
      </footer>

      {choices && q.item && (
        <Choices
          title={choices === 'easier' ? `Easier than ${q.name}` : `Instead of ${q.name}`}
          hint={choices === 'easier' ? 'The same movement, a step down. Sets you logged stay.' : 'Trains the same thing. Machine taken, or not for you today.'}
          list={choices === 'easier' ? q.item.easier : q.item.swaps}
          state={state}
          onPick={(c) => pick(c, choices)}
          onClose={() => setChoices(null)}
        />
      )}
      {restUntil && <Rest gym={gym} stage={flameStage(state.sessions.length).id} until={restUntil} total={restLen} next={exerciseDone ? null : `Set ${logged.length + 1} of ${q.name}`} onDone={() => setRestUntil(null)} />}
      {howTo && <ExerciseSheet state={state} id={q.id} demo={q.demo} onClose={() => setHowTo(false)} />}
      {asking && <CoachChat state={state} update={update} onClose={() => setAsking(false)} start={`About ${q.name}: `} />}
      {leaveSheet}
    </div>
  );
}

/** A small tool beside the demo: its icon over one word. */
/** The workout's clock: how long since Start, ticking each second. */
function SessionClock({ from }: { from: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="mt-1.5 flex items-center justify-center gap-1 font-mono text-[11px] tabular-nums text-slate-300" aria-label="Workout time">
      <Timer size={12} className="text-slate-500" />
      {clock(Math.max(0, Math.floor((now - from) / 1000)))}
    </p>
  );
}

/** Seconds as m:ss, or h:mm:ss past an hour. */
export function clock(sec: number): string {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = sec % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

function Tool({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 text-[10px] text-slate-400 active:scale-95">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-800 text-slate-200">{icon}</span>
      {label}
    </button>
  );
}

/** The rest after a set: the coach's, else by role (the same rule the time estimate uses). */
function restOf(q: QuestExercise): number {
  return restFor({ role: q.role, rest: q.item?.rest, weighted: q.item?.weighted ?? q.slot.weighted });
}

/** Leaving mid-workout: it won't count, and it starts over next time. */
function LeaveSheet({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-950/80" onClick={onStay}>
      <div className="safe-bottom land-safe-x w-full max-w-md rounded-t-2xl bg-ink-800 p-4" role="alertdialog" aria-label="Leave the workout?" onClick={(e) => e.stopPropagation()}>
        <p className="font-pixel text-[10px] text-gold-300">Leave the workout?</p>
        <p className="mt-2 text-sm text-slate-200">A workout counts only when you finish it. If you leave now, the sets you did are lost, and it starts over next time.</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onStay} className="flex-1 rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none">
            Keep going
          </button>
          <button onClick={onLeave} className="flex-1 rounded-xl bg-ink-700 py-3 text-sm font-semibold text-rose-200">
            Leave, don&apos;t count it
          </button>
        </div>
      </div>
    </div>
  );
}

/** Keeps the screen on while the workout is open, so the phone doesn't lock between sets. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let gone = false;
    const ask = () => {
      if (gone || document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (gone) l.release().catch(() => {});
          else lock = l;
        })
        .catch(() => {});
    };
    ask();
    // The browser drops the lock when the app is hidden; take it again on return.
    document.addEventListener('visibilitychange', ask);
    return () => {
      gone = true;
      document.removeEventListener('visibilitychange', ask);
      lock?.release().catch(() => {});
    };
  }, []);
}

/** You doing the exercise, looping one rep: small above the sets, tap for a big one. */
function Demo({ state, exercise, name, cue }: { state: GameState; exercise: string; name: string; cue: string }) {
  const [big, setBig] = useState(false);
  const look = useLook();
  const body = anatomyFor(exercise, name);
  if (body) return <BodyDemo exercise={body.id} variant={body.variant} name={name} cue={cue} />;
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

/** The anatomy demo (sprites/anatomy/, the first moves): a plain body side
    on with the worked muscles colored in; tap for side on and a second view together, with which
    muscles it works. */
function BodyDemo({ exercise, variant, name, cue }: { exercise: AnatomyId; variant: Variant; name: string; cue: string }) {
  const [big, setBig] = useState(false);
  return (
    <>
      <button onClick={() => setBig(true)} aria-label={`Show how to do ${name}`} className="mx-auto mt-3 block shrink-0 overflow-hidden rounded-xl ring-1 ring-ink-700 active:scale-95">
        <AnatomyDemo exercise={exercise} variant={variant} view="side" label={`${name}, demo`} className="block h-40 w-60 [@media(orientation:landscape)_and_(max-height:600px)]:h-28 [@media(orientation:landscape)_and_(max-height:600px)]:w-40" />
      </button>
      {big && (
        // Scrolls when it is taller than the screen; centered when it fits.
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-950/95 px-6 text-center" onClick={() => setBig(false)}>
          <div className="flex min-h-full flex-col items-center justify-center py-6">
            <p className="font-pixel text-xs text-gold-300">{name}</p>
            <div className="mt-4 flex w-full max-w-sm flex-col gap-3 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:600px)]:flex-row">
              {(['side', 'front'] as const).map((view) => (
                <figure key={view} className="flex-1 overflow-hidden rounded-2xl ring-1 ring-ink-700">
                  <AnatomyDemo exercise={exercise} variant={variant} view={view} label={`${name}, ${viewName(exercise, view, variant).toLowerCase()} view`} className="block max-h-[36vh] w-full" />
                  <figcaption className="bg-ink-900 py-1 text-[11px] text-slate-400">{viewName(exercise, view, variant)}</figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-4">
              <MuscleKey exercise={exercise} />
            </div>
            <p className="mt-3 max-w-xs text-sm text-slate-300">{cue}</p>
            <p className="mt-4 text-xs text-slate-500">Tap to close</p>
          </div>
        </div>
      )}
    </>
  );
}

/** The rest bar's cells: one lights every few seconds. */
const REST_CELLS = 10;

function Rest({ gym, stage, until, total, next, onDone }: { gym: boolean; stage: ReturnType<typeof flameStage>['id']; until: number; total: number; next: string | null; onDone: () => void }) {
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

  const pct = 1 - left / Math.max(total, left, 1);
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  // Gym mode: one ring that fills as the rest runs out, the clock in its middle, and nothing else.
  if (gym)
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950 px-6 text-center" onClick={onDone}>
        <div className="relative h-64 w-64 [@media(orientation:landscape)_and_(max-height:600px)]:h-48 [@media(orientation:landscape)_and_(max-height:600px)]:w-48">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="46" fill="none" strokeWidth="3" className="stroke-ink-700" />
            <circle cx="50" cy="50" r="46" fill="none" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct * 100} 100`} className="stroke-gold-400 transition-[stroke-dasharray] duration-300 motion-reduce:transition-none" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Rest</p>
            <p className="mt-1 text-6xl font-semibold tabular-nums tracking-tight text-slate-50 [@media(orientation:landscape)_and_(max-height:600px)]:text-5xl">{clock}</p>
          </div>
        </div>
        <p className="mt-8 text-sm text-slate-400 [@media(orientation:landscape)_and_(max-height:600px)]:mt-4">{next ? `Next: ${next}` : 'Next exercise is ready.'}</p>
        <button className="mt-6 rounded-full bg-ink-800 px-6 py-3 text-sm font-medium text-slate-200 [@media(orientation:landscape)_and_(max-height:600px)]:mt-3">Skip rest</button>
      </div>
    );
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
        {clock}
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

/** The whole workout before the first set: move, make easier, swap or skip any exercise. */
function Overview({ state, update, quest, onClose, onStart }: { state: GameState; update: Props['update']; quest: QuestExercise[]; onClose: () => void; onStart: () => void }) {
  const plan = currentPlan(state.coach);
  const [open, setOpen] = useState<{ id: string; kind: 'easier' | 'swap' } | null>(null);
  const items = plan?.items ?? [];
  const opened = items.find((i) => i.id === open?.id);
  const rough = state.draft?.checkin === 'rough';
  const gym = useGymMode();
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950">
      <header className="safe-top land-safe-x flex items-center justify-between gap-3 px-4 pb-2">
        <button onClick={onClose} aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-800">
          <X size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-pixel text-[10px] text-gold-300">{rough ? (gym ? 'Short workout' : 'Minimum quest') : (plan?.title ?? "Today's workout")}</p>
          {plan && <p className="mt-1 text-xs text-slate-400">About {minutesOf(items.filter((i) => quest.some((q) => q.id === i.id)))} min</p>}
        </div>
        <span className="w-10 shrink-0" />
      </header>
      <main className="land-safe-x mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pb-4 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-3xl">
        {!plan && <p className="mt-6 text-center text-sm text-slate-400">Getting your workout ready…</p>}
        <ul className="space-y-2 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-2 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0">
          {items.map((it) => {
            const end = it.role === 'warmup' || it.role === 'stretch';
            const inToday = quest.some((q) => q.id === it.id);
            return (
              <li key={it.id} className={`rounded-xl bg-ink-800 p-2.5 ${it.skipped || (!inToday && !it.skipped) ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <MiniDemo state={state} exercise={it.demo} name={it.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[it.role] }}>
                      {ROLE_LABEL[it.role]}
                      {it.changed && <span className="ml-1.5 normal-case tracking-normal text-sky-300">was {it.changed.fromName}</span>}
                    </p>
                    <p className={`truncate text-sm font-semibold ${it.skipped ? 'line-through' : ''}`}>{it.name}</p>
                    <p className="font-mono text-xs text-slate-400">{doseOf(it, it.run ? undefined : state.reps[it.id])}</p>
                  </div>
                  {!end && (
                    <div className="flex shrink-0 flex-col gap-1">
                      <button aria-label="Move up" disabled={!canMove(plan!, it.id, -1)} onClick={() => update((s) => moveItem(s, it.id, -1))} className="grid h-7 w-7 place-items-center rounded-md bg-ink-700 disabled:opacity-20">
                        <ArrowUp size={14} />
                      </button>
                      <button aria-label="Move down" disabled={!canMove(plan!, it.id, 1)} onClick={() => update((s) => moveItem(s, it.id, 1))} className="grid h-7 w-7 place-items-center rounded-md bg-ink-700 disabled:opacity-20">
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {!end && (
                  <div className="mt-2 flex gap-1.5">
                    {it.easier.length > 0 && !it.skipped && (
                      <button onClick={() => setOpen({ id: it.id, kind: 'easier' })} className="flex items-center gap-1 rounded-md bg-ink-900 px-2 py-1.5 text-[11px] font-semibold text-slate-200">
                        <TrendingDown size={12} className="text-sky-300" /> Easier
                      </button>
                    )}
                    {it.swaps.length > 0 && !it.skipped && (
                      <button onClick={() => setOpen({ id: it.id, kind: 'swap' })} className="flex items-center gap-1 rounded-md bg-ink-900 px-2 py-1.5 text-[11px] font-semibold text-slate-200">
                        <Shuffle size={12} className="text-gold-300" /> Swap
                      </button>
                    )}
                    <button onClick={() => update((s) => skipItem(s, it.id, !it.skipped))} className="ml-auto rounded-md bg-ink-900 px-2 py-1.5 text-[11px] font-semibold text-slate-400">
                      {it.skipped ? 'Bring back' : 'Skip'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
      <footer className="safe-bottom land-safe-x mx-auto w-full max-w-md px-4 pt-2">
        <button
          onClick={onStart}
          disabled={!quest.some((q) => !isTap(q))}
          className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-30 [@media(orientation:landscape)_and_(max-height:600px)]:py-3"
        >
          {Object.values(state.draft?.sets ?? {}).some((l) => l.length) ? 'Back to it' : "Let's go"}
        </button>
      </footer>
      {open && opened && (
        <Choices
          title={open.kind === 'easier' ? `Easier than ${opened.name}` : `Instead of ${opened.name}`}
          hint={open.kind === 'easier' ? 'The same movement, a step down.' : 'Trains the same thing.'}
          list={open.kind === 'easier' ? opened.easier : opened.swaps}
          state={state}
          onPick={(c) => {
            update((s) => changeItem(s, opened.id, c, open.kind));
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

/** A small still of the demo. */
export function MiniDemo({ state, exercise, name, size = 44 }: { state: GameState; exercise: ExerciseId; name: string; size?: number }) {
  const look = useLook();
  if (!(EXERCISES as string[]).includes(exercise)) return <span className="shrink-0 rounded-lg bg-ink-900" style={{ width: size + 4, height: size + 4 }} />;
  return (
    <span className="shrink-0 rounded-lg bg-ink-900 p-0.5">
      <Sprite id="exercise" opts={{ exercise, gear: gearOf(state), classId: state.profile.classId, look }} size={size} label={`${name}, demo`} />
    </span>
  );
}

/** The easier or swap choices for an exercise, as a sheet from the bottom. */
export function Choices({ title, hint, list, state, onPick, onClose }: { title: string; hint: string; list: Choice[]; state: GameState; onPick: (c: Choice) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/80" onClick={onClose}>
      <div className="safe-bottom land-safe-x max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-ink-800 p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-pixel text-[10px] leading-relaxed text-gold-300">{title}</p>
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-700">
            <X size={16} />
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {list.map((c) => (
            <li key={c.id}>
              <button onClick={() => onPick(c)} className="flex w-full items-center gap-3 rounded-xl bg-ink-900 p-2 text-left active:scale-[.98]">
                <MiniDemo state={state} exercise={c.demo} name={c.name} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-100">{c.name}</span>
                  <span className="block truncate text-xs text-slate-400">{c.cue}</span>
                  {c.equipment && <span className="block text-[11px] text-slate-500">{c.equipment}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const EFFORT: Record<RunStep['effort'], { label: string; color: string; hint: string }> = {
  walk: { label: 'Walk', color: '#94a3b8', hint: 'Walk and breathe.' },
  easy: { label: 'Easy', color: '#34d399', hint: 'You could talk in full sentences.' },
  steady: { label: 'Steady', color: '#38bdf8', hint: 'A pace you can hold, a few words at a time.' },
  fast: { label: 'Fast', color: '#fb923c', hint: 'Fast but in control. Not a sprint.' },
};

/** A run, step by step: a big clock for the step you are on, and what comes next. */
function RunView({ steps, runAt, onStart, onDone }: { steps: RunStep[]; runAt: number | null; onStart: () => void; onDone: (sec: number, km?: number) => void }) {
  const [now, setNow] = useState(Date.now());
  const [km, setKm] = useState('');
  useEffect(() => {
    if (!runAt) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [runAt]);
  const total = steps.reduce((a, s) => a + s.sec, 0);
  const elapsed = runAt ? Math.max(0, Math.floor((now - runAt) / 1000)) : 0;
  let at = 0,
    i = 0;
  while (i < steps.length && at + steps[i].sec <= elapsed) at += steps[i++].sec;
  const step = steps[Math.min(i, steps.length - 1)];
  const left = i < steps.length ? at + step.sec - elapsed : 0;
  const finished = elapsed >= total;
  const [lastStep, setLastStep] = useState(i);
  useEffect(() => {
    if (i !== lastStep) {
      navigator.vibrate?.([80, 60, 80]);
      setLastStep(i);
    }
  }, [i, lastStep]);
  const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const effort = EFFORT[step.effort];
  const distance = Number(km.replace(',', '.'));
  return (
    <div className="mt-4 text-center [@media(orientation:landscape)_and_(max-height:600px)]:mt-0">
      <div className="flex h-3 overflow-hidden rounded-sm" aria-hidden>
        {steps.map((s, k) => (
          <span key={k} style={{ flex: s.sec, background: EFFORT[s.effort].color, opacity: k < i ? 0.35 : k === i && runAt ? 1 : 0.6 }} className="border-r border-ink-950 last:border-0" />
        ))}
      </div>
      {!runAt ? (
        <>
          <p className="mt-4 font-mono text-5xl font-bold text-slate-50">{clock(total)}</p>
          <p className="mt-2 text-sm text-slate-400">{steps.length > 1 ? `${steps.length} parts. The phone buzzes when the next one starts.` : effort.hint}</p>
          <button onClick={onStart} className="mt-5 w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
            Start the run
          </button>
        </>
      ) : finished ? (
        <>
          <p className="mt-4 font-pixel text-xs text-emerald-400">Run done</p>
          <input
            value={km}
            onChange={(e) => setKm(e.target.value)}
            inputMode="decimal"
            placeholder="How far, in km? (optional)"
            className="mt-3 w-full rounded-xl bg-ink-800 px-3 py-3 text-center text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-400"
          />
          <button onClick={() => onDone(total, distance > 0 ? distance : undefined)} className="mt-3 w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
            Log the run
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 font-pixel text-sm" style={{ color: effort.color }}>
            {effort.label}
          </p>
          <p className="mt-2 font-mono text-6xl font-bold text-slate-50">{clock(left)}</p>
          <p className="mt-2 text-sm text-slate-400">{effort.hint}</p>
          {steps[i + 1] && <p className="mt-1 text-xs text-slate-500">Next: {EFFORT[steps[i + 1].effort].label.toLowerCase()} {clock(steps[i + 1].sec)}</p>}
          <p className="mt-3 font-mono text-xs text-slate-500">
            {clock(elapsed)} / {clock(total)}
          </p>
          <button onClick={() => onDone(elapsed, undefined)} className="mt-4 text-xs text-slate-400 underline">
            Stop here (what you ran still counts)
          </button>
        </>
      )}
    </div>
  );
}
