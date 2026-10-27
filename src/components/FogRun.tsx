'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronsRight, CircleDot, Copy, Crosshair, Droplet, Flame, FlameKindling, Footprints, Gauge, Heart, HeartPlus, HeartPulse, Hourglass, Magnet, Pause, Shield, ShieldCheck, ShieldHalf, Skull, Sparkles, Sword, Swords, Waves, Wind, Zap, type LucideIcon } from 'lucide-react';
import { gearOf, type GameState } from '@/lib/game';
import { getUpgrade, nextGrowth, powerOf, RUN_SECONDS, ZONES, type RunResult, type UpgradeId, type Zone } from '@/lib/fog';
import { music } from '@/lib/music';
import { sheetFor } from '@/sprites/registry';
import { SoundToggle, useMusic } from './Sound';
import type { FreePick, Hud as SurviveHud, RunEnd as SurviveEnd, RunHandle as SurviveHandle } from '@/game/run';
import type { Hud as DungeonHud, RunEnd as DungeonEnd } from '@/game/dungeon/scene';
import { ABILITIES, DODGE, RELICS, WARDEN, type AbilityId, type RelicId } from '@/game/dungeon/engine';
import type { Sheet } from '@/sprites/registry';
import type { HeroOpts } from '@/sprites/characters/hero';
import type { BossSheetKey, Sheets } from '@/game/rules';

interface Props {
  state: GameState;
  zone: Zone;
  /** Developer mode: skip to the boss or win from the pause menu. */
  dev: boolean;
  onEnd: (r: RunResult) => void;
  onLeave: () => void;
}

const ICONS: Record<UpgradeId, LucideIcon> = {
  power: Sword,
  haste: Zap,
  multi: Copy,
  flame: Flame,
  spark: Sparkles,
  nova: CircleDot,
  swift: Wind,
  vital: Heart,
  magnet: Magnet,
  guard: Shield,
};

/* Every zone is a dungeon (src/game/dungeon), each with its own boss and ground. The old
   survive-the-waves run (src/game/run.ts) is kept behind isDungeon; both report through the same HUD. */
type Hud = SurviveHud & Partial<DungeonHud>;
type RunEnd = SurviveEnd & Partial<DungeonEnd>;
type RunHandle = SurviveHandle & { ability?: () => void; dodge?: () => void; skipFloor?: () => void; skipToWarden?: () => void; pickRelic?: (id: RelicId) => void; cycleTheme?: () => string };

const RELIC_ICONS: Record<RelicId, LucideIcon> = {
  whetstone: Swords,
  quick: Gauge,
  iron: ShieldHalf,
  boots: Footprints,
  heart: HeartPlus,
  hourglass: Hourglass,
  fang: Droplet,
  coal: Flame,
  charm: ShieldCheck,
};

const ABILITY_ICONS: Record<AbilityId, LucideIcon> = { charge: ChevronsRight, volley: Crosshair, blink: Sparkles, still: HeartPulse, shock: Waves };
/** The Warden's name at the start of a line. */
const WARDEN_NAME = WARDEN.name.replace(/^the/, 'The');

export const isDungeon = (zone: Zone) => zone.id < ZONES.length;

/** The dungeon boss sheets for a zone (by id: 1 the Mirror, 2 the Knight, 3 the Plateau, 4 the
    Hollow, 5 the Summit). Only the run's own boss is drawn: they're big and there are many. */
