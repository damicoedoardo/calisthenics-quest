'use client';

import { useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { warmRunSheets } from '@/game/sheets';
import type { GameState } from '@/lib/game';
import { EDGE, ZONES, edgeFor, powerOf, workoutsPastHearts, zoneStatus, type Zone } from '@/lib/fog';
import { NO_GEAR } from '@/lib/fog-gear';
import { ITEM_SLOTS, SLOT_NAME, starterKit, type Item, type ItemSlot } from '@/game/dungeon/items';
import { chapterStart } from '@/story/engine';
import { ItemTile } from './ItemCard';
import { Sprite } from './Sprite';
import { WorldPicker } from './WorldPicker';
import { useLand } from './useLand';

interface Props {
  state: GameState;
  onPlay: (zone: Zone) => void;
  /** Open Hero > Gear (the ready strip's worn items). */
  onGear: () => void;
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

/** The game between workouts: the worlds of the Fog, the story you play alone. Friends, the party and
    the Ember Road are on the Friends tab; your gear, vault and forge on the Hero tab. */
export function PlayTab({ state, onPlay, onGear }: Props) {
  useWarmRun(state);
  const land = useLand();

  if (land)
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex shrink-0 items-center gap-3">
          <Ready state={state} onGear={onGear} land />
        </div>
        <div className="min-h-0 flex-1">
          <WorldPicker state={state} onPlay={onPlay} land />
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      <WorldPicker state={state} onPlay={onPlay} />
      <Ready state={state} onGear={onGear} />
    </div>
  );
}

/** Ready for the Fog, in one strip: what you wear (tap: Hero > Gear), warmed up, rested, and the
    boss's hearts. */
function Ready({ state, onGear, land = false }: { state: GameState; onGear: () => void; land?: boolean }) {
  const power = powerOf(state, new Date());
  const worn = (state.fogGear ?? NO_GEAR).worn,
    // The plain pieces you start with, for an empty slot.
    kit: Partial<Record<ItemSlot, Item>> = starterKit(state.profile.classId);
  const tile = land ? 30 : 40;
  const chips = [
    power.fresh ? { on: 'bg-emerald-950/60 text-emerald-300', text: land ? 'Warmed up: a free skill' : 'Warmed up · +1 skill' } : { on: 'bg-ink-900 text-slate-400', text: land ? 'Train for a free skill' : 'Train · +1 skill' },
    power.rested ? { on: 'bg-orange-950/50 text-orange-200', text: land ? 'Rested: one more' : 'Rested · +1 skill' } : null,
  ].filter((c): c is { on: string; text: string } => !!c);
  return (
    <section className={land ? 'flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-ink-800 py-1.5 pl-2 pr-3' : 'rounded-2xl bg-ink-800 p-4'}>
      <button onClick={onGear} aria-label="Your gear, on the Hero tab" className={`flex shrink-0 items-center gap-2 ${land ? '' : 'w-full'}`}>
        {ITEM_SLOTS.map((slot) => {
          const it = worn[slot];
          return it ? (
            <ItemTile key={slot} item={it} size={tile} />
          ) : (
            <span key={slot} className="grid place-items-center rounded-lg border border-dashed border-ink-700 px-0.5 text-center text-[8px] leading-tight text-slate-500" style={{ width: tile, height: tile }}>
              {kit[slot]?.name ?? SLOT_NAME[slot]}
            </span>
          );
        })}
        {!land && (
          <span className="ml-auto flex items-center gap-1 font-pixel text-[8px] text-slate-400">
            GEAR <ChevronRight size={14} />
          </span>
        )}
      </button>
      <div className={`flex flex-wrap gap-1.5 ${land ? 'min-w-0' : 'mt-3'}`}>
        {chips.map((c) => (
          <span key={c.text} className={`rounded-lg px-2.5 py-1 ${land ? 'text-[11px]' : 'font-pixel text-[8px] leading-relaxed'} ${c.on}`}>
            {c.text}
          </span>
        ))}
      </div>
      {!land && <BossEdge state={state} />}
    </section>
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
      <div className="mt-3 rounded-lg bg-ink-900 px-3 py-2" aria-label={`${zone.bossName} has ${left} heart${left === 1 ? '' : 's'} left. Each workout takes one. With none left it fights weaker, and every workout after that starts your runs with a free skill.`}>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-semibold text-slate-200">{zone.bossName}</span>
          <span className="flex flex-wrap">
            {Array.from({ length: left }).map((_, i) => (
              <Sprite key={i} id="uiIcon" opts={{ name: 'heart' }} size={12} label="" />
            ))}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-slate-500">Each workout takes a heart. At zero it fights weaker.</p>
      </div>
    );
  }
  const { picks } = edgeFor(state, zone);
  return (
    <div className="mt-3 rounded-lg bg-rose-950/50 px-3 py-2 text-rose-200">
      <div className="flex items-center gap-2 text-xs">
        <Sprite id="uiIcon" opts={{ name: 'heartEmpty' }} size={12} label="" />
        <span className="font-semibold">{zone.bossName}: no hearts left</span>
      </div>
      <p className="mt-1 text-[11px] text-rose-200/80">
        {`${Math.round((1 - EDGE.bossHp) * 100)}% less HP · `}
        {picks ? `+${picks} free skill${picks === 1 ? '' : 's'}${picks === EDGE.picks ? ' (the most)' : ''}` : '+1 free skill per workout'}
      </p>
    </div>
  );
}
