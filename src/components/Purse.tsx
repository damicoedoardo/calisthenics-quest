'use client';

import type { ReactNode } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Sprite } from './Sprite';
import { useLook } from './Look';
import { useModal } from './useModal';
import { STAT_ICON } from './StatPoints';
import { gearOf, levelInfo, totalXp, type GameState } from '@/lib/game';
import { LOOT_IDS, nextLoot, purseOf, spendable, workoutsToLevel, type LootId } from '@/lib/loot';
import { STATS } from '@/lib/stats';
import { EMBERS, MAT_IDS, MATS, MAX_PLUS, POINTS, SWEAT } from '@/balance';
import { matsOf } from '@/lib/forge';

/* What training gives, drawn the same everywhere: a pixel icon per kind of loot (XP, stat points,
   embers, sweat coins, co-op materials). The purse on the Hero tab shows what you have, and tapping
   it opens the guide: one picture of the loop
   (a workout throws out every kind) and, for each, where it comes from and where it goes. Few words. */

/** Where a loot's "go" button leads: a part of the Hero tab. */
export type LootGo = 'gear' | 'stats' | 'class';

const ICON: Record<LootId, 'xp' | 'point' | 'flame' | 'coin' | 'mat'> = { xp: 'xp', points: 'point', embers: 'flame', coins: 'coin', mats: 'mat' };
const NAME: Record<LootId, string> = { xp: 'Level', points: 'Stat points', embers: 'Embers', coins: 'Sweat coins', mats: 'Materials' };
const TEXT: Record<LootId, string> = { xp: 'text-gold-300', points: 'text-emerald-300', embers: 'text-orange-300', coins: 'text-yellow-200', mats: 'text-purple-300' };

export function LootIcon({ id, size = 16, className = '' }: { id: LootId; size?: number; className?: string }) {
  return <Sprite id="uiIcon" opts={{ name: ICON[id] }} size={size} label="" className={`shrink-0 ${className}`} />;
}

