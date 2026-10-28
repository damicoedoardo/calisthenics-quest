'use client';

import { useEffect, useState } from 'react';
import { BookLock, Check, ChevronRight, Flame, Lock, Shield, Sparkles, Swords, Users } from 'lucide-react';
import { warmRunSheets } from '@/game/sheets';
import type { GameState } from '@/lib/game';
import { EDGE, ZONES, edgeFor, powerOf, workoutsPastHearts, zoneStatus, type Zone } from '@/lib/fog';
import { NO_GEAR } from '@/lib/fog-gear';
import { ITEM_SLOTS, SLOT_NAME, starterKit, type Item, type ItemSlot } from '@/game/dungeon/items';
import { chapterStart } from '@/story/engine';
import { ROAD_BANNER, ROAD_CHAPTERS } from '@/story/road';
import { ROAD_LENGTH, roadAt, startRoad } from '@/lib/road';
import { offRecord } from '@/lib/store';
import { setLobbyOpen, usePartyView } from '@/lib/party-client';
import { ItemTile } from './ItemCard';
import { Sprite } from './Sprite';
import { WorldPicker } from './WorldPicker';
import { FriendsCard } from './Friends';
import { useLand } from './useLand';

/** The Play tab's two doors: Story (alone, the six worlds that move the story) and Together
    (online with friends, never moves the story). */
export type FogMode = 'story' | 'together';

