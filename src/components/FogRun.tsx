'use client';

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Backpack, Pause, Smartphone } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { fill, storyWords } from '@/story/engine';
import type { FogLines } from '@/story/types';
import { edgeFor, getUpgrade, nextGrowth, powerOf, recordsBroken, RUN_SECONDS, type RunResult, type UpgradeId, type Zone } from '@/lib/fog';
import { music } from '@/lib/music';
import { zoneMusic } from '@/lib/music-zones';
import { friendSheets, runSheets } from '@/game/sheets';
import type { FriendCard } from '@/lib/friends';
import type { ClassId } from '@/lib/gear';
import { buildOf } from '@/lib/stats';
import { MATS, type MatId } from '@/balance';
import { spWorn } from '@/lib/sp';
import { atRisk, settleGear, vaultSize, wornFor, type AtRisk, type GearOutcome } from '@/lib/fog-gear';
import { canWear, ITEM_SLOTS, nameOf, otherClass, RARITY, SLOT_NAME, type Item, type ItemSlot } from '@/game/dungeon/items';
import { ItemCard, ItemTile } from './ItemCard';
import { Sprite } from './Sprite';
import { SoundToggle, useMusic } from './Sound';
import { useKeyboardPlay } from './useDesk';
import type { FreePick, Hud, MiniMap, RunEnd, RunHandle } from '@/game/dungeon/scene';
import { ABILITIES, BAG, DODGE, RELICS, ROOM_KINDS, SP_MOVES, midBoss, type AbilityId, type CellKind, type RelicId, type SpMoveId } from '@/game/dungeon/engine';

interface Props {
  state: GameState;
  zone: Zone;
  /** Developer mode: skip to the boss or win from the pause menu. */
  dev: boolean;
  onEnd: (r: RunResult) => void;
  onLeave: () => void;
  /** Developer mode (/lab/night): start the first attempt at the mid-boss, at the boss, or won (the recap). */
  startAt?: RunStart;
  /** A party's run: the shared seed, and the friends who come along (played by bots until the
      game server exists). */
  party?: { seed: number; friends: FriendCard[] };
}

