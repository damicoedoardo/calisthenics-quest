'use client';

import { useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { STATS, buildOf, nextPoint, pointsEarned, pointsFree, refundPoint, resetBuild, spendPoint, statPower } from '@/lib/stats';
import { Sprite } from './Sprite';

/* The champion's stats: every workout earns points, and here they go into Health, Damage, Reach or
   Speed. Taking them back is free, any time. */

export const STAT_ICON = { health: 'vital', damage: 'power', reach: 'magnet', speed: 'haste' } as const;

export function StatPoints({ state, update }: { state: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const [why, setWhy] = useState(false);
  const build = buildOf(state);
  const free = pointsFree(state);
  const power = statPower(build, state.profile.classId);
  const earned = pointsEarned(state);
  const spent = Object.values(build).some((n) => (n ?? 0) > 0);

  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-pixel text-[10px] text-gold-300">Champion</h2>
        <p className={`text-xs ${free ? 'font-semibold text-gold-300' : 'text-slate-400'}`}>
          {free ? `${free} point${free === 1 ? '' : 's'} to spend` : 'Every workout earns points'}
        </p>
      </div>
      <p className="mt-1 text-xs text-slate-400">Your training makes your champion stronger in the Fog. Put your points where you like; you can take them back any time.</p>

      <ul className="mt-3 space-y-2">
        {STATS.map((st) => {
          const n = build[st.id] ?? 0;
          return (
            <li key={st.id} className="flex items-center gap-3 rounded-xl bg-ink-900 p-2.5">
              <Sprite id="skillIcon" opts={{ name: STAT_ICON[st.id] }} size={28} label="" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-sm font-semibold">
                  {st.name}
                  <span className="font-mono text-xs font-normal text-slate-400">{n}</span>
                </p>
                <p className="text-[11px] text-slate-400">{st.show(power[st.id])}</p>
              </div>
              <button
                onClick={() => update((s) => refundPoint(s, st.id))}
                disabled={n === 0}
                aria-label={`Take a point out of ${st.name}`}
                className="grid h-9 w-9 place-items-center rounded-lg bg-ink-700 active:scale-95 disabled:opacity-30"
              >
                <Minus size={14} />
              </button>
              <button
                onClick={() => update((s) => spendPoint(s, st.id))}
                disabled={free === 0}
                aria-label={`Put a point into ${st.name} (${nextPoint(build, st.id, state.profile.classId)})`}
                className="grid h-9 w-9 place-items-center rounded-lg bg-gold-400 text-ink-950 active:scale-95 disabled:bg-ink-700 disabled:text-slate-500"
              >
                <Plus size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between text-xs">
        <button onClick={() => setWhy(!why)} className="text-slate-400 underline-offset-2 hover:underline">
          {earned.total} points earned {why ? '' : '(how?)'}
        </button>
        {spent && (
          <button onClick={() => update(resetBuild)} className="flex items-center gap-1 text-slate-400">
            <RotateCcw size={12} /> Take all back
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
        </ul>
      )}
    </section>
  );
}
