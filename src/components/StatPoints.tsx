'use client';

import { useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { STATS, buildOf, nextPoint, pointsEarned, pointsFree, statPower } from '@/lib/stats';
import { SWEAT } from '@/balance';
import { coins, freeBack, putPoint, respec, respecCost, takeBack } from '@/lib/sweat';
import { Sprite } from './Sprite';

/* The champion's stats: every workout earns points, and here they go into Health, Armor, Damage,
   Haste, Speed or Crit. Points spent since your last workout come back free; taking back the rest
   is a respec, for a sweat coin (src/lib/sweat.ts). */

export const STAT_ICON = { health: 'vital', armor: 'guard', damage: 'power', speed: 'haste', move: 'swift', crit: 'spark' } as const;

/** `land`: the Hero tab held sideways, where the card sits in the Stats part's panel. */
export function StatPoints({ state, update, land = false }: { state: GameState; update: (fn: (s: GameState) => GameState) => void; land?: boolean }) {
  const [why, setWhy] = useState(false);
  const build = buildOf(state);
  const free = pointsFree(state);
  const power = statPower(build, state.profile.classId);
  const earned = pointsEarned(state);
  const spent = Object.values(build).some((n) => (n ?? 0) > 0),
    cost = respecCost(state),
    purse = coins(state);

  return (
    <section className={land ? 'flex h-full flex-col' : 'rounded-2xl bg-ink-800 p-4'}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-pixel text-[10px] text-gold-300">Champion</h2>
        <p className={`text-xs ${free ? 'font-semibold text-gold-300' : 'text-slate-400'}`}>
          {free ? `${free} point${free === 1 ? '' : 's'} to spend` : 'Every workout earns points'}
        </p>
      </div>
      <p className={`mt-1 text-slate-400 ${land ? 'text-[11px] leading-snug' : 'text-xs'}`}>Spent since your last workout: free to take back. Start over: {cost || 1} sweat coin{(cost || 1) === 1 ? '' : 's'}.</p>

      {/* Sideways the six stats are six tiles, two by three, that share the panel's height. */}
      <ul className={land ? 'mt-3 grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2' : 'mt-3 space-y-2'}>
        {STATS.map((st) => {
          const n = build[st.id] ?? 0;
          const minus = (
            <button
              onClick={() => update((s) => takeBack(s, st.id))}
              disabled={n === 0 || !freeBack(state, st.id)}
              aria-label={`Take a point out of ${st.name}`}
              className={`grid place-items-center rounded-lg bg-ink-700 active:scale-95 disabled:opacity-30 ${land ? 'h-8 w-8 shrink-0' : 'h-9 w-9'}`}
            >
              <Minus size={14} />
            </button>
          );
          const plus = (
            <button
              onClick={() => update((s) => putPoint(s, st.id))}
              disabled={free === 0}
              aria-label={`Put a point into ${st.name} (${nextPoint(build, st.id, state.profile.classId)})`}
              className={`grid place-items-center rounded-lg bg-gold-400 text-ink-950 active:scale-95 disabled:bg-ink-700 disabled:text-slate-500 ${land ? 'h-8 w-8 shrink-0' : 'h-9 w-9'}`}
            >
              <Plus size={14} />
            </button>
          );
          const name = (
            <p className="flex items-baseline gap-2 text-sm font-semibold">
              {st.name}
              <span className="font-mono text-xs font-normal text-slate-400">{n}</span>
            </p>
          );
          return (
            <li key={st.id} className={`flex items-center rounded-xl bg-ink-900 ${land ? 'gap-2 px-2.5 py-2' : 'gap-3 p-2.5'}`}>
              <Sprite id="skillIcon" opts={{ name: STAT_ICON[st.id] }} size={28} label="" className="shrink-0" />
              <div className="min-w-0 flex-1">
                {name}
                <p className="text-[11px] text-slate-400">{st.show(power[st.id])}</p>
              </div>
              {minus}
              {plus}
            </li>
          );
        })}
      </ul>

      <div className={`flex items-center justify-between text-xs ${land ? 'mt-2' : 'mt-3'}`}>
        <button onClick={() => setWhy(!why)} className="text-slate-400 underline-offset-2 hover:underline">
          {earned.total} points earned {why ? '' : '(how?)'}
        </button>
        <span className="flex items-center gap-1 font-mono text-slate-300" aria-label={`${purse} sweat coins`}>
          <Sprite id="uiIcon" opts={{ name: 'coin' }} size={12} label="" /> {purse}
        </span>
        {spent && (
          <button onClick={() => update(respec)} disabled={purse < cost} className="flex items-center gap-1 text-slate-400 disabled:opacity-40">
            <RotateCcw size={12} /> {cost ? `Start over · ${cost} sweat coin` : 'Take all back'}
          </button>
        )}
      </div>
      {why && (
        <ul className="mt-2 space-y-1 rounded-xl bg-ink-900 p-3 text-xs text-slate-300">
          {earned.lines.map((l) => (
            <li key={l.label} className="flex justify-between">
              <span>{l.label}</span>
              <span className="font-mono">+{l.points}</span>
            </li>
          ))}
          <li className="pt-1 text-[11px] text-slate-500">A full workout gives 3, a short one 1, a week at your goal 2 more, and beating last time 1 more. Each point in the same stat gives a little less than the one before.</li>
          <li className="text-[11px] text-slate-500">
            Every workout also earns {SWEAT.perWorkout} sweat coin: {SWEAT.respec} starts your points over, {SWEAT.classChange} changes your class (the first change is free).
          </li>
        </ul>
      )}
    </section>
  );
}
