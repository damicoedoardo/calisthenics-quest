'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Heart, Shield, Sparkles, Swords } from 'lucide-react';
import { Hero } from './Hero';
import { Ember, Hollow } from './Characters';
import { Sprite } from './Sprite';
import { useMusic } from './Sound';
import { music } from '@/lib/music';
import { gearOf, type GameState } from '@/lib/game';
import { fighterOf, foeFor, type FoeSprite, type Move, type Stop } from '@/lib/road';

/** A road enemy's sprite. */
export function Foe({ sprite, size, gear, classId }: { sprite: FoeSprite; size: number; gear?: ReturnType<typeof gearOf>; classId?: GameState['profile']['classId'] }) {
  if (sprite === 'hollow') return <Hollow size={size} bounce={false} />;
  if (sprite === 'echo') return <Hero gear={gear!} classId={classId} size={size} variant="echo" bounce={false} />;
  return <Sprite id={sprite} size={size} />;
}

type Grade = 'perfect' | 'good' | 'miss';
export type Ring = { who: 'foe' | 'hero'; ms: number; window: number; key: number };
type Phase = 'intro' | 'player' | 'ring' | 'won' | 'lost';

const STRIKE_MS = 1100;
const STRIKE_WINDOW = 160;
const GUARD_MS = 900;
const BIG_MS = 720;
/** The ring keeps closing this long past the target before it counts as a miss. */
export const OVERSHOOT = 0.35;

function intentText(m: Move): string {
  if (m.kind === 'attack') return `Attack ${m.dmg}`;
  if (m.kind === 'multi') return `${m.hits} hits of ${m.dmg}`;
  if (m.kind === 'charge') return 'Charging up...';
  return `BIG HIT ${m.dmg}`;
}

interface Props {
  state: GameState;
  stop: Stop;
  dark: boolean;
  onWin: () => void;
  onClose: () => void;
}

/**
 * Scouting a stop in the dark, between workouts: a full skill fight against the stop your next
 * workout will meet, made stronger by the dark. Win and Ember learns its moves (one extra shield in
 * the real fight). Your numbers come from training; winning comes from timing.
 * Your turn: Strike, then tap when the gold ring meets the target (Perfect ×1.5, Good ×1, Miss ×0.5).
 * Their turn: tap when the red ring meets you to guard (Perfect blocks it all, Good halves it).
 */