export type RunStart = 'mid' | 'boss' | 'win' | 'sp';


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
export function usePortrait(): boolean {
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
export function useSideways() {
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
export function FogRun({ state, zone, dev, onEnd, onLeave, startAt, party }: Props) {
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
  const [gearOut, setGearOut] = useState<(GearOutcome & { first: boolean }) | null>(null);
  // The game code couldn't be fetched (offline before the Play tab ever loaded it).
  const [failed, setFailed] = useState(false);
  // On a computer the buttons show their keys, and a tall window plays as it is.
  const keys = useKeyboardPlay();
  // Held upright, the run waits behind a "turn your phone" card.
  useSideways();
  const portrait = usePortrait() && !keys;
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
      run.current = startRun(el, { zone, lines: bossLines(zone, state), power: powerOf(state, new Date()), classId, sheets, autopilot: auto, fast: bot === 'fast', worn: wornFor(state),
        build: buildOf(state),
        edge: edgeFor(state, zone),
        sp: spWorn(state) || undefined,
        // Only the first attempt shares the party's seed; "Try again" is a run of your own.
        seed: party && attempt === 0 ? party.seed : undefined,
        friends: party?.friends.map((f) => ({ name: f.name, classId: f.class_id ?? undefined, ...friendSheets({ classId: f.class_id ?? undefined, look: f.look, tiers: f.look?.gear }) })),
      }, {
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
          setGearOut({ ...settleGear(state, r).out, first: !(state.fogGear?.deaths ?? 0) });
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
          else if (startAt === 'sp') {
            // the SP's moves to try: at the mid-boss, the final already full
            h?.skipToWarden();
            h?.fillFinal();
          }
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

  const resume = () => {
    setPaused(false);
    run.current?.resume();
  };

  // On a computer: Esc pauses (and closes whatever is open), B opens the bag, 1 2 3 pick a card,
  // Enter runs again once it's over. Moving, the ability and the dodge are the scene's own keys.
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = e.key.toLowerCase(),
      n = Number(e.key) - 1;
    if (end) {
      if (k === 'enter') setAttempt((a) => a + 1);
      else if (k === 'escape') onLeave();
      else return;
    } else if (offer) {
      if (!offer.choices[n]) return;
      pick(offer.choices[n]);
    } else if (chest) {
      const id = chest.choices[n];
      if (!id) return;
      setChest(null);
      run.current?.pickRelic?.(id);
    } else if (stairs) {
      const id = (['deeper', 'leave', 'stay'] as const)[k === 'escape' ? 2 : n];
      if (!id) return;
      setStairs(false);
      run.current?.stairs(id);
    } else if (bag) {
      if (k !== 'escape' && k !== 'b' && k !== 'i') return;
      openBag(false);
    } else if (paused) {
      if (k !== 'escape' && k !== 'p') return;
      resume();
    } else if (hud && !portrait && !e.defaultPrevented) {
      if (k === 'escape' || k === 'p') {
        run.current?.pause();
        setPaused(true);
      } else if (k === 'b' || k === 'i') openBag(true);
      else return;
    } else return;
    e.preventDefault();
    // A button clicked earlier keeps the focus: Space or Enter mustn't press it again.
    (document.activeElement as HTMLElement | null)?.blur?.();
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const left = hud ? Math.max(0, RUN_SECONDS - hud.seconds) : RUN_SECONDS;
  // What a fall would cost right now, and what the flame would hold.
  const risk = hud ? atRisk(state, hud.gear, new Date()) : null;

  return (
    <div className="fixed inset-0 z-50 touch-none select-none bg-ink-950" data-run-end={end ? JSON.stringify(end) : undefined}>
      <div ref={host} className="absolute inset-0" />

      {hud && !end && (
        // On a computer's big screen the HUD is drawn larger (zoom), so its bars read from a chair.
        <div className="run-t run-x pointer-events-none absolute inset-x-0 flex items-start gap-2 desk:[zoom:1.4]">
          <Vitals hud={hud} />
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex items-center gap-2 rounded-md bg-ink-950/70 px-2 py-1 ring-1 ring-white/5">
              {hud.climb != null ? (
                <p className="font-pixel text-[9px] text-sky-300">CLIMB · LEDGE {hud.climb + 1}</p>
              ) : hud.floor && hud.floors ? (
                <>
                  <p className={`font-pixel text-[9px] ${hud.boss ? 'text-red-400' : 'text-gold-300'}`}>{hud.boss ? 'BOSS' : `FLOOR ${hud.floor}`}</p>
                  <DepthMap floor={hud.floor} floors={hud.floors} boss={zone.bossName} midName={midName(zone)} mid={hud.wardenFloor ?? null} />
                </>
              ) : (
                <p className="font-pixel text-[9px] text-slate-100">{clock(left)}</p>
              )}
              <p className="font-mono text-[10px] leading-none text-slate-400">{hud.kills} down</p>
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
          <div className="flex w-[11.5rem] shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <BagButton bag={hud.gear.bag.length} risk={risk} flame={flameName || 'your flame'} keys={keys} onOpen={() => openBag(true)} />
              <button
                aria-label="Pause"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  run.current?.pause();
                  setPaused(true);
                }}
                className="pointer-events-auto relative grid h-9 w-9 place-items-center rounded-md bg-ink-950/70 text-slate-200 ring-1 ring-white/10 active:scale-95"
              >
                <Pause size={16} />
                {keys && <Key k="Esc" corner />}
              </button>
            </div>
            {hud.map && hud.climb == null && <FloorMap map={hud.map} floor={hud.floor} midName={midName(zone)} keys={keys} hold={(on) => (on ? run.current?.pause() : run.current?.resume())} />}
          </div>
        </div>
      )}

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
          {keys
            ? `WASD or the arrows to move; you attack on your own. Click a monster to aim at it. Space dodges shots, Q is ${ABILITIES[hud.ability?.id ?? 'charge'].name}. ${zone.bossName} waits ${hud.floors} floors down.`
            : `Drag to move; you attack on your own. Tap a monster to aim at it. Dodge slips through shots. ${zone.bossName} waits ${hud.floors} floors down.`}
        </p>
      )}

      {hud?.ability && !end && (
        <AbilityButton id={hud.ability.id} ready={hud.ability.ready} dodge={hud.dodge ?? 1} sp={hud.sp} keys={keys} onUse={() => run.current?.ability?.()} onDodge={() => run.current?.dodge?.()} onSkill={() => run.current?.skill?.()} onFinal={() => run.current?.final?.()} />
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
                {nameOf(found.item)}
              </p>
              <p className="text-[10px] text-slate-400">{otherClass(found.item, state.profile.classId) ? 'Into the bag. Not for your class.' : !canWear(found.item, buildOf(state), state.profile.classId) ? 'Into the bag. Train to wear it.' : 'Into the bag. Open it to wear.'}</p>
            </div>
          </div>
        </div>
      )}

      {bag && hud && risk && !end && (
        <BagPanel
          gear={hud.gear}
          build={buildOf(state)}
          cls={state.profile.classId}
          risk={risk}
          flame={flameName || 'your flame'}
          onWear={(id) => run.current?.wear(id)}
          onTakeOff={(slot) => run.current?.takeOff(slot)}
          onDrop={(id) => run.current?.dropItem(id)}
          onClose={() => openBag(false)}
        />
      )}

      {stairs && !end && (
        <div className="run-x absolute inset-0 flex items-center justify-center gap-4 overflow-y-auto bg-ink-950/85 py-3">
          <div className="w-full max-w-xs">
            <p className="font-pixel text-sm text-gold-300">The stairs</p>
            <p className="mt-2 text-xs text-slate-400">
              You catch your breath: HP full. Go down and keep what you find if you make it, or walk back up now and keep everything you carry.
            </p>
            {risk && (
              <div className="mt-3 rounded-lg bg-ink-900/90 p-2.5 ring-1 ring-ink-700">
                <RiskLine risk={risk} flame={flameName || 'your flame'} size={24} />
              </div>
            )}
          </div>
          <div className="w-full max-w-xs space-y-2">
            {(
              [
                [
                  'deeper',
                  'Go deeper',
                  `Floor ${(hud?.floor ?? 0) + 1}. ${risk?.lost.length ? `Fall, and you lose ${risk.lost.length} item${risk.lost.length === 1 ? '' : 's'}${risk.held ? ` (${flameName || 'your flame'} keeps ${nameOf(risk.held)})` : ''}.` : 'Nothing to lose yet.'}`,
                ],
                ['leave', 'Leave with your loot', `Home with ${hud ? hud.gear.bag.length : 0} item${hud?.gear.bag.length === 1 ? '' : 's'} in the bag. The dungeon starts over next time.`],
                ['stay', 'Not yet', 'Look round this floor first.'],
              ] as const
            ).map(([id, label, text], i) => (
              <button
                key={id}
                onClick={() => {
                  setStairs(false);
                  run.current?.stairs(id);
                }}
                className={`w-full rounded-xl p-3 text-left ring-1 active:scale-[.98] ${id === 'deeper' ? 'bg-gold-400 text-ink-950 ring-gold-200' : 'bg-ink-800 text-slate-100 ring-ink-700'}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {keys && <Key k={String(i + 1)} />}
                  {label}
                </span>
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
          <p className="font-pixel text-sm text-gold-300">{offer.free === 'fresh' ? 'Warmed up!' : offer.free === 'rested' ? 'Rested!' : offer.free === 'past' ? 'Kept at it!' : 'Level up!'}</p>
          <p className="mt-2 text-center text-xs text-slate-400">
            {offer.free === 'fresh'
              ? 'You trained in the last two days: take a free skill.'
              : offer.free === 'rested'
                ? `You rested, and ${flameName ?? 'your flame'} burns brighter for it: take a free skill.`
                : offer.free === 'past'
                  ? `You kept training after ${zone.bossName} ran out of hearts: take a free skill.`
                  : 'Pick a skill.'}
          </p>
          <div className="mt-4 flex w-full max-w-3xl items-stretch justify-center gap-2">
            {offer.choices.map((id, i) => {
              const u = getUpgrade(id),
                next = (offer.levels[id] ?? 0) + 1;
              return (
                <button key={id} onClick={() => pick(id)} className="relative flex max-w-[15rem] flex-1 flex-col items-center gap-2 rounded-xl bg-ink-800 p-3 text-center ring-1 ring-gold-400/30 shadow-[0_3px_0_#0b0d14] active:scale-[.98]">
                  {keys && <Key k={String(i + 1)} corner />}
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-900 text-gold-300">
                    <Sprite id="skillIcon" opts={{ name: id }} size={28} label="" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-col items-center gap-1">
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
          <div className="mt-4 flex w-full max-w-3xl items-stretch justify-center gap-2">
            {chest.choices.map((id, i) => {
              const n = chest.have[id] ?? 0;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setChest(null);
                    run.current?.pickRelic?.(id);
                  }}
                  className="relative flex max-w-[15rem] flex-1 flex-col items-center gap-2 rounded-xl bg-ink-800 p-3 text-center ring-1 ring-gold-400/30 shadow-[0_3px_0_#0b0d14] active:scale-[.98]"
                >
                  {keys && <Key k={String(i + 1)} corner />}
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-900 text-gold-300">
                    <Sprite id="relicIcon" opts={{ name: id }} size={28} label="" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-col items-center gap-1">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-ink-950/85 px-8 py-3">
          <p className="font-pixel text-sm text-slate-200">Paused</p>
          <p className="flex items-center text-xs text-slate-400">
            Sound <SoundToggle />
          </p>
          <button onClick={resume} className="w-full max-w-xs rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950">
            Keep going
          </button>
          <button onClick={onLeave} className="w-full max-w-xs rounded-xl bg-ink-800 py-3 text-sm text-slate-300">
            Leave the run
          </button>
          {keys && <KeyList />}
          {dev && (
            <div className="grid w-full max-w-md grid-cols-3 gap-2">
              {(
                [
                  ['Skip to the boss', () => run.current?.skipToBoss()],
                  ['Next floor', () => run.current?.skipFloor()],
                  ['The stairs card', () => run.current?.askStairs()],
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

      {end && <Results state={state} zone={zone} end={end} broken={broken} gear={gearOut} keys={keys} onAgain={() => setAttempt((a) => a + 1)} onLeave={onLeave} />}

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

/** A final just went off: its icon and name, small, under the HP, for a moment (a new key per
    final starts it over). */
function FinalBadge({ id }: { id: SpMoveId }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 1600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div role="status" className={`mt-1 flex w-fit items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 ring-1 ring-orange-300/60 transition-opacity duration-500 ${on ? 'opacity-100' : 'opacity-0'}`}>
      <Sprite id="spIcon" opts={{ name: id }} size={14} label="" />
      <span className="font-pixel text-[7px] text-orange-200">{SP_MOVES[id].name}</span>
    </div>
  );
}

/** HP, level and XP, top left: a short pixel bar each, the numbers on the HP bar, and the chest
    items you hold under them. */
function Vitals({ hud }: { hud: Hud }) {
  const share = hud.hp / hud.maxHp,
    relics = Object.entries(hud.relics ?? {}) as [RelicId, number][];
  return (
    <div className="w-[11.5rem] shrink-0">
      <div className="flex items-center gap-1.5 rounded-md bg-ink-950/70 px-1.5 py-1 ring-1 ring-white/5">
        <Sprite id="uiIcon" opts={{ name: 'heart' }} size={12} label="" className={share < 0.3 ? 'motion-safe:animate-pulse' : ''} />
        <div className="min-w-0 flex-1">
          <div className="relative h-3 overflow-hidden rounded-[2px] bg-ink-800 ring-1 ring-black/60" role="img" aria-label={`HP ${hud.hp} of ${hud.maxHp}`}>
            <div
              className={`h-full shadow-[inset_0_1px_0_rgba(255,255,255,.35),inset_0_-2px_0_rgba(0,0,0,.25)] transition-[width] duration-150 ${share < 0.3 ? 'bg-red-600' : 'bg-red-500'}`}
              style={{ width: `${share * 100}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-end pr-1 font-pixel text-[7px] text-white drop-shadow-[0_1px_0_#0b0d14]">
              {hud.hp}/{hud.maxHp}
            </span>
          </div>
          <div className="mt-[3px] flex items-center gap-1">
            <span className="font-pixel text-[7px] leading-none text-sky-300">LV{hud.level}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-[1px] bg-ink-800 ring-1 ring-black/60" role="img" aria-label={`Level ${hud.level}, ${hud.xp} of ${hud.xpNext} XP`}>
              <div className="h-full bg-sky-400 transition-[width] duration-150" style={{ width: `${(hud.xp / hud.xpNext) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
      {hud.sp && hud.sp.finals > 0 && <FinalBadge key={hud.sp.finals} id={hud.sp.final} />}
      {relics.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-0.5">
          {relics.map(([id, n]) => (
            <span key={id} className="flex items-center gap-0.5 rounded-sm bg-ink-950/70 px-0.5 py-0.5 text-gold-300" title={RELICS[id].name}>
              <Sprite id="relicIcon" opts={{ name: id }} size={12} label={RELICS[id].name} />
              {n > 1 && <span className="font-pixel text-[6px]">{n}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The bag, top right: how full it is, and in red how many things a fall would cost right now
    (a small flame when the flame would hold one of them). */
function BagButton({ bag, risk, flame, keys, onOpen }: { bag: number; risk: AtRisk | null; flame: string; keys: boolean; onOpen: () => void }) {
  const lost = risk?.lost.length ?? 0,
    full = bag >= BAG;
  return (
    <button
      aria-label={`Bag: ${bag} of ${BAG}.${lost ? ` ${lost} item${lost === 1 ? '' : 's'} at risk if you fall.` : ''}${risk?.held ? ` ${flame} keeps ${nameOf(risk.held)}.` : ''}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onOpen}
      className={`pointer-events-auto relative flex h-9 items-center gap-1 rounded-md bg-ink-950/70 px-2 ring-1 active:scale-95 ${full ? 'text-red-300 ring-red-400/60' : 'text-slate-200 ring-white/10'}`}
    >
      <Backpack size={15} />
      <span className="font-pixel text-[8px]">
        {bag}/{BAG}
      </span>
      {risk?.held && <Sprite id="uiIcon" opts={{ name: 'flame' }} size={10} label="" />}
      {keys && <Key k="B" corner />}
      {lost > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-[16px] rounded-sm bg-red-500 px-1 py-[3px] text-center font-pixel text-[7px] leading-none text-white ring-1 ring-ink-950">{lost}</span>}
    </button>
  );
}

/** A key on the keyboard that does what this button does, shown on a computer. `corner` pins it
    to the bottom right of the button it sits in. */
function Key({ k, corner = false }: { k: string; corner?: boolean }) {
  return (
    <kbd
      aria-hidden
      className={`pointer-events-none min-w-[16px] rounded-[3px] bg-ink-950 px-1 py-[3px] text-center font-pixel text-[7px] not-italic leading-none text-slate-200 ring-1 ring-slate-500/70 shadow-[0_2px_0_#0b0d14] ${corner ? 'absolute -bottom-1.5 -right-1.5' : 'inline-block'}`}
    >
      {k}
    </kbd>
  );
}

/** Every key of the run, in the pause menu on a computer. */
function KeyList() {
  const rows: [string, string][] = [
    ['WASD', 'Move (or the arrows)'],
    ['Click', 'Aim at a monster'],
    ['Q', 'Class ability'],
    ['R F', "Your SP's move and final"],
    ['Space', 'Dodge (or E, Shift)'],
    ['B', 'Bag'],
    ['M', 'Map'],
    ['1 2 3', 'Pick a card'],
    ['Esc', 'Pause'],
  ];
  return (
    <div className="grid w-full max-w-xs grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 rounded-xl bg-ink-900/90 p-3 ring-1 ring-ink-700">
      {rows.map(([k, what]) => (
        <Fragment key={k}>
          <span className="justify-self-end">
            <Key k={k} />
          </span>
          <span className="text-xs text-slate-400">{what}</span>
        </Fragment>
      ))}
    </div>
  );
}

/** An item tile with the flame's mark on it: the one item a fall leaves you (grey while the flame
    is cold and can't hold it). */
function Guarded({ children, on, label, cold = false }: { children: ReactNode; on: boolean; label: string; cold?: boolean }) {
  return (
    <span className="relative inline-grid">
      {children}
      {on && (
        <span className={`absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-sm bg-ink-950 ring-1 ${cold ? 'ring-slate-500' : 'ring-orange-400'}`}>
          <Sprite id="uiIcon" opts={{ name: 'flame' }} size={11} label={label} className={cold ? 'opacity-50 grayscale' : ''} />
        </span>
      )}
    </span>
  );
}

/** What a fall would cost, in short: the flame's item, and what the Fog would take. The bag panel
    and the stairs card both show it. */
function RiskLine({ risk, flame, size = 26 }: { risk: AtRisk; flame: string; size?: number }) {
  const Flame = flame.charAt(0).toUpperCase() + flame.slice(1);
  return (
    <div className="space-y-1.5 text-left">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className={`font-pixel text-[8px] leading-relaxed ${risk.lost.length ? 'text-red-300' : 'text-slate-400'}`}>
          {risk.lost.length ? `At risk if you fall: ${risk.lost.length} item${risk.lost.length === 1 ? '' : 's'}` : risk.held ? 'Nothing else at risk' : 'Nothing at risk yet'}
        </p>
        {risk.lost.map((it) => (
          <ItemTile key={it.id} item={it} size={size} />
        ))}
      </div>
      {risk.held && (
        <div className="flex items-center gap-2 text-[11px] text-orange-200">
          <Guarded on label={`Kept by ${flame} if you fall`}>
            <ItemTile item={risk.held} size={size} />
          </Guarded>
          <span>
            <span style={{ color: RARITY[risk.held.rarity].color }}>{nameOf(risk.held)}</span>: kept by {flame} if you fall.
          </span>
        </div>
      )}
      {risk.slip.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gold-200">
          {risk.slip.map((it) => (
            <ItemTile key={it.id} item={it} size={size} />
          ))}
          <span>Forged too well for the Fog to take: a fall only slips {risk.slip.length === 1 ? 'it' : 'them'} back to the safe mark below.</span>
        </div>
      )}
      {risk.cold && (
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <Guarded on cold label={`${Flame} can hold it once you train`}>
            <span className="opacity-60 grayscale">
              <ItemTile item={risk.cold} size={size} />
            </span>
          </Guarded>
          <span>
            {Flame} can&apos;t hold your <span style={{ color: RARITY[risk.cold.rarity].color }}>{nameOf(risk.cold)}</span> yet. Train, and {flame} keeps it if you fall.
          </span>
        </div>
      )}
    </div>
  );
}

/** How deep you are: a row of floors, filling as you go, the boss at the end; an ember marks the
    Warden's floor. */
function DepthMap({ floor, floors, boss, midName, mid }: { floor: number; floors: number; boss: string; midName: string; mid: number | null }) {
  return (
    <div className="flex items-center gap-[3px]" role="img" aria-label={`Floor ${floor} of ${floors}, ${mid ? `${midName.replace(/^The/, 'the')} on floor ${mid}, ` : ''}${boss} at the bottom.`}>
      {Array.from({ length: floors }, (_, i) => {
        const n = i + 1;
        return n === mid ? (
          <Sprite key={n} id="markIcon" opts={{ name: 'warden' }} size={11} label={midName} className={n < floor ? 'opacity-40' : n === floor ? 'motion-safe:animate-pulse' : ''} />
        ) : (
          <span key={n} className={`block h-2 w-1.5 rounded-[1px] ${n === floor ? 'bg-white ring-1 ring-gold-300 motion-safe:animate-pulse' : n < floor ? 'bg-gold-400/80' : 'bg-ink-600/90'}`} />
        );
      })}
      <Sprite id="markIcon" opts={{ name: 'boss' }} size={11} label="The boss" className={floor === floors ? 'motion-safe:animate-pulse' : 'opacity-70'} />
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

/** A room you haven't been in yet. */
const UNKNOWN_ROOM = { color: '#64748b', name: '?' };

/** The floor's map, top right: the rooms you've been in, filled in the color of what was there;
    the ones behind a door you haven't opened, as gray dashed outlines that don't say what waits
    there (the stairs too); you, the gold one. Tap for it big, with
    names; the run holds still while it's open. */
function FloorMap({ map, floor, midName, keys, hold }: { map: MiniMap; floor: number; midName: string; keys: boolean; hold: (on: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (on: boolean) => {
    setOpen(on);
    hold(on);
  };
  // M opens and closes it; Esc closes it (first, before the run's own keys see it).
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k !== 'm' && !(open && k === 'escape')) return;
    e.preventDefault();
    toggle(k === 'm' ? !open : false);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener('keydown', on, true);
    return () => window.removeEventListener('keydown', on, true);
  }, []);
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
            { color } = c.been || here ? MAP_LOOK[c.kind] : UNKNOWN_ROOM;
          return (
            <g key={c.id}>
              <rect x={x} y={y} width={s} height={s} rx={s / 6} fill={here ? '#fde68a' : c.been ? '#334155' : '#0b0d14'} stroke={here ? '#fbbf24' : color} strokeWidth={c.been && !here ? 1 : 2} strokeDasharray={c.been || here ? undefined : `${s / 5} ${s / 8}`} />
              {!names && c.been && !here && c.kind !== 'fight' && <rect x={x + s * 0.3} y={y + s * 0.3} width={s * 0.4} height={s * 0.4} fill={color} />}
              {names && (
                <text x={x + s / 2} y={y + s / 2 + 3} textAnchor="middle" fontSize={8} fill={here ? '#0b0d14' : color} fontFamily="monospace">
                  {here ? 'You' : !c.been ? UNKNOWN_ROOM.name : c.kind === 'warden' ? midName.split(' ').pop()!.slice(0, 7) : MAP_LOOK[c.kind].name}
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
        className="pointer-events-auto relative rounded-md bg-ink-950/60 p-1 ring-1 ring-white/5"
        aria-label={`Map of floor ${floor}: ${map.cells.filter((c) => c.been).length} rooms explored. Tap to open it.`}
        aria-expanded={open}
      >
        {draw(8, 3, false)}
        {keys && <Key k="M" corner />}
      </button>
      {open && (
        <div onPointerDown={(e) => e.stopPropagation()} onClick={() => toggle(false)} className="pointer-events-auto fixed inset-0 z-10 flex animate-fadein items-center justify-center bg-ink-950/70">
          <div className="max-h-full max-w-full overflow-auto rounded-xl bg-ink-950/95 p-3 ring-1 ring-gold-400/40">
            <p className="font-pixel text-[9px] text-gold-300">Floor {floor}</p>
            <div className="mt-2">{draw(44, 12, true)}</div>
            <p className="mt-2 max-w-xs text-[11px] leading-snug text-slate-400">Filled: rooms you've been in. Dashed: rooms behind a door, unknown until you go in. Find the stairs to go down. {keys ? 'M or Esc to close.' : 'Tap to close.'}</p>
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
    <div className="mx-auto mt-1.5 w-full max-w-xs">
      <p className={`text-center font-pixel text-[9px] ${ember ? 'text-orange-300' : 'text-violet-300'}`}>{name}</p>
      <div className={`mt-1 h-2.5 overflow-hidden rounded-sm bg-ink-800/90 ring-1 ${ember ? 'ring-orange-500/50' : 'ring-violet-500/40'}`}>
        <div className={`h-full transition-[width] duration-150 ${ember === 'hot' ? 'bg-red-500' : ember ? 'bg-orange-500' : 'bg-violet-500'}`} style={{ width: `${(hp / max) * 100}%` }} />
      </div>
    </div>
  );
}

/** The class ability: a big round button under your right thumb, filling up while it recharges.
    The dodge sits to its left, smaller, on its own short clock. With an SP on, its own move sits
    between them and its final over the ability, glowing once it's full. */
function AbilityButton({ id, ready, dodge, sp, keys, onUse, onDodge, onSkill, onFinal }: { id: AbilityId; ready: number; dodge: number; sp: Hud['sp']; keys: boolean; onUse: () => void; onDodge: () => void; onSkill: () => void; onFinal: () => void }) {
  const up = ready >= 1,
    dodgeUp = dodge >= 1;
  return (
    <div className="run-b run-r absolute flex items-end gap-3 desk:[zoom:1.4]">
      {sp && <SpButton id={sp.skill} ready={sp.skillReady} k="R" keys={keys} onUse={onSkill} />}
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
        <span className="mt-1 flex items-center gap-1 font-pixel text-[8px] text-slate-300">
          {keys && <Key k="Space" />}
          Dodge
        </span>
      </div>
      <div className="relative flex flex-col items-center">
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
        {sp && (
          <div className="absolute -top-[4.5rem]">
            <SpButton id={sp.final} ready={sp.finalReady} k="F" keys={keys} onUse={onFinal} final />
          </div>
        )}
        <span className="mt-1 flex items-center gap-1 font-pixel text-[8px] text-slate-300">
          {keys && <Key k="Q" />}
          {ABILITIES[id].name}
        </span>
      </div>
    </div>
  );
}

/** One of the SP's buttons: its own move (a clock) or its final (fills as you fight, and glows
    orange when it's ready). */
function SpButton({ id, ready, k, keys, final = false, onUse }: { id: SpMoveId; ready: number; k: string; keys: boolean; final?: boolean; onUse: () => void }) {
  const up = ready >= 1,
    on = final ? 'bg-orange-400 text-ink-950 ring-orange-200 shadow-[0_0_14px_rgba(251,146,60,.8)] active:scale-95' : 'bg-violet-300 text-ink-950 ring-violet-100 active:scale-95';
  return (
    <div className="mb-1 flex flex-col items-center">
      <button
        aria-label={SP_MOVES[id].name}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (up) onUse();
        }}
        className={`relative grid h-12 w-12 place-items-center overflow-hidden rounded-full ring-2 ${up ? on : 'bg-ink-800/90 text-slate-500 ring-ink-700'}`}
      >
        {!up && <span className={`absolute inset-x-0 bottom-0 ${final ? 'bg-orange-400/30' : 'bg-violet-300/30'}`} style={{ height: `${ready * 100}%` }} />}
        <Sprite id="spIcon" opts={{ name: id }} size={30} label="" className={up ? '' : 'opacity-50 grayscale'} />
      </button>
      <span className="mt-1 flex items-center gap-1 whitespace-nowrap font-pixel text-[8px] text-slate-300">
        {keys && <Key k={k} />}
        {/* The final sits over the ability at the screen's edge: a short word, its name on the button. */}
        {final ? 'Final' : SP_MOVES[id].name}
      </span>
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
      {end.hits !== undefined && end.seconds > 0 && (
        <p className="mt-2 text-left text-[11px] text-slate-400">
          Hits taken: {end.hits} ({(end.hits / (end.seconds / 60)).toFixed(1)} a minute)
        </p>
      )}
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

function Results({ state, zone, end, broken, gear, keys, onAgain, onLeave }: { state: GameState; zone: Zone; end: RunEnd; broken: ReturnType<typeof recordsBroken> | null; gear: (GearOutcome & { first: boolean }) | null; keys: boolean; onAgain: () => void; onLeave: () => void }) {
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
      {gear && <GearRecap out={gear} vault={vaultSize(state.sessions.length)} first={gear.first} flame={state.profile.flame} />}
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
        Run again{keys && <span className="ml-2 opacity-60">Enter</span>}
      </button>
      <button onClick={onLeave} className="mb-auto mt-2 w-full max-w-xs py-3 text-sm text-slate-400">
        Back
      </button>
    </div>
  );
}

/** The bag over the run: what you wear (three slots) and what you carry, with the flame's mark on
    the item a fall would leave you and what a fall would cost. Tap an item to see it, then wear it,
    take it off or leave it on the floor. */
function BagPanel({ gear, build, cls, risk, flame, onWear, onTakeOff, onDrop, onClose }: { gear: Hud['gear']; build: ReturnType<typeof buildOf>; cls: ClassId | undefined; risk: AtRisk; flame: string; onWear: (id: string) => void; onTakeOff: (slot: ItemSlot) => void; onDrop: (id: string) => void; onClose: () => void }) {
  const [pick, setPick] = useState<{ from: 'worn' | 'bag'; id: string } | null>(null);
  const all = [...Object.values(gear.worn), ...gear.bag].filter((x): x is Item => !!x),
    item = pick && all.find((x) => x.id === pick.id);
  const wornNow = item && gear.worn[item.slot]?.id === item.id;
  const kept = `Kept by ${flame} if you fall`,
    fate = (it: Item) =>
      it.starter
        ? { text: 'Starter kit: it always comes home.', cls: 'text-slate-400' }
        : it.id === risk.held?.id
          ? { text: `${kept}.`, cls: 'text-orange-200' }
          : it.id === risk.cold?.id
            ? { text: `At risk if you fall. Train, and ${flame} holds it.`, cls: 'text-red-300' }
            : { text: 'At risk if you fall. Leave by the stairs to keep it.', cls: 'text-red-300' };
  return (
    <div onPointerDown={(e) => e.stopPropagation()} className="run-x pointer-events-auto absolute inset-0 z-10 flex animate-fadein items-center justify-center bg-ink-950/85 py-2">
      <div className="flex max-h-full w-full max-w-3xl gap-3 overflow-auto rounded-xl bg-ink-950/95 p-3 ring-1 ring-gold-400/40">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <div>
              <p className="font-pixel text-[9px] text-gold-300">Worn</p>
              <div className="mt-2 flex gap-1.5">
                {ITEM_SLOTS.map((slot) => {
                  const it = gear.worn[slot],
                    held = !!it && it.id === risk.held?.id;
                  return (
                    <button key={slot} data-bag-item={it ? '' : undefined} onClick={() => it && setPick({ from: 'worn', id: it.id })} className={`flex flex-col items-center gap-1 rounded-lg p-1 ${pick?.id === it?.id && it ? 'bg-ink-800' : ''}`} aria-label={it ? `${nameOf(it)}${held ? `. ${kept}.` : ''}` : `${SLOT_NAME[slot]}: empty`}>
                      {it ? (
                        <Guarded on={held} label={kept}>
                          <ItemTile item={it} size={40} />
                        </Guarded>
                      ) : (
                        <span className="grid h-10 w-10 place-items-center rounded-lg border border-dashed border-ink-700 text-[9px] text-slate-600">empty</span>
                      )}
                      <span className={`text-[9px] ${held ? 'text-orange-300' : 'text-slate-500'}`}>{held ? 'Kept' : SLOT_NAME[slot]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-pixel text-[9px] text-gold-300">
                Bag {gear.bag.length}/{BAG}
              </p>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {Array.from({ length: BAG }, (_, i) => {
                  const it = gear.bag[i];
                  return it ? (
                    <button key={it.id} data-bag-item="" onClick={() => setPick({ from: 'bag', id: it.id })} className={`grid place-items-center rounded-lg p-1 ${pick?.id === it.id ? 'bg-ink-800' : ''}`} aria-label={nameOf(it)}>
                      <ItemTile item={it} size={36} dim={!canWear(it, build, cls)} than={gear.worn[it.slot] ?? 'none'} />
                    </button>
                  ) : (
                    <span key={i} className="mx-auto my-1 h-9 w-9 rounded-lg border border-dashed border-ink-800" />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-lg bg-ink-900 p-2 ring-1 ring-ink-700">
            <RiskLine risk={risk} flame={flame} size={22} />
          </div>
          <button onClick={onClose} className="mt-2 w-full rounded-lg bg-gold-400 py-2 font-pixel text-[9px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none">
            Back to the run
          </button>
        </div>
        <div className="w-56 shrink-0">
          {item ? (
            <>
              <ItemCard item={item} build={build} cls={cls} than={gear.worn[item.slot] ?? 'none'}>
                {wornNow ? (
                  !item.starter && (
                    <button onClick={() => onTakeOff(item.slot)} disabled={gear.bag.length >= BAG} className="flex-1 rounded-lg bg-ink-700 py-2 text-xs text-slate-200 disabled:opacity-40">
                      Take off
                    </button>
                  )
                ) : (
                  <>
                    <button onClick={() => onWear(item.id)} disabled={!canWear(item, build, cls)} className="flex-1 rounded-lg bg-gold-400 py-2 text-xs font-semibold text-ink-950 disabled:bg-ink-700 disabled:text-slate-500">
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
              <div className={`mt-2 flex items-center gap-1.5 text-[11px] ${fate(item).cls}`}>
                {item.id === risk.held?.id && <Sprite id="uiIcon" opts={{ name: 'flame' }} size={11} label="" />}
                {fate(item).text}
              </div>
            </>
          ) : (
            <p className="rounded-xl bg-ink-800 p-3 text-xs text-slate-400">
              Tap an item to see it. Items need stat points to wear, and points come from workouts. Fall down here and the Fog takes what you wear and carry; leave by the stairs to keep it.
            </p>
          )}
          {item && !wornNow && gear.worn[item.slot] && (
            <p className="mt-1 text-[10px] text-slate-500">
              Now: <span style={{ color: RARITY[gear.worn[item.slot]!.rarity].color }}>{nameOf(gear.worn[item.slot]!)}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** What happened to your gear: home and into the vault, or taken by the Fog. */
function GearRecap({ out, vault, first, flame }: { out: GearOutcome; vault: number; first: boolean; flame?: string }) {
  const rows = out.kept ? out.stored : out.lost,
    mats = (Object.entries(out.mats ?? {}) as [MatId, number][]).filter(([, n]) => n > 0);
  if (!rows.length && !out.left.length && !out.held && !out.slipped?.length && !mats.length) return null;
  return (
    <div className="mt-4 w-full max-w-xs rounded-xl bg-ink-800 p-3 text-left ring-1 ring-ink-700">
      {rows.length > 0 && <p className={`font-pixel text-[9px] ${out.kept ? 'text-gold-300' : 'text-red-300'}`}>{out.kept ? 'Into your vault' : 'The Fog took'}</p>}
      <ul className="mt-2 space-y-1">
        {rows.map((it) => (
          <li key={it.id} className={`flex items-center gap-2 text-xs ${out.kept ? '' : 'opacity-60'}`}>
            <ItemTile item={it} size={22} />
            <span style={{ color: RARITY[it.rarity].color }}>{nameOf(it)}</span>
          </li>
        ))}
      </ul>
      {out.held && (
        <p className="mt-2 flex items-center gap-2 text-xs text-orange-200">
          <ItemTile item={out.held} size={22} />
          {flame || 'Your flame'} held on to {nameOf(out.held)}.
        </p>
      )}
      {out.slipped?.map((it) => (
        <p key={it.id} className="mt-2 flex items-center gap-2 text-xs text-gold-200">
          <ItemTile item={it} size={22} />
          {nameOf(it)} came home with you, a few pluses lower.
        </p>
      ))}
      {mats.length > 0 && (
        <p className="mt-2 text-xs text-slate-300">
          Found for Mira&apos;s forge:{' '}
          {mats.map(([id, n], i) => (
            <span key={id} style={{ color: MATS[id].color }}>
              {i ? ', ' : ''}
              {n} {MATS[id].name.toLowerCase()}
            </span>
          ))}
        </p>
      )}
      {out.left.length > 0 && (
        <p className="mt-2 text-[10px] text-slate-400">
          No room for {out.left.length} more (the vault holds {vault}, and it grows with your workouts). Mira melted {out.left.length === 1 ? 'it' : 'them'} into {out.embers ?? 0} embers.
        </p>
      )}
      {!out.kept && out.lost.length > 0 && first && (
        <p className="mt-2 text-xs italic text-slate-300">
          <span className="not-italic text-gold-300">Mira:</span> &ldquo;The Fog takes what you carried, not who you are. Your training is still yours, and so is your flame.&rdquo;
        </p>
      )}
    </div>
  );
}
