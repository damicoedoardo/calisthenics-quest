'use client';

import { useEffect, useState } from 'react';
import { Sprite } from './Sprite';
import { Ember } from './Characters';
import { Hero } from './Hero';
import { warmRunSheets } from '@/game/sheets';
import { gearOf, type GameState } from '@/lib/game';
import { FLAME_AT, ZONES, nextGrowth, powerOf, zoneStatus, type Zone } from '@/lib/fog';
import { STATS, pointsFree } from '@/lib/stats';
import { STAT_ICON } from './StatPoints';
import { FogGearCard } from './FogGearCard';
import { WorldPicker } from './WorldPicker';
import { useLand } from './useLand';
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

  const land = useLand();
  const [view, setView] = useState<'worlds' | 'gear' | 'power'>('worlds');
  const intro = 'Dungeon runs between workouts. Find gear down there; training lets you wear it, makes you stronger and opens the road.';
  const warm = power.fresh ? 'Warmed up: you trained in the last two days, so runs start with a free skill.' : 'Train, and for two days your runs start with a free skill.';
  const rest = power.rested
    ? `Rested: ${power.flameName || 'your flame'} has had air, so runs today start with one more free skill.`
    : 'Rest days count too: after a full day off, or a minute by the fire, runs start with one more free skill.';
  const row = ({ icon, name, from, value, hint }: (typeof rows)[number], tile: boolean) => (
    <li key={name} className={`flex gap-3 ${tile ? 'items-center rounded-xl bg-ink-900 px-2.5 py-1' : 'items-start'}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gold-300 ${tile ? 'bg-ink-800' : 'bg-ink-900'}`}>
        <Sprite id="skillIcon" opts={{ name: icon }} size={28} label="" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2 text-sm">
          <span className="text-slate-100">
            {name} <span className="text-[11px] text-slate-500">· {from}</span>
          </span>
          <span className="font-mono text-xs text-slate-200">{value}</span>
        </p>
        {hint && <p className={`mt-0.5 text-[11px] text-sky-300 ${tile ? 'leading-tight' : ''}`}>{hint}</p>}
      </div>
    </li>
  );

  // Sideways, one screen: a bar with you, your flame and three views, and under it the worlds
  // (the picker as big as the screen allows), your gear, or your power.
  if (land) {
    const VIEWS = [
      { id: 'worlds', label: 'Worlds', dot: false },
      { id: 'gear', label: 'Gear', dot: false },
      { id: 'power', label: 'Power', dot: pointsFree(state) > 0 },
    ] as const;
    return (
      <div className="flex h-full flex-col gap-3">
        <section className="flex shrink-0 items-center gap-3 rounded-2xl bg-ink-800 py-1.5 pl-2 pr-1.5">
          <Hero gear={gearOf(state)} classId={state.profile.classId} size={40} />
          <Ember size={stage.id === 'spark' ? 44 : 30} stage={stage.id} mood={flameMood(state, now)} />
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[10px] text-gold-300">The Fog</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{intro}</p>
          </div>
          <div role="tablist" aria-label="The Fog" className="flex shrink-0 gap-1 rounded-xl bg-ink-900 p-1">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 min-[800px]:px-4 ${view === v.id ? 'bg-gold-400 text-ink-950' : 'text-slate-300'}`}
              >
                {v.label}
                {v.dot && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gold-300 ring-2 ring-ink-900" />}
              </button>
            ))}
          </div>
        </section>

        <div role="tabpanel" className="min-h-0 flex-1">
          {view === 'worlds' ? (
            <WorldPicker state={state} onPlay={onPlay} land />
          ) : view === 'gear' ? (
            <FogGearCard state={state} update={update} land />
          ) : (
            <section className="flex h-full flex-col rounded-2xl bg-ink-800 p-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-pixel text-[10px] text-slate-400">Your power, from your training</p>
                <p className={`text-[11px] ${pointsFree(state) ? 'font-semibold text-gold-300' : 'text-sky-300'}`}>{nextGrowth(state)}</p>
              </div>
              {/* The six powers two by three, sharing the height; on the shortest phones the panel scrolls. */}
              <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
                <ul className="grid grid-cols-2 gap-1.5 [@media(min-height:371px)]:flex-1 [@media(min-height:371px)]:auto-rows-fr">{rows.map((r) => row(r, true))}</ul>
                <div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
                  <p className={`rounded-lg px-3 py-1.5 text-[11px] leading-snug ${power.fresh ? 'bg-emerald-950/60 text-emerald-300' : 'bg-ink-900 text-slate-400'}`}>{warm}</p>
                  <p className={`rounded-lg px-3 py-1.5 text-[11px] leading-snug ${power.rested ? 'bg-orange-950/50 text-orange-200' : 'bg-ink-900 text-slate-400'}`}>{rest}</p>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-ink-800 p-4 pixel-border">
        <div className="flex items-center gap-3">
          <Hero gear={gearOf(state)} classId={state.profile.classId} size={72} variant={heroVariant(state)} />
          <Ember size={stage.id === 'spark' ? 64 : 44} stage={stage.id} mood={flameMood(state, now)} />
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-xs text-gold-300">The Fog</p>
            <p className="mt-1 text-xs text-slate-400">{intro}</p>
          </div>
        </div>
      </section>

      <WorldPicker state={state} onPlay={onPlay} />

      <FogGearCard state={state} update={update} />

      <section className="rounded-2xl bg-ink-800 p-4">
        <p className="font-pixel text-[10px] text-slate-400">Your power, from your training</p>
        <p className={`mt-1 text-[11px] ${pointsFree(state) ? 'font-semibold text-gold-300' : 'text-sky-300'}`}>{nextGrowth(state)}</p>
        <ul className="mt-3 space-y-2.5">{rows.map((r) => row(r, false))}</ul>
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs ${power.fresh ? 'bg-emerald-950/60 text-emerald-300' : 'bg-ink-900 text-slate-400'}`}>{warm}</p>
        <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${power.rested ? 'bg-orange-950/50 text-orange-200' : 'bg-ink-900 text-slate-400'}`}>{rest}</p>
      </section>
    </div>
  );
}
