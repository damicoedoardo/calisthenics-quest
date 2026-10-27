'use client';

import { useEffect } from 'react';
import { Check, Lock, Play } from 'lucide-react';
import { Sprite } from './Sprite';
import { Ember } from './Characters';
import { Hero } from './Hero';
import { isDungeon } from './FogRun';
import { warmRunSheets } from '@/game/sheets';
import { gearOf, type GameState } from '@/lib/game';
import { FLAME_AT, ZONES, nextGrowth, powerOf, zoneStatus, type Zone } from '@/lib/fog';
import { flameMood } from '@/story/daily';
import { FLAME_STAGES, flameStage } from '@/story/flame';

interface Props {
  state: GameState;
  onPlay: (zone: Zone) => void;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The game between workouts: your power from training, and the zones of the Fog. */
/** A pale zone color (the Summit's) needs a dark icon on it. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160;
}

/**
 * While the Play tab sits idle, get the newest open zone's run ready: download and load the game
 * code and draw its sprite sheets (both are cached), so tapping Play goes straight to the run.
 */
function useWarmRun(state: GameState) {
  const zone = [...ZONES].reverse().find((z) => zoneStatus(state, z).state !== 'locked');
  const id = zone?.id;
  useEffect(() => {
    if (!zone) return;
    // Give the tab a moment to settle first.
    let stop = () => {};
    const t = window.setTimeout(() => {
      // Both kinds of run: they share Phaser, so the second costs little, and either can then
      // start offline.
      const loads: (() => Promise<unknown>)[] = [() => import('@/game/dungeon/scene'), () => import('@/game/run')];
      if (!isDungeon(zone)) loads.reverse();
      void loads[0]()
        .then(loads[1])
        .then(() => import('@/game/calm'))
        .catch(() => {});
      stop = warmRunSheets(state, zone);
    }, 600);
    return () => {
      window.clearTimeout(t);
      stop();
    };
    // Once per zone: the sheets for a new look or gear are drawn when the run starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}

export function PlayTab({ state, onPlay }: Props) {
  useWarmRun(state);
  const now = new Date();
  const power = powerOf(state, now);
  const workouts = state.sessions.length;
  const nextFlame = FLAME_AT.find((n) => workouts < n);
  const stage = flameStage(workouts);
  const bonfire = FLAME_STAGES.find((s) => s.id === 'bonfire')!.at,
    fairy = FLAME_STAGES.find((s) => s.id === 'fairy')!.at;
  const toGo = (n: number) => `${n - workouts} more workout${n - workouts === 1 ? '' : 's'}`;
  const rows = [
    { icon: 'power' as const, name: 'Strike', from: 'Push', value: `+${Math.round(power.strike * 100)}% damage`, hint: nextGrowth(state, 'push') },
    { icon: 'haste' as const, name: 'Reach', from: 'Pull', value: `+${Math.round(power.reach * 100)}% speed`, hint: nextGrowth(state, 'pull') },
    { icon: 'vital' as const, name: 'Hold', from: 'Core', value: `+${power.hold} HP`, hint: nextGrowth(state, 'core') },
    {
      icon: 'flame' as const,
      name: power.flameName ? `${power.flameName}'s fire` : 'Your flame',
      from: 'Workouts',
      value: `${power.flames} flame${power.flames === 1 ? '' : 's'}`,
      hint: nextFlame ? `${toGo(nextFlame)}: one more flame` : null,
    },
    {
      icon: 'nova' as const,
      name: power.fairy ? 'Fire fairy' : 'Fireballs',
      from: stage.name,
      value: power.fairy ? 'Fireballs, heals you' : power.fireballs ? 'Fireballs' : 'Not yet',
      hint: !power.fireballs ? `${toGo(bonfire)}: a bonfire that throws fireballs` : !power.fairy ? `${toGo(fairy)}: a fire fairy that heals you when you're low` : null,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-ink-800 p-4 pixel-border">
        <div className="flex items-center gap-3">
          <Hero gear={gearOf(state)} classId={state.profile.classId} size={72} />
          <Ember size={stage.id === 'spark' ? 64 : 44} stage={stage.id} mood={flameMood(state, now)} />
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-xs text-gold-300">The Fog</p>
            <p className="mt-1 text-xs text-slate-400">Short runs between workouts. Losing costs nothing. Training makes you stronger and opens the road.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-ink-800 p-4">
        <p className="font-pixel text-[10px] text-slate-400">Your power, from your training</p>
        <ul className="mt-3 space-y-2.5">
          {rows.map(({ icon, name, from, value, hint }) => (
            <li key={name} className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-900 text-gold-300">
                <Sprite id="skillIcon" opts={{ name: icon }} size={28} label="" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-slate-100">
                    {name} <span className="text-[11px] text-slate-500">· {from}</span>
                  </span>
                  <span className="font-mono text-xs text-slate-200">{value}</span>
                </p>
                {hint && <p className="mt-0.5 text-[11px] text-sky-300">{hint}</p>}
              </div>
            </li>
          ))}
        </ul>
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${power.fresh ? 'bg-emerald-950/60 text-emerald-300' : 'bg-ink-900 text-slate-400'}`}>
          {power.fresh ? 'Warmed up: you trained in the last two days, so runs start with a free skill.' : 'Train, and for two days your runs start with a free skill.'}
        </p>
        <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${power.rested ? 'bg-orange-950/50 text-orange-200' : 'bg-ink-900 text-slate-400'}`}>
          {power.rested
            ? `Rested: ${power.flameName || 'your flame'} has had air, so runs today start with one more free skill.`
            : 'Rest days count too: after a full day off, or a minute by the fire, runs start with one more free skill.'}
        </p>
      </section>

      <section className="space-y-2">
        <p className="font-pixel text-[10px] text-slate-400">The road through the Fog</p>
        {ZONES.map((z) => {
          const st = zoneStatus(state, z);
          const best = state.fog?.best[z.id];
          const open = st.state !== 'locked';
          return (
            <div key={z.id} className={`flex items-center gap-3 rounded-2xl p-3 ${open ? 'bg-ink-800' : 'bg-ink-900 opacity-80'}`}>
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-pixel text-[10px] ${isLight(z.fog) ? 'text-ink-900' : 'text-slate-200'}`}
                style={{ background: z.fog }}
              >
                {st.state === 'cleared' ? <Check size={18} /> : st.state === 'locked' ? <Lock size={16} /> : z.id + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{z.name}</p>
                <p className="text-[11px] text-slate-400">
                  {st.state === 'locked'
                    ? st.why
                    : best
                      ? best.won
                        ? `Cleared in ${clock(best.seconds)}`
                        : `Best: ${clock(best.seconds)}, level ${best.level}`
                      : `Survive the waves, then face ${z.bossName}.`}
                </p>
                {st.state === 'open' && !best && z.firstTry && <p className="mt-0.5 text-[11px] text-gold-300">{z.firstTry}</p>}
                {st.state === 'open' && !best?.won && <p className="mt-0.5 text-[11px] text-sky-300">{z.hint}</p>}
              </div>
              {open && (
                <button onClick={() => onPlay(z)} className="flex items-center gap-1.5 rounded-xl bg-gold-400 px-3 py-2 font-pixel text-[9px] text-ink-950 active:scale-95">
                  <Play size={12} className="fill-ink-950" />
                  {st.state === 'cleared' ? 'Again' : 'Play'}
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
