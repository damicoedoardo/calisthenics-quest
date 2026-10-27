'use client';

import { useEffect, useRef, useState } from 'react';
import { Backpack, Pause, Smartphone } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { fill, storyWords } from '@/story/engine';
import type { FogLines } from '@/story/types';
import { getUpgrade, nextGrowth, powerOf, recordsBroken, RUN_SECONDS, type RunResult, type UpgradeId, type Zone } from '@/lib/fog';
import { music } from '@/lib/music';
import { zoneMusic } from '@/lib/music-zones';
import { runSheets } from '@/game/sheets';
import { buildOf } from '@/lib/stats';
import { settleGear, vaultSize, wornFor, type GearOutcome } from '@/lib/fog-gear';
import { ITEM_SLOTS, RARITY, SLOT_NAME, shortOf, type Item, type ItemSlot } from '@/game/dungeon/items';
import { ItemCard, ItemTile } from './ItemCard';
import { Sprite } from './Sprite';
import { SoundToggle, useMusic } from './Sound';
import type { FreePick, Hud, MiniMap, RunEnd, RunHandle } from '@/game/dungeon/scene';
import { ABILITIES, BAG, DODGE, RELICS, ROOM_KINDS, midBoss, type AbilityId, type CellKind, type RelicId } from '@/game/dungeon/engine';

interface Props {
  state: GameState;
  zone: Zone;
  /** Developer mode: skip to the boss or win from the pause menu. */
  dev: boolean;
  onEnd: (r: RunResult) => void;
  onLeave: () => void;
  /** Developer mode (/lab/night): start the first attempt at the mid-boss, at the boss, or won (the recap). */
  startAt?: RunStart;
}

export type RunStart = 'mid' | 'boss' | 'win';


/* Every zone is a dungeon (src/game/dungeon), each with its own boss and ground. */


/** The zone's floor-5 mid-boss (the Warden of the Ashes, the Drowned Lantern...), at the start of a line. */
const midName = (zone: Pick<Zone, 'id'>) => midBoss(zone).name.replace(/^the/, 'The');