interface Props {
  state: GameState;
  onPlay: (zone: Zone) => void;
  update: (fn: (s: GameState) => GameState) => void;
  /** Open Hero > Gear (the ready strip's worn items). */
  onGear: () => void;
  /** Which door is open when the tab opens (the /lab/night jumps). */
  start?: FogMode;
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

/** The game between workouts: the worlds of the Fog, alone or with friends. Your gear, vault and
    forge are on the Hero tab; this tab only plays. */
export function PlayTab({ state, onPlay, update, onGear, start = 'story' }: Props) {
  useWarmRun(state);
  const land = useLand();
  const [mode, setMode] = useState<FogMode>(start);
  useEffect(() => setMode(start), [start]);

  const doors = (
    <div role="tablist" aria-label="The Fog" className={`grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-ink-900 p-1 ${land ? 'w-64' : ''}`}>
      {(
        [
          { id: 'story', label: 'Story', icon: <Swords size={14} aria-hidden /> },
          { id: 'together', label: 'Together', icon: <Users size={14} aria-hidden /> },
        ] as const
      ).map((d) => (
        <button
          key={d.id}
          role="tab"
          aria-selected={mode === d.id}
          onClick={() => setMode(d.id)}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition active:scale-95 ${mode === d.id ? 'bg-gold-400 text-ink-950' : 'text-slate-300'}`}
        >
          {d.icon} {d.label}
        </button>
      ))}
    </div>
  );

  if (land)
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex shrink-0 items-center gap-3">
          {doors}
          {mode === 'story' && <Ready state={state} onGear={onGear} land />}
        </div>
        <div role="tabpanel" className="min-h-0 flex-1">
          {mode === 'story' ? (
            <WorldPicker state={state} onPlay={onPlay} land />
          ) : (
            <div className="h-full overflow-y-auto">
              <Together state={state} update={update} land />
            </div>
          )}
        </div>
      </div>
    );

  return (
    <div className="space-y-4">
      {doors}
      {mode === 'story' ? (
        <>
          <WorldPicker state={state} onPlay={onPlay} />
          <Ready state={state} onGear={onGear} />
        </>
      ) : (
        <Together state={state} update={update} />
      )}
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

/** Together's rules, short: who plays, what carries over, what it never touches, what drops only here. */
const TOGETHER_FACTS: { icon: typeof Users; text: string; blue?: boolean }[] = [
  { icon: Users, text: 'Up to 4, online' },
  { icon: Shield, text: 'Same hero and gear' },
  { icon: BookLock, text: 'Your story stays put' },
  { icon: Sparkles, text: '+6 materials drop here', blue: true },
];

/** Together: friends, invites and the party lobby. Runs here never move the story, and the forge's
    materials for +6 and up drop only here. */
function Together({ state, update, land = false }: { state: GameState; update: (fn: (s: GameState) => GameState) => void; land?: boolean }) {
  const { party } = usePartyView();
  const sandbox = offRecord();
  return (
    <div className={land ? 'grid grid-cols-2 gap-3' : 'space-y-4'}>
      <section className="self-start rounded-2xl bg-ink-800 p-4">
        <p className="flex items-center gap-2 font-pixel text-[10px] text-gold-300">
          <Users size={14} /> Play with friends
        </p>
        <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] leading-snug">
          {TOGETHER_FACTS.map((f) => (
            <li key={f.text} className={`flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1.5 ${f.blue ? 'text-sky-300' : 'text-slate-300'}`}>
              <f.icon size={14} className="shrink-0" aria-hidden /> {f.text}
            </li>
          ))}
        </ul>
        {party && (
          <button onClick={() => setLobbyOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 py-2.5 text-sm font-semibold text-ink-950">
            <Swords size={15} /> Back to your party · {party.members.length}
          </button>
        )}
      </section>
      <RoadCard state={state} update={update} />
      <FriendsCard state={state} update={update} sandbox={sandbox} />
      {sandbox && <p className="rounded-2xl bg-ink-800 p-4 text-xs text-slate-500">Friends show here on your real save, once you&apos;re signed in (not in the sandbox or on the developer save).</p>}
    </div>
  );
}

/** The Ember Road, the story walked with friends: set out, then each chapter, its boss and what it
    waits for (src/lib/road.ts). Its scenes play on their own, like the main story's. */
function RoadCard({ state, update }: { state: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const at = roadAt(state);
  const plural = (n: number) => `${n} workout${n === 1 ? '' : 's'}`;
  return (
    <section className="self-start rounded-2xl bg-ink-800 p-4 ring-1 ring-orange-500/30">
      <p className="flex items-center gap-2 font-pixel text-[10px] text-orange-300">
        <Flame size={14} /> The Ember Road
      </p>
      {!at.started ? (
        <>
          <p className="mt-2 text-xs text-slate-300">
            A story for your party: three chapters and a finale, about two months. Each ends in a boss you beat together.
          </p>
          <button onClick={() => update(startRoad)} className="mt-3 w-full rounded-xl bg-orange-400 py-2.5 text-sm font-semibold text-ink-950">
            Set out on the road
          </button>
        </>
      ) : (
        <ol className="mt-2 space-y-2">
          {ROAD_CHAPTERS.map((c) => {
            const won = at.beaten >= c.n,
              here = !won && at.open >= c.n;
            return (
              <li key={c.n} className={`flex gap-2 text-xs ${won || here ? 'text-slate-200' : 'text-slate-500'}`}>
                <span className="mt-0.5 shrink-0">{won ? <Check size={14} className="text-emerald-400" /> : here ? <Swords size={14} className="text-orange-300" /> : <Lock size={14} />}</span>
                <span>
                  <span className="font-semibold">
                    {c.n}. {c.name}
                  </span>
                  {won ? (
                    <> · you keep {c.fog.keepsake.name}</>
                  ) : here ? (
                    <> · beat {c.fog.bossName}: pick {c.fog.name} in the lobby</>
                  ) : at.open === c.n - 1 && at.beaten >= at.open && at.nextIn > 0 ? (
                    <> · opens in {plural(at.nextIn)}</>
                  ) : (
                    <> · after {ROAD_CHAPTERS[c.n - 2].fog.bossName}</>
                  )}
                </span>
              </li>
            );
          })}
          <li className={`flex gap-2 text-xs ${at.done ? 'text-gold-300' : 'text-slate-500'}`}>
            <span className="mt-0.5 shrink-0">{at.done ? <Check size={14} className="text-gold-300" /> : <Lock size={14} />}</span>
            <span>
              <span className="font-semibold">The Hearth at the Road&apos;s End</span>
              {at.done ? (
                <> · you keep {ROAD_BANNER.name}</>
              ) : at.beaten >= ROAD_LENGTH ? (
                <> · {at.nextIn > 0 ? `in ${plural(at.nextIn)}` : 'waiting for you'}</>
              ) : null}
            </span>
          </li>
        </ol>
      )}
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
