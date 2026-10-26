'use client';

import { useEffect, useRef, useState } from 'react';
import { Shield, Zap } from 'lucide-react';
import { Hero } from './Hero';
import { Ember } from './Characters';
import { Foe, RingView, OVERSHOOT, type Ring } from './Battle';
import { gearOf, type GameState, type QuestExercise } from '@/lib/game';
import { fighterOf, type Stop } from '@/lib/road';
import { answerMove, foeHp, foeLeft, foeOf, isCharged, ringsOf, vitals, type Grade, type WorkoutFight } from '@/lib/fight';

/* The fight on the workout screen (rules in src/lib/fight.ts): FightStrip sits above the set
   logger, FoeTurn plays the foe's answer at the start of each rest. */

const GUARD_MS = 900;
const BIG_MS = 720;

/** The label over a stop: what kind of fight it is. */
export function stopLabel(stop: Stop, patrol?: boolean): string {
  if (patrol) return 'PATROL';
  if (stop.kind === 'boss' && stop.blow) return stop.blow.n === stop.blow.of ? 'FINAL BLOW' : `BOSS · BLOW ${stop.blow.n}/${stop.blow.of}`;
  return { guardian: 'GUARDIAN', fight: 'ROAD FIGHT', elite: 'ELITE', boss: 'BOSS' }[stop.kind];
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-sm bg-ink-700">
      <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(0, Math.min(1, value / max)) * 100}%` }} />
    </div>
  );
}

interface StripProps {
  state: GameState;
  fight: WorkoutFight;
  quest: QuestExercise[];
  /** Every planned set is logged: the foe is beaten. */
  finished: boolean;
}

/** You and the foe above the set logger. Each set you log lands as a hit. */
export function FightStrip({ state, fight, quest, finished }: StripProps) {
  const foe = foeOf(fight);
  const max = foeHp(state, quest);
  const left = foeLeft(state, fight, quest, finished);
  const me = vitals(state, fight);
  const charged = isCharged(state, fight);
  const gear = gearOf(state);
  const count = fight.blows.length;
  const last = fight.blows[count - 1];
  const seen = useRef(count);
  const [pop, setPop] = useState<{ key: number; text: string; charged: boolean } | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (count > seen.current && last) {
      setPop({ key: count, text: `-${last.dmg}`, charged: last.charged });
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      seen.current = count;
      return () => clearTimeout(t);
    }
    seen.current = count;
  }, [count, last]);

  return (
    <section className="mt-1 rounded-2xl bg-[#14110f] px-3 pb-2.5 pt-2.5 pixel-border">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-pixel text-[9px] text-slate-400">{stopLabel(foe, fight.patrol)}</p>
        <p className="truncate font-pixel text-[9px] text-red-300">{foe.name}</p>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Bar value={left} max={max} color="bg-red-500" />
        <span className="w-16 text-right font-mono text-[10px] text-slate-400">
          {left}/{max}
        </span>
      </div>

      <div className="relative flex h-[100px] items-end justify-between px-3">
        <div className="relative">
          <Hero gear={gear} classId={state.profile.classId} size={92} action={count} />
          <div className="absolute -left-3 bottom-0">
            <Ember size={26} />
          </div>
        </div>
        {finished && <p className="absolute inset-x-0 top-3 text-center font-pixel text-[10px] text-gold-300">DEFEATED!</p>}
        <div className={`relative ${shake ? 'animate-shake' : ''} ${finished ? 'opacity-30 grayscale transition-all duration-700' : ''}`}>
          <Foe sprite={foe.sprite} size={foe.kind === 'boss' ? 96 : 84} gear={gear} classId={state.profile.classId} />
          {pop && (
            <span key={pop.key} className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
              <span className={`animate-hit font-pixel ${pop.charged ? 'text-base text-orange-300' : 'text-sm text-gold-300'}`}>{pop.text}</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <p className="font-pixel text-[9px] text-gold-300">You</p>
        <Bar value={me.hp} max={me.hpMax} color="bg-emerald-400" />
        <span className="font-mono text-[10px] text-slate-400">
          {me.hp}/{me.hpMax}
        </span>
        {me.shields > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-sky-300" title="Ember's shields: each takes a whole hit">
            <Shield size={12} />×{me.shields}
          </span>
        )}
        {charged && !finished && (
          <span className="flex items-center gap-0.5 text-[10px] text-orange-300" title="Your next set hits ×1.5">
            <Zap size={12} />
            ×1.5
          </span>
        )}
      </div>
    </section>
  );
}

interface TurnProps {
  state: GameState;
  fight: WorkoutFight;
  /** Called once with your guard on each ring. */
  onAnswer: (grades: Grade[]) => void;
  /** The turn is over (and you're back on your feet): the rest can be skipped. */
  onSettled: () => void;
}

type TurnPhase = 'hit' | 'warn' | 'ring' | 'down' | 'done';

/** Guarding after a hard set is harder than in a calm fight, so the workout's timing is wider. */
const WORKOUT_GUARD_BONUS = 50;

/**
 * The set you just logged lands, then the foe answers, at the start of your rest. Tap anywhere
 * when the red ring meets you. One ring per hit; a charging foe skips its turn and hits big next time.
 */
export function FoeTurn({ state, fight, onAnswer, onSettled }: TurnProps) {
  const k = fight.blows.length - 1;
  const move = useRef(answerMove(fight, k)).current;
  const foe = foeOf(fight);
  const guard = fighterOf(state).guard + WORKOUT_GUARD_BONUS;
  const gear = gearOf(state);
  const [phase, setPhase] = useState<TurnPhase>('hit');
  const [act, setAct] = useState(0);
  const [ring, setRing] = useState<Ring | null>(null);
  const [flash, setFlash] = useState<{ key: number; text: string; color: string } | null>(null);
  const resolver = useRef<((g: Grade) => void) | null>(null);
  const started = useRef(0);
  const callbacks = useRef({ onAnswer, onSettled });
  callbacks.current = { onAnswer, onSettled };
  const blow = fight.blows[k];

  // Play the rings once, on mount.
  useEffect(() => {
    let alive = true;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const runRing = (ms: number, window: number) =>
      new Promise<Grade>((resolve) => {
        let done = false;
        const finish = (g: Grade) => {
          if (done) return;
          done = true;
          resolver.current = null;
          setRing(null);
          resolve(g);
        };
        resolver.current = finish;
        started.current = performance.now();
        setRing({ who: 'hero', ms, window, key: Date.now() });
        navigator.vibrate?.(35);
        setTimeout(() => finish('miss'), ms * (1 + OVERSHOOT));
      });
    (async () => {
      // Your set lands first.
      setAct(1);
      await wait(1000);
      if (!alive) return;
      setPhase('warn');
      await wait(800);
      const grades: Grade[] = [];
      for (let i = 0; i < ringsOf(move) && alive; i++) {
        setPhase('ring');
        const big = move.kind === 'big';
        const g = await runRing(big ? BIG_MS : GUARD_MS, big ? guard / 2 : guard);
        grades.push(g);
        setFlash({ key: Date.now(), text: g === 'perfect' ? 'PERFECT' : g === 'good' ? 'GOOD' : 'MISS', color: g === 'perfect' ? '#34d399' : g === 'good' ? '#fde68a' : '#f87171' });
        await wait(450);
      }
      if (!alive) return;
      if (!ringsOf(move)) await wait(700);
      callbacks.current.onAnswer(grades);
      setPhase('done');
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A fall waits for you to get back up before the rest can be skipped.
  useEffect(() => {
    if (phase !== 'done' || !blow?.guards) return;
    if (blow.down) setPhase('down');
    else callbacks.current.onSettled();
  }, [phase, blow]);

  const tap = () => {
    if (!ring || !resolver.current) return;
    const delta = Math.abs(performance.now() - started.current - ring.ms);
    resolver.current(delta <= ring.window / 3 ? 'perfect' : delta <= ring.window ? 'good' : 'miss');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      tap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="w-full max-w-sm">
      <div className="relative flex h-[132px] items-end justify-between px-4">
        <div className="relative">
          <Hero gear={gear} classId={state.profile.classId} size={108} bounce={phase !== 'down'} action={act} />
          {ring && <RingView ring={ring} color="#f87171" />}
          {flash && (
            <span key={flash.key} className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
              <span className="animate-hit font-pixel text-xs" style={{ color: flash.color }}>
                {flash.text}
              </span>
            </span>
          )}
        </div>
        <div className={`relative ${phase === 'hit' && act ? 'animate-shake' : phase === 'warn' || phase === 'ring' ? 'animate-float' : ''}`}>
          <Foe sprite={foe.sprite} size={foe.kind === 'boss' ? 104 : 92} gear={gear} classId={state.profile.classId} />
          {phase === 'hit' && act > 0 && blow && (
            <span className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
              <span className={`animate-hit font-pixel ${blow.charged ? 'text-lg text-orange-300' : 'text-base text-gold-300'}`}>-{blow.dmg}</span>
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 min-h-[40px] text-center text-sm leading-snug text-slate-200">{turnText(foe.name, move.kind, phase, blow)}</p>
      {phase === 'down' && <HoldUp onUp={() => callbacks.current.onSettled()} />}
      {ring && <button aria-label="Guard" onPointerDown={tap} className="fixed inset-0 z-[70] cursor-pointer" />}
    </div>
  );
}

function turnText(name: string, kind: string, phase: TurnPhase, blow: WorkoutFight['blows'][number] | undefined): string {
  if (phase === 'hit') return blow ? (blow.charged ? `Charged! Your set hits for ${blow.dmg}.` : `Your set hits for ${blow.dmg}.`) : '';
  if (phase === 'warn') return kind === 'charge' ? `${name} is gathering itself...` : kind === 'big' ? `${name} winds up a BIG hit!` : `${name} answers your set!`;
  if (phase === 'ring') return 'Tap when the red ring meets you!';
  if (!blow?.guards) return '';
  if (phase === 'down') return 'You fell. Ember is here. Get back up.';
  if (!blow.guards.length) return `${name} is charging. Its next hit is BIG.`;
  const counter = blow.guards.every((g) => g === 'perfect');
  if (counter) return 'BLOCK! Counter ready: your next set hits ×1.5.';
  const parts = [];
  if (blow.shielded) parts.push(blow.shielded > 1 ? `Ember's shields took ${blow.shielded} hits.` : "Ember's shield took the hit.");
  if (blow.taken) parts.push(`You took ${blow.taken}.`);
  return parts.join(' ') || 'Guarded.';
}