/** What you have, one tile per kind, with a dot where something waits to be spent. Tap: the guide. */
export function Purse({ state, onOpen, land = false }: { state: GameState; onOpen: (id: LootId) => void; land?: boolean }) {
  const have = purseOf(state),
    ready = spendable(state);
  const ids = LOOT_IDS.filter((id) => id !== 'xp');
  return (
    <div className={`grid grid-cols-4 gap-1 ${land ? '' : 'w-full'}`}>
      {ids.map((id) => (
        <button
          key={id}
          onClick={() => onOpen(id)}
          aria-label={`${NAME[id]}: ${have[id]}. What they are`}
          className={`relative flex items-center justify-center gap-1.5 rounded-lg bg-ink-900/70 active:scale-95 ${land ? 'px-2 py-1.5' : 'py-2'} ${have[id] ? '' : 'opacity-50'}`}
        >
          <LootIcon id={id} size={18} />
          <span className={`font-pixel text-[9px] ${TEXT[id]}`}>{have[id]}</span>
          {ready[id] && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gold-300 motion-safe:animate-pulse" />}
        </button>
      ))}
    </div>
  );
}

/** One step of a loot's road: an icon and a small word under it. */
function Step({ icon, label, n }: { icon: ReactNode; label: string; n?: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-0.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-lg bg-ink-950">
        {icon}
        {n && <span className="absolute -bottom-1 -right-1 rounded bg-ink-700 px-0.5 font-pixel text-[6px] text-slate-200">{n}</span>}
      </span>
      <span className="w-14 truncate text-center text-[9px] text-slate-400">{label}</span>
    </span>
  );
}

const ui = (name: 'tabTrain' | 'tabFriends' | 'tabHero' | 'lock', size = 20) => <Sprite id="uiIcon" opts={{ name }} size={size} label="" />;
const arrow = <ChevronRight size={14} className="mb-4 shrink-0 text-slate-600" aria-hidden />;

/** The guide: the loop as a picture, then each loot's road, from where to what for. `focus` is lit. */
export function LootGuide({ state, focus, now, onGo, onClose }: { state: GameState; focus: LootId; now: Date; onGo?: (to: LootGo) => void; onClose: () => void }) {
  const box = useModal<HTMLDivElement>(onClose);
  const look = useLook();
  const have = purseOf(state);
  const mats = matsOf(state);
  const lvl = levelInfo(totalXp(state));
  const toLevel = workoutsToLevel(state, now);
  const loot = nextLoot(state, 'normal', now);
  const stat = (i: number) => <Sprite id="skillIcon" opts={{ name: STAT_ICON[STATS[i].id] }} size={20} label="" />;

  // Each loot: where it comes from, what it is for, and which part of the Hero tab spends it.
  const ROADS: Record<LootId, { from: ReactNode; to: ReactNode; go?: LootGo }> = {
    xp: {
      from: <Step icon={ui('tabTrain')} label="Workout" n={`+${loot.xp}`} />,
      to: (
        <>
          <Step icon={<span className="font-pixel text-[8px] text-gold-300">Lv{lvl.level + 1}</span>} label={`in ${toLevel} workout${toLevel === 1 ? '' : 's'}`} />
          {arrow}
          <Step icon={ui('lock')} label="Better items" />
        </>
      ),
      go: 'gear',
    },
    points: {
      from: (
        <>
          <Step icon={ui('tabTrain')} label="Workout" n={`+${POINTS.full}`} />
          <Step icon={<span className="font-pixel text-[8px] text-gold-300">3/3</span>} label="Week done" n={`+${POINTS.week}`} />
        </>
      ),
      to: (
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="grid h-9 w-7 place-items-center rounded-lg bg-ink-950">
              {stat(i)}
            </span>
          ))}
        </span>
      ),
      go: 'stats',
    },
    embers: {
      from: <Step icon={ui('tabTrain')} label="Workout" n={`+${EMBERS.full}`} />,
      to: <Step icon={<Sprite id="mira" size={32} label="" />} label={`Forge +1..+${MAX_PLUS}`} />,
      go: 'gear',
    },
    coins: {
      from: <Step icon={ui('tabTrain')} label="Workout" n={`+${SWEAT.perWorkout}`} />,
      to: (
        <>
          <Step icon={stat(0)} label="Redo points" n={`${SWEAT.respec}`} />
          <Step icon={ui('tabHero')} label="New class" n={`${SWEAT.classChange}`} />
        </>
      ),
      go: 'class',
    },
    mats: {
      from: <Step icon={ui('tabFriends')} label="With friends" />,
      to: <Step icon={<Sprite id="mira" size={32} label="" />} label="Forge +6 up" />,
      go: 'gear',
    },
  };

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="What training gives" className="safe-top safe-bottom fixed inset-0 z-50 overflow-y-auto bg-ink-950/95 outline-none backdrop-blur-sm">
      <div className="mx-auto max-w-md px-4 pb-6 land:max-w-3xl land:pl-[max(env(safe-area-inset-left),1rem)] land:pr-[max(env(safe-area-inset-right),1rem)]">
        <div className="flex items-center justify-between py-2">
          <h2 className="font-pixel text-[10px] text-gold-300">Train. Get loot. Grow.</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 active:scale-95">
            <X size={16} />
          </button>
        </div>

        {/* The loop as a picture: you training, and every kind of loot thrown up out of you. */}
        <section className="relative mt-1 flex h-44 items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 land:h-36" aria-hidden>
          <div className="absolute inset-x-0 top-4 flex justify-center gap-6">
            {LOOT_IDS.filter((id) => id !== 'mats').map((id, i) => (
              <span key={id} className={`motion-safe:animate-loot ${i === 1 || i === 2 ? '' : 'mt-5'}`} style={{ animationDelay: `${0.2 + i * 0.3}s` }}>
                <span className="block motion-safe:animate-float" style={{ animationDelay: `${i * 0.3}s` }}>
                  <LootIcon id={id} size={32} />
                </span>
              </span>
            ))}
          </div>
          <Sprite id="exercise" opts={{ exercise: 'pushup', gear: gearOf(state), classId: state.profile.classId, look }} size={128} label="" className="-mb-3" />
        </section>

        <ul className="mt-3 space-y-2 land:grid land:grid-cols-2 land:gap-2 land:space-y-0">
          {LOOT_IDS.map((id) => {
            const road = ROADS[id];
            return (
              <li key={id} className={`rounded-2xl bg-ink-800 p-3 ${id === focus ? 'ring-2 ring-gold-400' : ''}`}>
                <div className="flex items-center gap-2">
                  <LootIcon id={id} size={22} />
                  <p className={`flex-1 font-pixel text-[9px] ${TEXT[id]}`}>{NAME[id]}</p>
                  <span className="font-pixel text-[10px] text-slate-200">{id === 'xp' ? `Lv ${have.xp}` : have[id]}</span>
                </div>
                <div className="mt-2 flex items-end gap-1.5">
                  {road.from}
                  {arrow}
                  <LootIcon id={id} size={20} className="mb-5" />
                  {arrow}
                  {road.to}
                  {onGo && road.go && (
                    <button onClick={() => onGo(road.go!)} aria-label={`Go to ${road.go}`} className="mb-4 ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold-400 text-ink-950 active:scale-95">
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
                {/* The four materials, each with its own color and count. */}
                {id === 'mats' && (
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {MAT_IDS.map((m) => (
                      <span key={m} className="flex flex-col items-center rounded-lg bg-ink-950 py-1.5">
                        <span className="h-2.5 w-2.5 rotate-45 rounded-[1px]" style={{ background: MATS[m].color }} aria-hidden />
                        <span className="mt-1 font-pixel text-[9px] text-slate-200">{mats[m] ?? 0}</span>
                        <span className="w-full truncate px-0.5 text-center text-[8px]" style={{ color: MATS[m].color }}>
                          {MATS[m].name}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