export function Battle({ state, stop, dark, onWin, onClose }: Props) {
  const me = fighterOf(state);
  const foe = foeFor(stop, dark, me.darkPenalty);
  const gear = gearOf(state);
  const [heroHp, setHeroHp] = useState(me.hp);
  const [foeHp, setFoeHp] = useState(foe.hp);
  const [shield, setShield] = useState(me.shield);
  const [moveIx, setMoveIx] = useState(0);
  const [phase, setPhase] = useState<Phase>('intro');
  const [ring, setRing] = useState<Ring | null>(null);
  const [healUsed, setHealUsed] = useState(false);
  const [emberUsed, setEmberUsed] = useState(false);
  const [log, setLog] = useState(stop.line ?? `${stop.name} blocks the road.`);
  const [pop, setPop] = useState<{ text: string; who: 'foe' | 'hero'; key: number; color: string } | null>(null);
  const [act, setAct] = useState(0);
  const [shake, setShake] = useState<'foe' | 'hero' | null>(null);
  const started = useRef(0);
  const resolver = useRef<((g: Grade) => void) | null>(null);
  const hpRef = useRef({ hero: me.hp, foe: foe.hp, shield: me.shield });
  useMusic('hollow');

  const move = foe.moves[moveIx % foe.moves.length];

  const flash = (who: 'foe' | 'hero', text: string, color: string) => {
    setPop({ who, text, color, key: Date.now() + Math.random() });
    setShake(who);
    setTimeout(() => setShake(null), 400);
  };

  /** Starts a ring and resolves with the grade of the tap (or a miss when it closes). */
  const runRing = useCallback((who: 'foe' | 'hero', ms: number, window: number) => {
    return new Promise<Grade>((resolve) => {
      const key = Date.now();
      started.current = performance.now();
      let done = false;
      const finish = (g: Grade) => {
        if (done) return;
        done = true;
        resolver.current = null;
        setRing(null);
        resolve(g);
      };
      resolver.current = (g) => finish(g);
      setRing({ who, ms, window, key });
      setPhase('ring');
      setTimeout(() => finish('miss'), ms * (1 + OVERSHOOT));
    });
  }, []);

  const tap = () => {
    if (!ring || !resolver.current) return;
    const delta = Math.abs(performance.now() - started.current - ring.ms);
    const g: Grade = delta <= ring.window / 3 ? 'perfect' : delta <= ring.window ? 'good' : 'miss';
    resolver.current(g);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const hurtFoe = (n: number, label: string) => {
    hpRef.current.foe = Math.max(0, hpRef.current.foe - n);
    setFoeHp(hpRef.current.foe);
    flash('foe', `-${n}`, '#fbbf24');
    setLog(label);
    return hpRef.current.foe <= 0;
  };

  const win = () => {
    setPhase('won');
    music.sting('victory');
  };

  const enemyTurn = async () => {
    const m = move;
    setMoveIx((i) => i + 1);
    if (m.kind === 'charge') {
      setLog(`${stop.name} is charging. Next hit is BIG: watch the ring.`);
      setPhase('player');
      return;
    }
    const hits = m.kind === 'multi' ? (m.hits ?? 1) : 1;
    for (let h = 0; h < hits; h++) {
      setLog(m.kind === 'big' ? 'BIG HIT! Tap when the red ring meets you!' : `${stop.name} attacks. Tap to guard!`);
      const big = m.kind === 'big';
      const g = await runRing('hero', big ? BIG_MS : GUARD_MS, big ? me.guard / 2 : me.guard);
      let dmg = m.dmg;
      if (g === 'perfect') dmg = big ? Math.round(dmg * 0.25) : 0;
      else if (g === 'good') dmg = Math.round(dmg * 0.5);
      const absorbed = Math.min(hpRef.current.shield, dmg);
      hpRef.current.shield -= absorbed;
      setShield(hpRef.current.shield);
      dmg -= absorbed;
      hpRef.current.hero = Math.max(0, hpRef.current.hero - dmg);
      setHeroHp(hpRef.current.hero);
      flash('hero', g === 'perfect' && dmg === 0 ? 'BLOCK!' : `-${dmg}`, g === 'perfect' ? '#34d399' : g === 'good' ? '#fde68a' : '#f87171');
      if (hpRef.current.hero <= 0) {
        setLog('The Fog took the day, not you.');
        setPhase('lost');
        return;
      }
      await new Promise((r) => setTimeout(r, 350));
    }
    setLog('Your turn.');
    setPhase('player');
  };

  const strike = async () => {
    setLog('Tap when the gold ring meets the target!');
    const g = await runRing('foe', STRIKE_MS, STRIKE_WINDOW);
    setAct((a) => a + 1);
    const mult = g === 'perfect' ? 1.5 : g === 'good' ? 1 : 0.5;
    const n = Math.max(1, Math.round(me.dmg * mult));
    const dead = hurtFoe(n, g === 'perfect' ? `PERFECT! ${n} damage.` : g === 'good' ? `Good hit: ${n}.` : `Missed the timing: only ${n}.`);
    await new Promise((r) => setTimeout(r, 500));
    if (dead) win();
    else enemyTurn();
  };

  const heal = () => {
    setHealUsed(true);
    const n = Math.round(me.hp * 0.3);
    hpRef.current.hero = Math.min(me.hp, hpRef.current.hero + n);
    setHeroHp(hpRef.current.hero);
    setPop({ who: 'hero', text: `+${n}`, color: '#34d399', key: Date.now() });
    setLog('Ember warms you up.');
    setPhase('ring');
    setTimeout(enemyTurn, 600);
  };

  const emberStrike = () => {
    setEmberUsed(true);
    const dead = hurtFoe(8 + Math.floor(me.dmg / 2), 'Ember throws itself at the enemy!');
    setPhase('ring');
    setTimeout(() => (dead ? win() : enemyTurn()), 600);
  };

  const pct = (a: number, b: number) => `${Math.max(0, (a / b) * 100)}%`;
  const boss = stop.kind === 'boss';
  const finalBlow = boss && stop.blow && stop.blow.n === stop.blow.of;

  return (
    <div className="fixed inset-0 z-50 flex select-none flex-col bg-ink-950" onPointerDown={phase === 'ring' ? tap : undefined}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <p className="font-pixel text-[10px] text-slate-400">
            {dark ? 'SCOUTING IN THE DARK' : boss ? (finalBlow ? 'FINAL BLOW' : `BOSS · BLOW ${stop.blow?.n}/${stop.blow?.of}`) : stop.kind === 'elite' ? 'ELITE' : 'ROAD FIGHT'}
          </p>
          {phase !== 'ring' && (
            <button onClick={onClose} className="px-2 py-1 text-xs text-slate-500">
              Leave
            </button>
          )}
        </div>

        {/* enemy */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between">
            <p className="font-pixel text-xs text-red-300">{stop.name}</p>
            <p className="font-mono text-xs text-slate-400">
              {foeHp}/{foe.hp}
            </p>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-ink-700">
            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: pct(foeHp, foe.hp) }} />
          </div>
          {phase !== 'won' && (
            <p className={`mt-2 inline-block rounded-md px-2 py-1 font-pixel text-[9px] ${move.kind === 'big' ? 'bg-red-500/20 text-red-300' : 'bg-ink-800 text-slate-300'}`}>
              NEXT: {intentText(move)}
            </p>
          )}
        </div>

        <div className="relative mt-2 flex flex-1 items-center justify-between">
          <div className={`relative ${shake === 'hero' ? 'animate-shake' : ''}`}>
            <Hero gear={gear} classId={state.profile.classId} size={120} action={act} />
            {ring?.who === 'hero' && <RingView ring={ring} color="#f87171" />}
            {pop?.who === 'hero' && (
              <span key={pop.key} className="absolute -top-2 left-1/2 -translate-x-1/2 animate-hit font-pixel text-sm" style={{ color: pop.color }}>
                {pop.text}
              </span>
            )}
            <div className="absolute -bottom-2 -left-2">
              <Ember size={34} />
            </div>
          </div>
          <div className={`relative ${shake === 'foe' ? 'animate-shake' : ''} ${phase === 'won' ? 'opacity-30 grayscale transition-all duration-700' : ''}`}>
            <Foe sprite={stop.sprite} size={boss ? 128 : 104} gear={gear} classId={state.profile.classId} />
            {ring?.who === 'foe' && <RingView ring={ring} color="#fbbf24" />}
            {pop?.who === 'foe' && (
              <span key={pop.key} className="absolute -top-2 left-1/2 -translate-x-1/2 animate-hit font-pixel text-sm" style={{ color: pop.color }}>
                {pop.text}
              </span>
            )}
          </div>
        </div>

        {/* you */}
        <div>
          <div className="flex items-baseline justify-between">
            <p className="font-pixel text-xs text-gold-300">You</p>
            <p className="font-mono text-xs text-slate-400">
              {heroHp}/{me.hp}
              {shield > 0 ? ` · shield ${shield}` : ''}
            </p>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-ink-700">
            <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: pct(heroHp, me.hp) }} />
          </div>
        </div>

        <p className="mt-4 min-h-[44px] text-sm leading-snug text-slate-200">{log}</p>

        {phase === 'intro' && (
          <div className="mt-2 space-y-3">
            <div className="rounded-xl bg-ink-800 p-3 text-sm leading-relaxed text-slate-300">
              <p>
                <b className="text-gold-300">Your turn:</b> press Strike, then tap anywhere when the gold ring meets the circle.
              </p>
              <p className="mt-1">
                <b className="text-red-300">Their turn:</b> tap when the red ring meets you to block.
              </p>
              <p className="mt-1 text-slate-400">
                Your damage, HP and guard come from your training. {dark ? 'In the dark it is much stronger than in your workout. Win and you get an extra shield for the real fight.' : ''}
              </p>
            </div>
            <button onClick={() => setPhase('player')} className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]">
              Fight
            </button>
          </div>
        )}

        {phase === 'player' && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button onClick={strike} className="col-span-3 flex items-center justify-center gap-2 rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]">
              <Swords size={16} /> Strike · {me.dmg}
            </button>
            <button
              onClick={heal}
              disabled={healUsed}
              className="col-span-3 flex items-center justify-center gap-2 rounded-2xl bg-ink-800 py-3 text-sm text-slate-200 disabled:opacity-40"
            >
              <Heart size={15} /> Ember heal {healUsed ? '(used)' : `+${Math.round(me.hp * 0.3)}`}
            </button>
            {me.emberStrike && (
              <button
                onClick={emberStrike}
                disabled={emberUsed}
                className="col-span-3 flex items-center justify-center gap-2 rounded-2xl bg-ink-800 py-3 text-sm text-orange-300 disabled:opacity-40"
              >
                <Flame size={15} /> Ember strike {emberUsed ? '(used)' : ''}
              </button>
            )}
          </div>
        )}

        {phase === 'ring' && (
          <div className="mt-2 grid place-items-center rounded-2xl border-2 border-dashed border-ink-600 py-4 font-pixel text-[10px] text-slate-400">
            {ring ? (ring.who === 'foe' ? 'TAP ON THE GOLD RING' : <span className="flex items-center gap-2"><Shield size={14} /> TAP TO GUARD</span>) : '...'}
          </div>
        )}

        {phase === 'won' && (
          <div className="mt-2 space-y-3 text-center">
            <p className="flex items-center justify-center gap-2 font-pixel text-xs text-gold-300">
              <Sparkles size={16} />
              {dark ? 'Scouted!' : boss ? (finalBlow ? `${stop.name} falls!` : 'A clean blow!') : 'Stop cleared'}
            </p>
            <p className="text-sm text-slate-300">
              {dark
                ? `You beat ${stop.name} in the dark, and Ember learned its moves. You get one extra shield when you fight it in your next workout.`
                : boss
                  ? finalBlow
                    ? 'The chapter is yours. The Fog pulls back from the whole valley.'
                    : `${stop.name} staggers and flees up the road.`
                  : 'The road ahead waits for your next workout.'}
            </p>
            <button onClick={onWin} className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]">
              Back to the map
            </button>
          </div>
        )}

        {phase === 'lost' && (
          <div className="mt-2 space-y-2 text-center">
            <p className="text-sm text-slate-400">Nothing lost. Try again whenever you want.</p>
            <button
              onClick={() => {
                hpRef.current = { hero: me.hp, foe: foe.hp, shield: me.shield };
                setHeroHp(me.hp);
                setFoeHp(foe.hp);
                setShield(me.shield);
                setMoveIx(0);
                setHealUsed(false);
                setEmberUsed(false);
                setLog(stop.line ?? `${stop.name} blocks the road.`);
                setPhase('player');
              }}
              className="w-full rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309]"
            >
              Try again
            </button>
            <button onClick={onClose} className="w-full py-3 text-sm text-slate-400">
              Back to the map
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** A ring closing on its target circle. It meets the circle exactly at ring.ms. */
export function RingView({ ring, color }: { ring: Ring; color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      <div className="absolute h-20 w-20 rounded-full border-2 border-white/50" />
      <div
        key={ring.key}
        className="absolute h-20 w-20 rounded-full border-4"
        style={{ borderColor: color, animation: `ringclose ${ring.ms * (1 + OVERSHOOT)}ms linear forwards` }}
      />
    </div>
  );
}