const HOLD_MS = 1400;

/** Hold to stand back up after a fall. Letting go lets the bar sink. */
function HoldUp({ onUp }: { onUp: () => void }) {
  const [p, setP] = useState(0);
  const holding = useRef(false);
  const doneRef = useRef(false);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = now - last;
      last = now;
      setP((v) => {
        const next = holding.current ? Math.min(1, v + dt / HOLD_MS) : Math.max(0, v - dt / (HOLD_MS * 2));
        if (next >= 1 && !doneRef.current) {
          doneRef.current = true;
          navigator.vibrate?.([40, 60, 120]);
          setTimeout(onUp, 0);
        }
        return next;
      });
      if (!doneRef.current) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onUp]);
  const hold = (on: boolean) => () => {
    holding.current = on;
  };
  return (
    <button
      onPointerDown={hold(true)}
      onPointerUp={hold(false)}
      onPointerLeave={hold(false)}
      onPointerCancel={hold(false)}
      onContextMenu={(e) => e.preventDefault()}
      className="relative mx-auto mt-3 block w-64 select-none overflow-hidden rounded-2xl bg-ink-800 py-4 font-pixel text-xs text-gold-300"
    >
      <span className="absolute inset-y-0 left-0 bg-gold-400/30" style={{ width: `${p * 100}%` }} />
      <span className="relative">{p >= 1 ? 'Back on your feet' : 'Hold to get up'}</span>
    </button>
  );
}