/** The boss's lines with the player's own words filled in; a line left empty (no words for it) is dropped. */
function bossLines(zone: Zone, state: GameState): FogLines {
  const words = storyWords(state),
    say = (t: string) => fill(t, words),
    some = (t: string) => /[a-z]/i.test(t);
  const { enter, stages, end, taunts } = zone.lines;
  return { enter: say(enter), stages: stages.map(say), end: say(end), taunts: taunts.map(say).filter(some) };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Whether the screen is taller than wide: the Fog is played with the phone held sideways. */
function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(orientation: portrait)'),
      on = () => setPortrait(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return portrait;
}

/** Where the browser lets a page turn the screen itself (Android, installed): sideways for the run,
    back to the app's upright when it ends. iPhones can't, so the run asks you to turn the phone. */
type Turnable = { lock?: (o: string) => Promise<void>; unlock?: () => void };
function useSideways() {
  useEffect(() => {
    const o = (typeof screen !== 'undefined' ? screen.orientation : undefined) as Turnable | undefined;
    o?.lock?.('landscape').catch(() => {});
    return () => {
      try {
        o?.unlock?.();
      } catch {
        // Nothing was locked.
      }
    };
  }, []);
}

/** A run in the Fog: the Phaser canvas, with the HUD, skill picks and results drawn over it. */
export function FogRun({ state, zone, dev, onEnd, onLeave, startAt }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const run = useRef<RunHandle | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [offer, setOffer] = useState<{ choices: UpgradeId[]; levels: Partial<Record<UpgradeId, number>>; free: FreePick | null } | null>(null);
  const [said, setSaid] = useState<{ text: string; at: number } | null>(null);
  // Unnamed until after the first workout.
  const flameName = state.profile.flame;
  const [paused, setPaused] = useState(false);
  // Developer mode: which dungeon theme the run is showing (the pause menu cycles through them).
  const [theme, setTheme] = useState<string | null>(null);
  const [boss, setBoss] = useState(false);
  const [end, setEnd] = useState<RunEnd | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Developer mode: ?bot hands runs to the bot, ?bot=fast also plays them in a blink (balance tests).
  const [bot] = useState(() => (dev && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('bot') : null));
  const [auto, setAuto] = useState(bot !== null);
  const [floorShown, setFloorShown] = useState<number | null>(null);
  // The first-room tip: gone after the first move or a few seconds, whichever comes first.
  const [tip, setTip] = useState(true);
  /** Which of this zone's records the last run beat. */
  const [broken, setBroken] = useState<ReturnType<typeof recordsBroken> | null>(null);
  const [chest, setChest] = useState<{ choices: RelicId[]; have: Partial<Record<RelicId, number>> } | null>(null);
  // The bag, open over the run (which holds still), and the item picked in it.
  const [bag, setBag] = useState(false);
  // An item just picked up, shown for a moment.
  const [found, setFound] = useState<{ item: Item; at: number } | null>(null);
  // On the stairs: go deeper, or leave with what you carry.
  const [stairs, setStairs] = useState(false);
  // What came home from the run, or what the Fog took.
  const [gearOut, setGearOut] = useState<GearOutcome | null>(null);
  // The game code couldn't be fetched (offline before the Play tab ever loaded it).
  const [failed, setFailed] = useState(false);
  // Held upright, the run waits behind a "turn your phone" card.
  useSideways();
  const portrait = usePortrait();
  const upright = useRef(portrait);
  upright.current = portrait;

  // Each zone has its own run and boss themes; the Warden halfway down has his own.
  const tunes = zoneMusic(zone.id);
  useMusic(end ? null : hud?.boss ? tunes.boss : hud?.warden ? 'warden' : tunes.run);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const classId = state.profile.classId;
    // Ask for the game code first, so it downloads while the sprites are drawn.
    const game = import('@/game/dungeon/scene');
    // No screen shake or flashes for players who asked their system for less motion.
    const calm = import('@/game/calm');
    // Built ahead (and cached) when the Play tab opens, so this is quick.
    const sheets = runSheets(state, zone);
    setHud(null);
    setEnd(null);
    setBoss(false);
    setTip(true);
    setBroken(null);
    setFailed(false);
    setBag(false);
    setStairs(false);
    setGearOut(null);
    const tipGone = setTimeout(() => setTip(false), 10000);
    const moved = () => setTip(false);
    window.addEventListener('keydown', moved, { once: true });
    // A touch on the game itself (not on a skill card or a button over it).
    el.addEventListener('pointerdown', moved, { once: true });
    let jump = 0;
    Promise.all([game, calm]).then(([{ startRun }]) => {
      if (cancelled) return;
      run.current = startRun(el, { zone, lines: bossLines(zone, state), power: powerOf(state, new Date()), classId, sheets, autopilot: auto, fast: bot === 'fast', worn: wornFor(state), build: buildOf(state) }, {
        hud: setHud,
        floor: (n: number) => {
          setFloorShown(n);
          setTimeout(() => setFloorShown(null), 2200);
        },
        levelUp: (choices, levels, free) => setOffer({ choices, levels, free }),
        relic: (choices: RelicId[], have: Partial<Record<RelicId, number>>) => setChest({ choices, have }),
        boss: () => {
          setBoss(true);
          setTimeout(() => setBoss(false), 4500);
        },
        say: (text) => setSaid({ text, at: Date.now() }),
        loot: (item) => setFound({ item, at: Date.now() }),
        stairs: () => setStairs(true),
        end: (r) => {
          music.sting(r.won ? (zoneMusic(zone.id).win ?? 'victory') : r.why === 'left' ? 'levelup' : 'defeat');
          const result: RunResult = { ...r, zone: zone.id };
          setBroken(recordsBroken(state.fog?.records?.[zone.id], result));
          setBag(false);
          setStairs(false);
          setGearOut(settleGear(state, r).out);
          setEnd(r);
          onEnd(result);
        },
      });
      if (upright.current) run.current.pause();
      // Once the first room is up, jump ahead (only on the first attempt, so Again plays normally).
      if (startAt && attempt === 0)
        jump = window.setTimeout(() => {
          const h = run.current;
          if (startAt === 'mid') h?.skipToWarden();
          else if (startAt === 'boss') h?.skipToBoss();
          else {
            // The recap: let the bot play a little first, so it has something to show.
            h?.autopilot(true);
            jump = window.setTimeout(() => run.current?.winNow(), 8000);
          }
        }, 900);
    }, () => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      clearTimeout(tipGone);
      clearTimeout(jump);
      window.removeEventListener('keydown', moved);
      el.removeEventListener('pointerdown', moved);
      run.current?.destroy();
      run.current = null;
    };
    // A new attempt restarts the run; the state it starts from is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, zone.id]);

  // Turning the phone upright holds the run; turning it back lets it go (unless the pause menu is open).
  useEffect(() => {
    if (portrait) run.current?.pause();
    else if (!paused) run.current?.resume();
  }, [portrait, paused]);

  const pick = (id: UpgradeId) => {
    setOffer(null);
    run.current?.pick(id);
  };

  useEffect(() => {
    if (!found) return;
    const t = setTimeout(() => setFound(null), 2600);
    return () => clearTimeout(t);
  }, [found]);

  const openBag = (on: boolean) => {
    setBag(on);
    if (on) run.current?.pause();
    else if (!paused) run.current?.resume();
  };

  useEffect(() => {
    if (!said) return;
    const t = setTimeout(() => setSaid(null), 2600);
    return () => clearTimeout(t);
  }, [said]);

  const left = hud ? Math.max(0, RUN_SECONDS - hud.seconds) : RUN_SECONDS;

  return (
    <div className="fixed inset-0 z-50 touch-none select-none bg-ink-950" data-run-end={end ? JSON.stringify(end) : undefined}>
      <div ref={host} className="absolute inset-0" />

      {hud && !end && (
        <div className="safe-top pointer-events-none absolute inset-x-0 top-0 px-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="min-w-0 max-w-xs flex-1">
              <div className="relative h-3.5 overflow-hidden rounded-sm bg-ink-800/90 ring-1 ring-black/40">
                <div className="h-full bg-red-500 transition-[width] duration-150" style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
                <span className="absolute inset-0 grid place-items-center font-mono text-[9px] font-bold text-white">
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="font-pixel text-[8px] text-sky-300">Lv{hud.level}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-sm bg-ink-800/90">
                  <div className="h-full bg-sky-400 transition-[width] duration-150" style={{ width: `${(hud.xp / hud.xpNext) * 100}%` }} />
                </div>
              </div>
              {hud.relics && Object.keys(hud.relics).length > 0 && (
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {(Object.entries(hud.relics) as [RelicId, number][]).map(([id, n]) => {
                    return (
                      <span key={id} className="flex items-center gap-0.5 rounded bg-ink-800/90 px-1 py-0.5 text-gold-300" title={RELICS[id].name}>
                        <Sprite id="relicIcon" opts={{ name: id }} size={14} label={RELICS[id].name} />
                        {n > 1 && <span className="font-mono text-[8px]">{n}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="ml-auto w-16 text-right">
              <p className={`font-pixel text-[11px] ${hud.boss ? 'text-red-400' : 'text-slate-100'}`}>
                {hud.climb != null ? 'CLIMB' : hud.boss ? 'BOSS' : hud.floor ? `${hud.floor}/${hud.floors}` : clock(left)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-400">{hud.climb != null ? `ledge ${hud.climb + 1}` : `${hud.kills} down`}</p>
            </div>
            <button
              aria-label={`Bag: ${hud.gear.bag.length} of ${BAG}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => openBag(true)}
              className={`pointer-events-auto relative grid h-9 w-9 place-items-center rounded-lg bg-ink-800/90 ${hud.gear.bag.length >= BAG ? 'text-red-300' : 'text-slate-200'}`}
            >
              <Backpack size={16} />
              {hud.gear.bag.length > 0 && <span className="absolute -bottom-1 -right-1 rounded bg-ink-950 px-1 font-mono text-[8px] text-gold-300">{hud.gear.bag.length}</span>}
            </button>
            <button
              aria-label="Pause"
              onClick={() => {
                run.current?.pause();
                setPaused(true);
              }}
              className="pointer-events-auto grid h-9 w-9 place-items-center rounded-lg bg-ink-800/90 text-slate-200"
            >
              <Pause size={16} />
            </button>
          </div>
          {hud.boss && (
            <BossBar
              name={`${zone.bossName}${zone.boss === 'knight' ? ` · ${Math.ceil(hud.boss.hp)} plates` : hud.boss.label ? ` · ${hud.boss.label}` : ''}`}
              hp={hud.boss.hp}
              max={hud.boss.max}
            />
          )}
          {hud.warden && <BossBar name={midName(zone)} hp={hud.warden.hp} max={hud.warden.max} ember={hud.warden.phase === 2 ? 'hot' : 'warm'} />}
        </div>
      )}

      {hud?.floor && hud.floors && !end && <DepthMap floor={hud.floor} floors={hud.floors} boss={zone.bossName} midName={midName(zone)} mid={hud.wardenFloor ?? null} />}
      {hud?.map && hud.climb == null && !end && <FloorMap map={hud.map} floor={hud.floor} midName={midName(zone)} hold={(on) => (on ? run.current?.pause() : run.current?.resume())} />}

      {!hud && !end && !failed && <p className="absolute inset-x-0 top-1/2 text-center font-pixel text-[10px] text-slate-400">Into the Fog...</p>}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-sm text-slate-300">The Fog has to download once, with a signal. After that it works offline too.</p>
          <button onClick={onLeave} className="w-full max-w-xs rounded-xl bg-ink-800 py-3 text-sm text-slate-300">
            Back
          </button>
        </div>
      )}

      {tip && hud && !end && hud.seconds < 6 && (
        <p className="pointer-events-none absolute inset-x-6 bottom-28 mx-auto max-w-md animate-pulse text-center text-sm text-slate-300">
          {`Drag to move; you attack on your own. Tap a monster to aim at it. Dodge slips through shots. ${zone.bossName} waits ${hud.floors} floors down.`}
        </p>
      )}

      {hud?.ability && !end && (
        <AbilityButton id={hud.ability.id} ready={hud.ability.ready} dodge={hud.dodge ?? 1} onUse={() => run.current?.ability?.()} onDodge={() => run.current?.dodge?.()} />
      )}

      {floorShown && !end && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 animate-fadein text-center">
          <p className="font-pixel text-lg text-gold-300 drop-shadow-[0_2px_0_#0b0d14]">
            Floor {floorShown} of {hud?.floors}
          </p>
          <p className="mt-2 text-xs text-slate-300">
            {floorShown === hud?.floors
              ? `${zone.bossName} is down here, in the last room.`
              : floorShown === hud?.wardenFloor
                ? `Halfway down. ${midName(zone)} guards this floor's last room. ${midBoss(zone).tip}.`
                : `${(hud?.floors ?? floorShown) - floorShown} more below, then ${zone.bossName}.`}
          </p>
        </div>
      )}

      {boss && !offer && (
        <div className="pointer-events-none absolute inset-x-6 top-24 mx-auto max-w-md rounded-2xl bg-ink-950/85 p-4 text-center ring-1 ring-violet-500/50">
          <p className="font-pixel text-xs leading-relaxed text-violet-300">{zone.boss === 'summit' ? 'The climb begins' : `${zone.bossName} walks out of the Fog`}</p>
          {zone.boss === 'hollow' && state.profile.voice && <p className="mt-2 text-sm italic text-slate-200">&ldquo;{state.profile.voice}&rdquo;</p>}
          <p className="mt-2 text-sm text-slate-200">{zone.hint}</p>
        </div>
      )}

      {found && !end && !bag && (
        <div key={found.at} className="pointer-events-none absolute inset-x-0 bottom-28 flex animate-fadein justify-center">
          <div className="flex items-center gap-2 rounded-lg bg-ink-950/85 px-3 py-2 ring-1 ring-ink-700">
            <ItemTile item={found.item} size={28} />
            <div className="text-left">
              <p className="text-xs font-semibold" style={{ color: RARITY[found.item.rarity].color }}>
                {found.item.name}
              </p>
              <p className="text-[10px] text-slate-400">{shortOf(found.item, buildOf(state)) > 0 ? 'Into the bag. Train to wear it.' : 'Into the bag. Open it to wear.'}</p>
            </div>
          </div>
        </div>
      )}

      {bag && hud && !end && (
        <BagPanel
          gear={hud.gear}
          build={buildOf(state)}
          onWear={(id) => run.current?.wear(id)}
          onTakeOff={(slot) => run.current?.takeOff(slot)}
          onDrop={(id) => run.current?.dropItem(id)}
          onClose={() => openBag(false)}
        />
      )}

      {stairs && !end && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/80 px-4">
          <p className="font-pixel text-sm text-gold-300">The stairs</p>
          <p className="mt-2 max-w-sm text-center text-xs text-slate-400">
            You catch your breath: HP full. Go down and keep what you find if you make it, or walk back up now and keep everything you carry.
          </p>
          <div className="mt-4 w-full max-w-sm space-y-2">
            {(
              [
                ['deeper', 'Go deeper', `Floor ${(hud?.floor ?? 0) + 1}. If the Fog takes you, it takes what you wear and carry.`],
                ['leave', 'Leave with your loot', `Home with ${hud ? hud.gear.bag.length : 0} item${hud?.gear.bag.length === 1 ? '' : 's'} in the bag. The dungeon starts over next time.`],
                ['stay', 'Not yet', 'Look round this floor first.'],
              ] as const
            ).map(([id, label, text]) => (
              <button
                key={id}
                onClick={() => {
                  setStairs(false);
                  run.current?.stairs(id);
                }}
                className={`w-full rounded-xl p-3 text-left ring-1 active:scale-[.98] ${id === 'deeper' ? 'bg-gold-400 text-ink-950 ring-gold-200' : 'bg-ink-800 text-slate-100 ring-ink-700'}`}
              >
                <span className="block text-sm font-semibold">{label}</span>
                <span className={`mt-0.5 block text-xs ${id === 'deeper' ? 'text-ink-900' : 'text-slate-400'}`}>{text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {said && !boss && !offer && !end && (
        <p key={said.at} className="pointer-events-none absolute inset-x-10 top-44 animate-fadein text-center font-pixel text-[9px] leading-relaxed text-gold-300 drop-shadow-[0_2px_0_#0b0d14]">
          {said.text}
        </p>
      )}

      {offer && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/80 px-4">
          <p className="font-pixel text-sm text-gold-300">{offer.free === 'fresh' ? 'Warmed up!' : offer.free === 'rested' ? 'Rested!' : 'Level up!'}</p>
          <p className="mt-2 text-center text-xs text-slate-400">
            {offer.free === 'fresh'
              ? 'You trained in the last two days: take a free skill.'
              : offer.free === 'rested'
                ? `You rested, and ${flameName ?? 'your flame'} burns brighter for it: take a free skill.`
                : 'Pick a skill.'}
          </p>
          <div className="mt-4 w-full max-w-sm space-y-2">
            {offer.choices.map((id) => {
              const u = getUpgrade(id),
                next = (offer.levels[id] ?? 0) + 1;
              return (
                <button key={id} onClick={() => pick(id)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-gold-400/30 active:scale-[.98]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-900 text-gold-300">
                    <Sprite id="skillIcon" opts={{ name: id }} size={28} label="" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100">{u.name.replace('{flame}', flameName ?? 'Your flame')}</span>
                      <span className="font-pixel text-[8px] text-slate-400">{next === 1 ? 'NEW' : `Lv${next}`}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">{u.text(next)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {chest && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/80 px-4">
          <p className="font-pixel text-sm text-gold-300">A chest!</p>
          <p className="mt-2 text-center text-xs text-slate-400">Take one. It lasts until the end of this run.</p>
          <div className="mt-4 w-full max-w-sm space-y-2">
            {chest.choices.map((id) => {
              const n = chest.have[id] ?? 0;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setChest(null);
                    run.current?.pickRelic?.(id);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-gold-400/30 active:scale-[.98]"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-900 text-gold-300">
                    <Sprite id="relicIcon" opts={{ name: id }} size={28} label="" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-100">{RELICS[id].name}</span>
                      <span className="font-pixel text-[8px] text-slate-400">{n ? `have ${n}` : 'NEW'}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">{RELICS[id].text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {paused && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-950/85 px-8">
          <p className="font-pixel text-sm text-slate-200">Paused</p>
          <p className="flex items-center text-xs text-slate-400">
            Sound <SoundToggle />
          </p>
          <button
            onClick={() => {
              setPaused(false);
              run.current?.resume();
            }}
            className="w-full max-w-xs rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950"
          >
            Keep going
          </button>
          <button onClick={onLeave} className="w-full max-w-xs rounded-xl bg-ink-800 py-3 text-sm text-slate-300">
            Leave the run
          </button>
          {dev && (
            <div className="grid w-full max-w-xs grid-cols-2 gap-2">
              {(
                [
                  ['Skip to the boss', () => run.current?.skipToBoss()],
                  ['Next floor', () => run.current?.skipFloor()],
                  ['To the mid-boss', () => run.current?.skipToWarden()],
                  [`Theme${theme ? `: ${theme}` : ''}`, () => setTheme(run.current?.cycleTheme() ?? null)],
                  ['Win this run', () => run.current?.winNow()],
                  [
                    auto ? 'Take the controls' : 'Let the bot play',
                    () => {
                      run.current?.autopilot(!auto);
                      setAuto(!auto);
                    },
                  ],
                ] as const
              ).map(([label, act]) => (
                <button
                  key={label}
                  onClick={() => {
                    act();
                    setPaused(false);
                    run.current?.resume();
                  }}
                  className="rounded-xl border border-dashed border-sky-400/60 py-2.5 text-xs text-sky-300"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {end && <Results state={state} zone={zone} end={end} broken={broken} gear={gearOut} onAgain={() => setAttempt((a) => a + 1)} onLeave={onLeave} />}

      {portrait && !failed && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-ink-950 px-8 text-center">
          <Smartphone size={44} className="text-gold-300 motion-safe:animate-turn" aria-hidden />
          <p className="font-pixel text-xs leading-relaxed text-gold-300">Turn your phone sideways</p>
          <p className="max-w-xs text-sm text-slate-400">The Fog is played with the phone held across: move with your left thumb, fight with your right.</p>
          <button onClick={onLeave} className="w-full max-w-xs rounded-xl bg-ink-800 py-3 text-sm text-slate-300">
            Back
          </button>
        </div>
      )}
    </div>
  );
}

/** How deep you are: a ladder of floors down the left edge, filling as you go, the boss at the
    bottom; an ember marks the Warden's floor. */
function DepthMap({ floor, floors, boss, midName, mid }: { floor: number; floors: number; boss: string; midName: string; mid: number | null }) {
  return (
    <div
      className="absolute left-1.5 top-16 flex flex-col items-center gap-[3px] rounded-lg bg-ink-950/50 px-1 py-1.5"
      role="img"
      aria-label={`Floor ${floor} of ${floors}, ${mid ? `${midName.replace(/^The/, 'the')} on floor ${mid}, ` : ''}${boss} at the bottom.`}
    >
      {Array.from({ length: floors }, (_, i) => {
        const n = i + 1,
          warden = n === mid;
        return (
          <div key={n} className="relative flex items-center">
            <span className={`block h-1.5 w-4 rounded-[1px] ${n === floor ? 'animate-pulse bg-white ring-1 ring-gold-300' : n < floor ? 'bg-gold-400/70' : 'bg-ink-700/90'}`} />
            {warden && <Sprite id="markIcon" opts={{ name: 'warden' }} size={14} label={midName} className={`absolute -right-4 ${n < floor ? 'opacity-40' : ''}`} />}
          </div>
        );
      })}
      <Sprite id="markIcon" opts={{ name: 'boss' }} size={14} label="The boss" className={floor === floors ? 'animate-pulse' : 'opacity-70'} />
    </div>
  );
}

/** Each kind of room's color on the map, and its name there (the mid-boss's is its own). */
const MAP_LOOK: Record<CellKind, { color: string; name: string }> = {
  fight: { color: '#cbd5e1', name: ROOM_KINDS.fight.name },
  elite: { color: '#f87171', name: ROOM_KINDS.elite.name },
  treasure: { color: '#fbbf24', name: 'Chest' },
  rest: { color: '#86efac', name: ROOM_KINDS.rest.name },
  stairs: { color: '#fbbf24', name: 'Stairs' },
  warden: { color: '#f97316', name: '' },
  boss: { color: '#a855f7', name: 'Boss' },
};

/** The floor's map, top right: the rooms you've been in, filled; the ones you've seen through a
    door, as outlines in the color of what waits there; you, the gold one. Tap for it big, with
    names; the run holds still while it's open. */
function FloorMap({ map, floor, midName, hold }: { map: MiniMap; floor: number; midName: string; hold: (on: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (on: boolean) => {
    setOpen(on);
    hold(on);
  };
  const xs = map.cells.map((c) => c.x),
    ys = map.cells.map((c) => c.y),
    x0 = Math.min(...xs),
    y0 = Math.min(...ys),
    cols = Math.max(...xs) - x0 + 1,
    rows = Math.max(...ys) - y0 + 1;
  const draw = (s: number, gap: number, names: boolean) => {
    const step = s + gap,
      mid = (v: number) => v * step + s / 2;
    return (
      <svg width={cols * step - gap + 4} height={rows * step - gap + 4} viewBox={`-2 -2 ${cols * step - gap + 4} ${rows * step - gap + 4}`} aria-hidden>
        {map.cells.flatMap((c) =>
          c.links
            .filter((l) => l === 'e' || l === 's')
            .map((l) => {
              const x = c.x - x0,
                y = c.y - y0;
              return <line key={`${c.id}${l}`} x1={mid(x)} y1={mid(y)} x2={mid(x + (l === 'e' ? 1 : 0))} y2={mid(y + (l === 's' ? 1 : 0))} stroke="#64748b" strokeWidth={Math.max(2, s / 6)} />;
            }),
        )}
        {map.cells.map((c) => {
          const x = (c.x - x0) * step,
            y = (c.y - y0) * step,
            here = c.id === map.at,
            { color } = MAP_LOOK[c.kind];
          return (
            <g key={c.id}>
              <rect x={x} y={y} width={s} height={s} rx={s / 6} fill={here ? '#fde68a' : c.been ? '#334155' : '#0b0d14'} stroke={here ? '#fbbf24' : color} strokeWidth={c.been && !here ? 1 : 2} strokeDasharray={c.been || here ? undefined : `${s / 5} ${s / 8}`} />
              {!names && c.been && !here && c.kind !== 'fight' && <rect x={x + s * 0.3} y={y + s * 0.3} width={s * 0.4} height={s * 0.4} fill={color} />}
              {names && (
                <text x={x + s / 2} y={y + s / 2 + 3} textAnchor="middle" fontSize={8} fill={here ? '#0b0d14' : color} fontFamily="monospace">
                  {here ? 'You' : c.kind === 'warden' ? midName.split(' ').pop()!.slice(0, 7) : MAP_LOOK[c.kind].name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };
  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => toggle(!open)}
        className="pointer-events-auto absolute right-1.5 top-16 rounded-lg bg-ink-950/60 p-1"
        aria-label={`Map of floor ${floor}: ${map.cells.filter((c) => c.been).length} rooms explored. Tap to open it.`}
        aria-expanded={open}
      >
        {draw(9, 4, false)}
      </button>
      {open && (
        <div onPointerDown={(e) => e.stopPropagation()} onClick={() => toggle(false)} className="pointer-events-auto absolute inset-0 z-10 flex animate-fadein items-center justify-center bg-ink-950/70">
          <div className="max-h-full max-w-full overflow-auto rounded-xl bg-ink-950/95 p-3 ring-1 ring-gold-400/40">
            <p className="font-pixel text-[9px] text-gold-300">Floor {floor}</p>
            <div className="mt-2">{draw(44, 12, true)}</div>
            <p className="mt-2 max-w-xs text-[11px] leading-snug text-slate-400">Filled: rooms you've been in. Dashed: rooms you've seen through a door. Find the stairs to go down. Tap to close.</p>
          </div>
        </div>
      )}
    </>
  );
}

/** A big foe's health along the top: the zone's boss, or the Warden halfway down (in ember colors,
    red once it's past half). */
function BossBar({ name, hp, max, ember }: { name: string; hp: number; max: number; ember?: 'warm' | 'hot' }) {
  return (
    <div className="mx-auto mt-2 max-w-xs">
      <p className={`text-center font-pixel text-[9px] ${ember ? 'text-orange-300' : 'text-violet-300'}`}>{name}</p>
      <div className={`mt-1 h-2.5 overflow-hidden rounded-sm bg-ink-800/90 ring-1 ${ember ? 'ring-orange-500/50' : 'ring-violet-500/40'}`}>
        <div className={`h-full transition-[width] duration-150 ${ember === 'hot' ? 'bg-red-500' : ember ? 'bg-orange-500' : 'bg-violet-500'}`} style={{ width: `${(hp / max) * 100}%` }} />
      </div>
    </div>
  );
}

/** The class ability: a big round button under your right thumb, filling up while it recharges.
    The dodge sits to its left, smaller, on its own short clock. */
function AbilityButton({ id, ready, dodge, onUse, onDodge }: { id: AbilityId; ready: number; dodge: number; onUse: () => void; onDodge: () => void }) {
  const up = ready >= 1,
    dodgeUp = dodge >= 1;
  return (
    <div className="safe-bottom absolute bottom-6 right-5 flex items-end gap-3">
      <div className="mb-1 flex flex-col items-center">
        <button
          aria-label={`Dodge, every ${DODGE.cd} s`}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (dodgeUp) onDodge();
          }}
          className={`relative grid h-12 w-12 place-items-center overflow-hidden rounded-full ring-2 ${dodgeUp ? 'bg-sky-300 text-ink-950 ring-sky-100 active:scale-95' : 'bg-ink-800/90 text-slate-500 ring-ink-700'}`}
        >
          {!dodgeUp && <span className="absolute inset-x-0 bottom-0 bg-sky-300/30" style={{ height: `${dodge * 100}%` }} />}
          <Sprite id="abilityIcon" opts={{ name: 'dodge' }} size={28} label="" className={dodgeUp ? '' : 'opacity-50 grayscale'} />
        </button>
        <span className="mt-1 font-pixel text-[8px] text-slate-300">Dodge</span>
      </div>
      <div className="flex flex-col items-center">
        <button
          aria-label={ABILITIES[id].name}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (up) onUse();
          }}
          className={`relative grid h-16 w-16 place-items-center overflow-hidden rounded-full ring-2 ${up ? 'bg-gold-400 text-ink-950 ring-gold-200 active:scale-95' : 'bg-ink-800/90 text-slate-500 ring-ink-700'}`}
        >
          {!up && <span className="absolute inset-x-0 bottom-0 bg-gold-400/30" style={{ height: `${ready * 100}%` }} />}
          <Sprite id="abilityIcon" opts={{ name: id }} size={42} label="" className={up ? '' : 'opacity-50 grayscale'} />
        </button>
        <span className="mt-1 font-pixel text-[8px] text-slate-300">{ABILITIES[id].name}</span>
      </div>
    </div>
  );
}

/** A dungeon run on one card: how deep, how long, how many, the Warden, and what you picked up.
    A record that fell gets a BEST tag. */
function Recap({ end, broken, midName }: { end: RunEnd; broken: ReturnType<typeof recordsBroken> | null; midName: string }) {
  const relics = Object.entries(end.relics ?? {}) as [RelicId, number][];
  const tiles: [string, string, boolean][] = [
    ['Deepest', end.won ? 'All' : `${end.floor}·${end.room}`, !!broken?.depth],
    ['Time', clock(end.seconds), !!broken?.fastest],
    ['Down', String(end.kills), !!broken?.kills],
  ];
  return (
    <div className="mt-5 w-full max-w-xs rounded-xl bg-ink-900 p-3 ring-2 ring-ink-700 shadow-[0_4px_0_#0b0d14]">
      <p className="text-left font-pixel text-[9px] text-gold-300">Run recap</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {tiles.map(([k, v, best]) => (
          <div key={k} className={`relative rounded-lg py-2 ${best ? 'bg-gold-400/10 ring-1 ring-gold-300' : 'bg-ink-800'}`}>
            {best && <span className="absolute -top-2 right-1 rounded-sm bg-gold-400 px-1 py-0.5 font-pixel text-[7px] text-ink-950">BEST</span>}
            <p className="font-mono text-lg font-bold text-slate-100">{v}</p>
            <p className="text-[10px] text-slate-500">{k}</p>
          </div>
        ))}
      </div>
      {end.warden !== null && end.warden !== undefined && (
        <p className={`mt-3 flex items-center gap-2 text-left text-xs ${end.warden ? 'text-orange-300' : 'text-slate-500'}`}>
          <Sprite id="markIcon" opts={{ name: 'warden' }} size={14} label="" className={end.warden ? '' : 'opacity-40 grayscale'} />
          {end.warden ? `${midName} beaten` : `${midName}: not yet`}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1 text-left">
        {relics.length ? (
          relics.map(([id, n]) => {
            return (
              <span key={id} className="flex items-center gap-1 rounded bg-ink-800 px-1.5 py-1 text-gold-300" title={RELICS[id].name}>
                <Sprite id="relicIcon" opts={{ name: id }} size={12} label="" />
                <span className="text-[10px] text-slate-300">{RELICS[id].name}</span>
                {n > 1 && <span className="font-mono text-[9px] text-slate-400">x{n}</span>}
              </span>
            );
          })
        ) : (
          <span className="text-xs text-slate-500">No chest items this run.</span>
        )}
      </div>
    </div>
  );
}

function Results({ state, zone, end, broken, gear, onAgain, onLeave }: { state: GameState; zone: Zone; end: RunEnd; broken: ReturnType<typeof recordsBroken> | null; gear: GearOutcome | null; onAgain: () => void; onLeave: () => void }) {
  const hints = [nextGrowth(state)],
    left = end.why === 'left';
  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-ink-950/90 px-6 py-6 text-center">
      <p className={`mt-auto font-pixel text-sm ${end.won || left ? 'text-gold-300' : 'text-slate-300'}`}>{end.won ? `${zone.name} cleared!` : left ? 'Back in the light' : 'The Fog took you'}</p>
      {end.height != null && <p className="mt-2 font-pixel text-[10px] text-sky-300">{end.height === 0 ? 'The first ledge waits for you.' : `You climbed ${end.height} ledge${end.height === 1 ? '' : 's'} high.`}</p>}
      <p className="mt-3 text-sm text-slate-300">{end.won ? (
          <>The Wanderer: &ldquo;{zone.after}&rdquo;</>
        ) : left ? (
          'You chose to walk out with what you found. Knowing when to stop is a skill too.'
        ) : (
          'The Fog takes what you carried, not who you are. Your points, your level and your story stay.'
        )}
      </p>
      {gear && <GearRecap out={gear} vault={vaultSize(state.sessions.length)} />}
      {end.won && (
        <div className="mt-4 w-full max-w-xs rounded-xl bg-ink-800 p-3 text-left ring-1 ring-gold-400/30">
          <p className="font-pixel text-[9px] text-gold-300">You keep: {zone.keepsake.name}</p>
          <p className="mt-1 text-xs text-slate-400">{zone.keepsake.text}</p>
        </div>
      )}
      {end.floor ? (
        <Recap end={end} broken={broken} midName={midName(zone)} />
      ) : (
        <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-2">
          {[
            ['Level', String(end.level)],
            ['Time', clock(end.seconds)],
            ['Down', String(end.kills)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-ink-800 py-2">
              <p className="font-mono text-lg font-bold text-slate-100">{v}</p>
              <p className="text-[10px] text-slate-500">{k}</p>
            </div>
          ))}
        </div>
      )}
      {hints.length > 0 && (
        <div className="mt-5 w-full max-w-xs rounded-xl bg-ink-800 p-3 text-left">
          <p className="font-pixel text-[9px] text-gold-300">Train to grow</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-300">
            {hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}
      <button onClick={onAgain} className="mt-6 w-full max-w-xs rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
        Run again
      </button>
      <button onClick={onLeave} className="mb-auto mt-2 w-full max-w-xs py-3 text-sm text-slate-400">
        Back
      </button>
    </div>
  );
}

/** The bag over the run: what you wear (three slots) and what you carry. Tap an item to see it,
    then wear it, take it off or leave it on the floor. */
function BagPanel({ gear, build, onWear, onTakeOff, onDrop, onClose }: { gear: Hud['gear']; build: ReturnType<typeof buildOf>; onWear: (id: string) => void; onTakeOff: (slot: ItemSlot) => void; onDrop: (id: string) => void; onClose: () => void }) {
  const [pick, setPick] = useState<{ from: 'worn' | 'bag'; id: string } | null>(null);
  const all = [...Object.values(gear.worn), ...gear.bag].filter((x): x is Item => !!x),
    item = pick && all.find((x) => x.id === pick.id);
  const wornNow = item && gear.worn[item.slot]?.id === item.id;
  return (
    <div onPointerDown={(e) => e.stopPropagation()} className="pointer-events-auto absolute inset-0 z-10 flex animate-fadein items-center justify-center bg-ink-950/85 p-3">
      <div className="flex max-h-full w-full max-w-2xl gap-3 overflow-auto rounded-xl bg-ink-950/95 p-3 ring-1 ring-gold-400/40">
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[9px] text-gold-300">Worn</p>
          <div className="mt-2 flex gap-2">
            {ITEM_SLOTS.map((slot) => {
              const it = gear.worn[slot];
              return (
                <button key={slot} onClick={() => it && setPick({ from: 'worn', id: it.id })} className={`flex flex-col items-center gap-1 rounded-lg p-1 ${pick?.id === it?.id && it ? 'bg-ink-800' : ''}`} aria-label={it ? it.name : `${SLOT_NAME[slot]}: empty`}>
                  {it ? <ItemTile item={it} size={44} /> : <span className="grid h-11 w-11 place-items-center rounded-lg border border-dashed border-ink-700 text-[9px] text-slate-600">empty</span>}
                  <span className="text-[9px] text-slate-500">{SLOT_NAME[slot]}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 font-pixel text-[9px] text-gold-300">
            Bag {gear.bag.length}/{BAG}
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {Array.from({ length: BAG }, (_, i) => {
              const it = gear.bag[i];
              return it ? (
                <button key={it.id} onClick={() => setPick({ from: 'bag', id: it.id })} className={`grid place-items-center rounded-lg p-1 ${pick?.id === it.id ? 'bg-ink-800' : ''}`} aria-label={it.name}>
                  <ItemTile item={it} size={40} dim={shortOf(it, build) > 0} />
                </button>
              ) : (
                <span key={i} className="mx-auto h-10 w-10 rounded-lg border border-dashed border-ink-800" />
              );
            })}
          </div>
          <button onClick={onClose} className="mt-3 w-full rounded-xl bg-gold-400 py-2.5 font-pixel text-[10px] text-ink-950">
            Back to the run
          </button>
        </div>
        <div className="w-60 shrink-0">
          {item ? (
            <ItemCard item={item} build={build}>
              {wornNow ? (
                !item.starter && (
                  <button onClick={() => onTakeOff(item.slot)} disabled={gear.bag.length >= BAG} className="flex-1 rounded-lg bg-ink-700 py-2 text-xs text-slate-200 disabled:opacity-40">
                    Take off
                  </button>
                )
              ) : (
                <>
                  <button onClick={() => onWear(item.id)} disabled={shortOf(item, build) > 0} className="flex-1 rounded-lg bg-gold-400 py-2 text-xs font-semibold text-ink-950 disabled:bg-ink-700 disabled:text-slate-500">
                    Wear
                  </button>
                  <button
                    onClick={() => {
                      onDrop(item.id);
                      setPick(null);
                    }}
                    className="flex-1 rounded-lg bg-ink-700 py-2 text-xs text-slate-200"
                  >
                    Drop
                  </button>
                </>
              )}
            </ItemCard>
          ) : (
            <p className="rounded-xl bg-ink-800 p-3 text-xs text-slate-400">
              Tap an item to see it. Items need stat points to wear, and points come from workouts. Die down here and the Fog takes what you wear and carry; leave by the stairs to keep it.
            </p>
          )}
          {item && !wornNow && gear.worn[item.slot] && (
            <p className="mt-2 text-[10px] text-slate-500">
              Now: <span style={{ color: RARITY[gear.worn[item.slot]!.rarity].color }}>{gear.worn[item.slot]!.name}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** What happened to your gear: home and into the vault, or taken by the Fog. */
function GearRecap({ out, vault }: { out: GearOutcome; vault: number }) {
  const rows = out.kept ? out.stored : out.lost;
  if (!rows.length && !out.left.length) return null;
  return (
    <div className="mt-4 w-full max-w-xs rounded-xl bg-ink-800 p-3 text-left ring-1 ring-ink-700">
      <p className={`font-pixel text-[9px] ${out.kept ? 'text-gold-300' : 'text-red-300'}`}>{out.kept ? 'Into your vault' : 'The Fog took'}</p>
      <ul className="mt-2 space-y-1">
        {rows.map((it) => (
          <li key={it.id} className={`flex items-center gap-2 text-xs ${out.kept ? '' : 'opacity-60'}`}>
            <ItemTile item={it} size={22} />
            <span style={{ color: RARITY[it.rarity].color }}>{it.name}</span>
          </li>
        ))}
      </ul>
      {out.left.length > 0 && (
        <p className="mt-2 text-[10px] text-slate-400">
          No room for {out.left.length} more (the vault holds {vault}). It grows with your workouts.
        </p>
      )}
    </div>
  );
}