function bossSheets(zoneId: number, hero: Pick<HeroOpts, 'gear' | 'classId' | 'look'>): Partial<Record<BossSheetKey, Sheet>> {
  if (zoneId === 1)
    return { mirrorBoss: sheetFor('mirrorBoss', 'idle', hero), mirrorBossAttack: sheetFor('mirrorBoss', 'attack', hero), mirrorBossShatter: sheetFor('mirrorBossShatter', 'idle', hero) };
  if (zoneId === 2)
    return {
      knightBoss: sheetFor('knightBoss', 'idle', { stage: 0 }),
      knightBossAttack: sheetFor('knightBoss', 'attack', { stage: 0 }),
      knightBoss1: sheetFor('knightBoss', 'idle', { stage: 1 }),
      knightBoss1Attack: sheetFor('knightBoss', 'attack', { stage: 1 }),
      knightBoss2: sheetFor('knightBoss', 'idle', { stage: 2 }),
      knightBoss2Attack: sheetFor('knightBoss', 'attack', { stage: 2 }),
    };
  if (zoneId === 3)
    return {
      plateauBoss: sheetFor('plateauBoss', 'idle', { stage: 0 }),
      plateauBossAttack: sheetFor('plateauBoss', 'attack', { stage: 0 }),
      plateauBoss1: sheetFor('plateauBoss', 'idle', { stage: 1 }),
      plateauBoss1Attack: sheetFor('plateauBoss', 'attack', { stage: 1 }),
      plateauBoss2: sheetFor('plateauBoss', 'idle', { stage: 2 }),
      plateauBoss2Attack: sheetFor('plateauBoss', 'attack', { stage: 2 }),
    };
  if (zoneId === 4) return { hollowBoss: sheetFor('hollowBoss', 'idle'), hollowBossAttack: sheetFor('hollowBoss', 'attack'), hollowBossFade: sheetFor('hollowBossFade', 'idle') };
  if (zoneId === 5)
    return {
      summitBoss: sheetFor('summitBoss', 'idle'),
      summitBossAttack: sheetFor('summitBoss', 'attack'),
      wanderer: sheetFor('wanderer', 'idle'),
      mira: sheetFor('mira', 'idle'),
      vela: sheetFor('vela', 'idle'),
    };
  return {};
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A run in the Fog: the Phaser canvas, with the HUD, skill picks and results drawn over it. */
export function FogRun({ state, zone, dev, onEnd, onLeave }: Props) {
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
  const dungeon = isDungeon(zone);
  const [floorShown, setFloorShown] = useState<number | null>(null);
  const [chest, setChest] = useState<{ choices: RelicId[]; have: Partial<Record<RelicId, number>> } | null>(null);

  useMusic(end ? null : hud?.boss ? 'fogBoss' : 'fog');

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const gear = gearOf(state),
      classId = state.profile.classId,
      look = state.profile.look;
    // the regular monsters dressed for this zone (wet glass at the lake, scrap iron at the forges...)
    const z = { zone: zone.id };
    const sheets: Sheets = {
      hero: sheetFor('hero', 'idle', { gear, classId, look }),
      heroAttack: sheetFor('hero', 'attack', { gear, classId, look }),
      hollow: sheetFor('hero', 'idle', { gear, classId, look, variant: 'hollow' }),
      ember: sheetFor('ember', 'idle'),
      slime: sheetFor('slime', 'idle', z),
      wisp: sheetFor('wisp', 'idle', z),
      mirror: sheetFor('mirror', 'idle'),
      golem: sheetFor('golem', 'idle'),
      knight: sheetFor('knight', 'idle'),
      echo: sheetFor('hero', 'idle', { gear, classId, look, variant: 'echo' }),
      book: sheetFor('book', 'idle'),
      summit: sheetFor('summit', 'idle'),
      ram: sheetFor('ram', 'idle', z),
      smoke: sheetFor('smoke', 'idle', z),
      seeker: sheetFor('seeker', 'idle', z),
      splitter: sheetFor('splitter', 'idle', z),
      splitling: sheetFor('splitling', 'idle', z),
      shade: sheetFor('shade', 'idle', z),
      splitterPop: sheetFor('splitterPop', 'idle'),
      warden: sheetFor('warden', 'idle'),
      ...bossSheets(zone.id, { gear, classId, look }),
    };
    setHud(null);
    setEnd(null);
    setBoss(false);
    (dungeon ? import('@/game/dungeon/scene') : import('@/game/run')).then(({ startRun }) => {
      if (cancelled) return;
      run.current = startRun(el, { zone, power: powerOf(state, new Date()), classId, sheets, autopilot: auto, fast: bot === 'fast' }, {
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
        end: (r) => {
          music.sting(r.won ? 'victory' : 'defeat');
          setEnd(r);
          onEnd({ ...r, zone: zone.id });
        },
      });
    });
    return () => {
      cancelled = true;
      run.current?.destroy();
      run.current = null;
    };
    // A new attempt restarts the run; the state it starts from is read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, zone.id]);

  const pick = (id: UpgradeId) => {
    setOffer(null);
    run.current?.pick(id);
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
            <div className="min-w-0 flex-1">
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
                    const Icon = RELIC_ICONS[id];
                    return (
                      <span key={id} className="flex items-center gap-0.5 rounded bg-ink-800/90 px-1 py-0.5 text-gold-300" title={RELICS[id].name}>
                        <Icon size={10} />
                        {n > 1 && <span className="font-mono text-[8px]">{n}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="w-16 text-right">
              <p className={`font-pixel text-[11px] ${hud.boss ? 'text-red-400' : 'text-slate-100'}`}>
                {hud.climb != null ? 'CLIMB' : hud.boss ? 'BOSS' : hud.floor ? `${hud.floor}/${hud.floors}` : clock(left)}
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-400">{hud.climb != null ? `ledge ${hud.climb + 1}` : hud.floor && !hud.boss ? `room ${hud.room}/${hud.rooms}` : `${hud.kills} down`}</p>
            </div>
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
          {hud.warden && <BossBar name={WARDEN_NAME} hp={hud.warden.hp} max={hud.warden.max} ember={hud.warden.phase === 2 ? 'hot' : 'warm'} />}
        </div>
      )}

      {hud?.floor && hud.floors && hud.rooms && !end && <DepthMap floor={hud.floor} floors={hud.floors} room={hud.room ?? 1} rooms={hud.rooms} boss={zone.bossName} mid={hud.wardenFloor ?? null} />}

      {!hud && !end && <p className="absolute inset-x-0 top-1/2 text-center font-pixel text-[10px] text-slate-400">Into the Fog...</p>}

      {hud && !end && hud.seconds < (dungeon ? 7 : 5) && (
        <p className={`pointer-events-none absolute inset-x-6 text-center text-sm text-slate-300 animate-pulse ${dungeon ? 'bottom-44' : 'bottom-28'}`}>
          {dungeon
            ? `Drag to move; you attack on your own. Dodge slips through shots. ${zone.bossName} waits ${hud.floors} floors down.`
            : 'Drag anywhere to move. You attack on your own.'}
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
                ? `Halfway down. ${WARDEN_NAME} guards this floor's last room.`
                : `${(hud?.floors ?? floorShown) - floorShown} more below, then ${zone.bossName}. A breath on the stairs: a little HP back.`}
          </p>
        </div>
      )}

      {boss && !offer && (
        <div className="pointer-events-none absolute inset-x-6 top-28 rounded-2xl bg-ink-950/85 p-4 text-center ring-1 ring-violet-500/50">
          <p className="font-pixel text-xs leading-relaxed text-violet-300">{zone.boss === 'summit' ? 'The climb begins' : `${zone.bossName} walks out of the Fog`}</p>
          {zone.boss === 'hollow' && state.profile.voice && <p className="mt-2 text-sm italic text-slate-200">&ldquo;{state.profile.voice}&rdquo;</p>}
          <p className="mt-2 text-sm text-slate-200">{zone.hint}</p>
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
                Icon = ICONS[id],
                next = (offer.levels[id] ?? 0) + 1;
              return (
                <button key={id} onClick={() => pick(id)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-3 text-left ring-1 ring-gold-400/30 active:scale-[.98]">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink-900 text-gold-300">
                    <Icon size={22} />
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
              const Icon = RELIC_ICONS[id],
                n = chest.have[id] ?? 0;
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
                    <Icon size={22} />
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
                  ...(dungeon
                    ? ([
                        ['Next floor', () => run.current?.skipFloor?.()],
                        ['To the Warden', () => run.current?.skipToWarden?.()],
                      ] as const)
                    : []),
                  ...(dungeon ? ([[`Theme${theme ? `: ${theme}` : ''}`, () => setTheme(run.current?.cycleTheme?.() ?? null)]] as const) : []),
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

      {end && <Results state={state} zone={zone} end={end} onAgain={() => setAttempt((a) => a + 1)} onLeave={onLeave} />}
    </div>
  );
}

/** How deep you are: a ladder of floors down the left edge, filling as you go, the boss at the
    bottom. The floor you're on shows its rooms; an ember marks the Warden's floor. */
function DepthMap({ floor, floors, room, rooms, boss, mid }: { floor: number; floors: number; room: number; rooms: number; boss: string; mid: number | null }) {
  return (
    <div
      className="pointer-events-none absolute left-1.5 top-24 flex flex-col items-center gap-[3px] rounded-lg bg-ink-950/50 px-1 py-1.5"
      aria-label={`Floor ${floor} of ${floors}, ${mid ? `the Warden on floor ${mid}, ` : ''}${boss} at the bottom`}
    >
      {Array.from({ length: floors }, (_, i) => {
        const n = i + 1,
          here = n === floor,
          warden = n === mid;
        return (
          <div key={n} className="relative flex items-center">
            <div className={`flex items-center gap-[2px] ${here ? 'rounded-sm bg-gold-400/20 px-[2px] py-[2px] ring-1 ring-gold-300' : ''}`}>
              {here ? (
                Array.from({ length: rooms }, (_, r) => (
                  <span
                    key={r}
                    className={`h-1.5 w-1.5 rounded-[1px] ${r + 1 < room ? 'bg-gold-300' : r + 1 === room ? 'animate-pulse bg-white' : (n === floors || warden) && r + 1 === rooms ? (warden ? 'bg-orange-500' : 'bg-red-500') : 'bg-ink-700'}`}
                  />
                ))
              ) : (
                <span className={`block h-1.5 w-4 rounded-[1px] ${n < floor ? 'bg-gold-400/70' : 'bg-ink-700/90'}`} />
              )}
            </div>
            {warden && <FlameKindling size={10} strokeWidth={2.5} className={`absolute -right-3.5 ${n < floor ? 'text-orange-400/40' : 'text-orange-400'}`} />}
          </div>
        );
      })}
      <Skull size={14} className={`mt-0.5 ${floor === floors ? 'animate-pulse text-red-400' : 'text-red-400/70'}`} />
    </div>
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
  const Icon = ABILITY_ICONS[id],
    up = ready >= 1,
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
          <Wind size={20} className="relative" />
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
          <Icon size={26} className="relative" />
        </button>
        <span className="mt-1 font-pixel text-[8px] text-slate-300">{ABILITIES[id].name}</span>
      </div>
    </div>
  );
}

function Results({ state, zone, end, onAgain, onLeave }: { state: GameState; zone: Zone; end: RunEnd; onAgain: () => void; onLeave: () => void }) {
  const hints = (['push', 'pull', 'core'] as const).map((p) => nextGrowth(state, p)).filter((h): h is string => !!h);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/90 px-6 text-center">
      <p className={`font-pixel text-sm ${end.won ? 'text-gold-300' : 'text-slate-300'}`}>{end.won ? `${zone.name} cleared!` : 'The Fog took you'}</p>
      {end.height != null && <p className="mt-2 font-pixel text-[10px] text-sky-300">{end.height === 0 ? 'The first ledge waits for you.' : `You climbed ${end.height} ledge${end.height === 1 ? '' : 's'} high.`}</p>}
      <p className="mt-3 text-sm text-slate-300">{end.won ? <>The Wanderer: &ldquo;{zone.after}&rdquo;</> : end.floor ? 'The dungeon starts over from the top. Losing here costs nothing: come back stronger.' : 'Losing here costs nothing. Come back stronger.'}</p>
      {end.won && (
        <div className="mt-4 w-full max-w-xs rounded-xl bg-ink-800 p-3 text-left ring-1 ring-gold-400/30">
          <p className="font-pixel text-[9px] text-gold-300">You keep: {zone.keepsake.name}</p>
          <p className="mt-1 text-xs text-slate-400">{zone.keepsake.text}</p>
        </div>
      )}
      <div className="mt-5 grid w-full max-w-xs grid-cols-3 gap-2">
        {[
          end.floor ? ['Floor', end.won ? 'All' : `${end.floor}·${end.room}`] : ['Level', String(end.level)],
          ['Time', clock(end.seconds)],
          ['Down', String(end.kills)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-ink-800 py-2">
            <p className="font-mono text-lg font-bold text-slate-100">{v}</p>
            <p className="text-[10px] text-slate-500">{k}</p>
          </div>
        ))}
      </div>
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
      <button onClick={onLeave} className="mt-2 w-full max-w-xs py-3 text-sm text-slate-400">
        Back
      </button>
    </div>
  );
}
