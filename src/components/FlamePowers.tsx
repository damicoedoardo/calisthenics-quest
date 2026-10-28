'use client';

import { Sprite } from './Sprite';
import type { GameState } from '@/lib/game';
import { FLAME_AT, powerOf } from '@/lib/fog';
import { FLAME_STAGES, flameStage } from '@/story/flame';

/** What your flame gives you in the Fog, from workouts alone: its flames, and the fireballs or the
    fire fairy once it grows. Under the champion's stats on the Hero tab. */
export function FlamePowers({ state, land = false }: { state: GameState; land?: boolean }) {
  const power = powerOf(state, new Date());
  const workouts = state.sessions.length;
  const nextFlame = FLAME_AT.find((n) => workouts < n);
  const stage = flameStage(workouts);
  const bonfire = FLAME_STAGES.find((s) => s.id === 'bonfire')!.at,
    fairy = FLAME_STAGES.find((s) => s.id === 'fairy')!.at;
  const toGo = (n: number) => `${n - workouts} more workout${n - workouts === 1 ? '' : 's'}`;
  const rows = [
    {
      icon: 'flame' as const,
      name: power.flameName ? `${power.flameName}'s fire` : 'Your flame',
      value: `${power.flames} flame${power.flames === 1 ? '' : 's'}`,
      hint: nextFlame ? `${toGo(nextFlame)}: one more flame` : null,
    },
    {
      icon: 'nova' as const,
      name: power.fairy ? 'Fire fairy' : 'Fireballs',
      value: power.fairy ? 'Fireballs, heals you' : power.fireballs ? 'Fireballs' : 'Not yet',
      hint: !power.fireballs ? `${toGo(bonfire)}: a bonfire that throws fireballs` : !power.fairy ? `${toGo(fairy)}: a fire fairy that heals you when you're low` : null,
    },
  ];
  return (
    <section className={land ? 'mt-3' : 'rounded-2xl bg-ink-800 p-4'}>
      <p className="font-pixel text-[10px] text-gold-300">Your flame · {stage.name}</p>
      <ul className={`mt-3 ${land ? 'grid grid-cols-2 gap-2' : 'space-y-2.5'}`}>
        {rows.map(({ icon, name, value, hint }) => (
          <li key={icon} className="flex items-start gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-900">
              <Sprite id="skillIcon" opts={{ name: icon }} size={28} label="" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-slate-100">{name}</span>
                <span className="font-mono text-xs text-slate-200">{value}</span>
              </p>
              {hint && <p className="mt-0.5 text-[11px] text-sky-300">{hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
