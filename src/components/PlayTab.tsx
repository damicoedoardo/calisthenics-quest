'use client';

import { useEffect } from 'react';
import { Sprite } from './Sprite';
import { Ember } from './Characters';
import { Hero } from './Hero';
import { warmRunSheets } from '@/game/sheets';
import { gearOf, type GameState } from '@/lib/game';
import { EDGE, FLAME_AT, ZONES, edgeFor, nextGrowth, powerOf, workoutsPastHearts, zoneStatus, type Zone } from '@/lib/fog';
import { chapterStart } from '@/story/engine';
import { STATS, pointsFree } from '@/lib/stats';
import { STAT_ICON } from './StatPoints';
import { FogGearCard } from './FogGearCard';
import { WorldPicker } from './WorldPicker';
import { flameMood } from '@/story/daily';
import { FLAME_STAGES, flameStage, heroVariant } from '@/story/flame';

interface Props {
  state: GameState;
  onPlay: (zone: Zone) => void;
  update: (fn: (s: GameState) => GameState) => void;
}

/** The game between workouts: your power from training, and the zones of the Fog. */

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
      // The run's code, so a run can then start offline.
      void import('@/game/dungeon/scene')
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

export function PlayTab({ state, onPlay, update }: Props) {
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
    ...STATS.map((st) => ({ icon: STAT_ICON[st.id], name: st.name, from: 'Points', value: st.show(power[st.id]), hint: null })),
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
    // Sideways: the worlds on the left, your gear and power on the right.
    <div className="space-y-4 land:grid land:grid-cols-2 land:items-start land:gap-4 land:space-y-0">
      <div className="space-y-4">
      <section className="rounded-2xl bg-ink-800 p-4 pixel-border">
        <div className="flex items-center gap-3">
          <Hero gear={gearOf(state)} classId={state.profile.classId} size={72} variant={heroVariant(state)} />
          <Ember size={stage.id === 'spark' ? 64 : 44} stage={stage.id} mood={flameMood(state, now)} />
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-xs text-gold-300">The Fog</p>
            <p className="mt-1 text-xs text-slate-400">Dungeon runs between workouts. Find gear down there; training lets you wear it, makes you stronger and opens the road.</p>
          </div>
        </div>
      </section>

      <WorldPicker state={state} onPlay={onPlay} />
      </div>

      <div className="space-y-4">
      <FogGearCard state={state} update={update} />

      <section className="rounded-2xl bg-ink-800 p-4">
        <p className="font-pixel text-[10px] text-slate-400">Your power, from your training</p>
        <p className={`mt-1 text-[11px] ${pointsFree(state) ? 'font-semibold text-gold-300' : 'text-sky-300'}`}>{nextGrowth(state)}</p>
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
        <BossEdge state={state} />
      </section>
      </div>
    </div>
  );
}

/** The boss you're up against: how close it is to running out of hearts, and what that gives you. */
function BossEdge({ state }: { state: GameState }) {
  const zone = ZONES[state.fog?.cleared ?? 0];
  if (!zone || zone.boss === 'summit' || zoneStatus(state, zone).state !== 'open') return null;
  const past = workoutsPastHearts(state, zone);
  if (past === null) {
    const left = chapterStart(zone.chapter + 1) - state.sessions.length;
    return (
      <p className="mt-2 rounded-lg bg-ink-900 px-3 py-2 text-xs text-slate-400">
        {`${zone.bossName} has ${left} heart${left === 1 ? '' : 's'} left. Each workout takes one. With none left it fights weaker, and every workout after that starts your runs with a free skill.`}
      </p>
    );
  }
  const { picks } = edgeFor(state, zone);
  return (
    <p className="mt-2 rounded-lg bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
      {`${zone.bossName} has no hearts left: it fights with ${Math.round((1 - EDGE.bossHp) * 100)}% less HP. `}
      {picks ? `Your runs start with ${picks} more free skill${picks === 1 ? '' : 's'}, one for each workout since${picks === EDGE.picks ? ' (that is the most)' : ''}.` : 'Each workout from now on starts your runs with one more free skill.'}
    </p>
  );
}
