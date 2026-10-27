import { daysSinceLastSession, type GameState } from './game';
import { dayKey } from './days';
import { PICKUP_REACH, RUN_LEVELS } from '@/balance';
import { buildOf, pointsFree, statPower } from './stats';
import { CHAPTERS } from '@/story/chapters';
import { chapterStart, storyState } from '@/story/engine';
import { isRested } from '@/story/daily';
import { flameStage, stageIndex } from '@/story/flame';
import type { FogBoss, FogZone } from '@/story/types';
import type { Item, ItemSlot } from '@/game/dungeon/items';

/* The Fog: the game you play between workouts. A run is a few minutes of surviving waves of
   Fog creatures, picking new skills as you level, until the zone's boss shows up. Runs are free to
   replay and losing costs nothing. What makes you stronger, and what opens the next zone, is
   real training: your workouts earn stat points you put into your champion, and call your flame to
   fight with you.
   Each chapter of the story has a zone, written in its chapter file (src/story/chapters). */

export interface Zone extends FogZone {
  id: number;
  /** The chapter it belongs to: the zone opens when that chapter starts (and the zone before is cleared). */
  chapter: number;
  /** Workouts done when that chapter starts. */
  workouts: number;
  bossName: string;
}

export const BOSS_NAME: Record<FogBoss, string> = {
  tomorrow: 'Tomorrow',
  mirror: 'The Mirror',
  knight: 'The Perfect Knight',
  plateau: 'The Plateau',
  hollow: 'The Hollow',
  summit: 'The Summit',
};

export const ZONES: Zone[] = CHAPTERS.map((c, i) => ({ ...c.fog, id: i, chapter: c.n, workouts: chapterStart(c.n), bossName: BOSS_NAME[c.fog.boss] }));

/** How long you survive before the boss walks out of the fog. */
export const RUN_SECONDS = 240;

export interface RunBest {
  seconds: number;
  kills: number;
  level: number;
  won: boolean;
}

export interface FogProgress {
  /** Zones whose boss has fallen, in order. */
  cleared: number;
  runs: number;
  best: Record<number, RunBest>;
  /** A dungeon zone's records, each kept on its own: deepest, most monsters, fastest win. */
  records?: Record<number, RunRecord>;
  /** The last run, for the flame to talk about on Today. */
  last?: LastRun;
}

/** What the flame remembers about the last run. */
export interface LastRun {
  zone: number;
  won: boolean;
  /** The day it was played (dayKey). */
  day: string;
  /** It beat one of the zone's records. */
  record: boolean;
  /** The zone's boss fell for the first time. */
  firstClear: boolean;
  /** It got past the mid-boss (or won). */
  pastMid: boolean;
}

/** The floor the mid-boss guards, from 1 (the dungeon's wardenFloor(LAYOUT), counted from 0, plus one). */
export const MID_FLOOR = 5;

export interface RunRecord {
  /** How deep: floor * 10 + room, or 1000 for a win. */
  depth: number;
  kills: number;
  /** The fastest win (s), once there is one. */
  fastest: number | null;
}

const depthOf = (r: RunResult) => (r.won ? 1000 : (r.floor ?? 0) * 10 + (r.room ?? 0));

/** Which of a zone's records this run beats (nothing on the first run, when there is no record yet). */
export function recordsBroken(prev: RunRecord | undefined, r: RunResult) {
  return {
    depth: !!prev && depthOf(r) > prev.depth,
    kills: !!prev && r.kills > prev.kills,
    fastest: !!prev && r.won && (prev.fastest === null || r.seconds < prev.fastest),
  };
}

export const NO_FOG: FogProgress = { cleared: 0, runs: 0, best: {} };

export type ZoneStatus = { state: 'cleared' | 'open' } | { state: 'locked'; why: string };

export function zoneStatus(state: GameState, zone: Zone): ZoneStatus {
  const fog = state.fog ?? NO_FOG;
  if (zone.id < fog.cleared) return { state: 'cleared' };
  if (zone.id > fog.cleared) return { state: 'locked', why: `Beat the boss of ${ZONES[zone.id - 1].name} first` };
  const story = storyState(state);
  if (!story.finished && story.index + 1 < zone.chapter) {
    const left = zone.workouts - state.sessions.length;
    return { state: 'locked', why: `Opens with chapter ${zone.chapter}: ${left} workout${left === 1 ? '' : 's'} to go` };
  }
  return { state: 'open' };
}

// ---------- a boss with no hearts left ----------

/** Once a chapter's hearts are all gone (every workout it asks for is done), its boss fights with
    less HP, and every workout after that starts each run with one more free skill, up to `picks`. */
export const EDGE = { bossHp: 0.7, picks: 6 };

export interface Edge {
  /** The boss's HP is this share of normal (1 while the chapter still has hearts). */
  bossHp: number;
  /** Free skills at the start of a run, one per workout since the hearts ran out. */
  picks: number;
}

export const NO_EDGE: Edge = { bossHp: 1, picks: 0 };

/** Workouts done since the zone's chapter ran out of hearts; null while it still has some. */
export function workoutsPastHearts(state: GameState, zone: Zone): number | null {
  const past = state.sessions.length - chapterStart(zone.chapter + 1);
  return past < 0 ? null : past;
}

export function edgeFor(state: GameState, zone: Zone): Edge {
  const past = workoutsPastHearts(state, zone);
  return past === null ? NO_EDGE : { bossHp: EDGE.bossHp, picks: Math.min(EDGE.picks, past) };
}

// ---------- power from training ----------

export interface Power {
  /** Extra max HP, from Health points. */
  health: number;
  /** Damage taken is cut by this share, from Armor points. */
  armor: number;
  /** Extra damage (0.12 = +12%), from Damage points. */
  damage: number;
  /** Wider pickup reach for light (0.2 = +20%): the same for everyone, more from items. */
  reach: number;
  /** Extra attack speed, from Haste points. */
  speed: number;
  /** Extra walk speed, from Speed points. */
  move: number;
  /** The chance a hit does double, from Crit points. */
  crit: number;
  /** Your flame's fire circling you, one more at each step of your workout count. */
  flames: number;
  /** Trained in the last two days: the run starts with a free skill. */
  fresh: boolean;
  /** Rested (a day off, or a minute by the fire): one more free skill. */
  rested: boolean;
  /** Your flame is a bonfire: it throws fireballs. */
  fireballs: boolean;
  /** Your flame is a fire fairy: it heals you a little when you're low. */
  fairy: boolean;
  /** What you named it. */
  flameName: string;
}

/** Workouts it takes for each of your flame's fires to circle you. */
export const FLAME_AT = [1, 6, 15, 30];

export function powerOf(state: GameState, now: Date): Power {
  const gap = daysSinceLastSession(state, now);
  const stage = stageIndex(flameStage(state.sessions.length).id);
  return {
    ...statPower(buildOf(state), state.profile.classId),
    reach: PICKUP_REACH,
    flames: FLAME_AT.filter((n) => state.sessions.length >= n).length,
    fresh: gap !== null && gap <= 2,
    rested: isRested(state, now),
    fireballs: stage >= stageIndex('bonfire'),
    fairy: stage >= stageIndex('fairy'),
    flameName: state.profile.flame ?? '',
  };
}

/** The "train to grow" hint: points waiting to be spent, or what earns the next ones. */
export function nextGrowth(state: GameState): string {
  const free = pointsFree(state);
  if (free > 0) return `${free} point${free === 1 ? '' : 's'} to spend on the Hero tab`;
  return 'Every workout earns points for your champion';
}

// ---------- skills you pick during a run ----------

export type UpgradeId = 'power' | 'haste' | 'multi' | 'flame' | 'spark' | 'nova' | 'swift' | 'vital' | 'magnet' | 'guard';

export interface Upgrade {
  id: UpgradeId;
  name: string;
  /** What the next level does. */
  text: (next: number) => string;
  max: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'power', name: 'Heavy hands', text: () => 'Your attack hits 25% harder.', max: 5 },
  { id: 'haste', name: 'Quick hands', text: () => 'You attack 18% faster.', max: 5 },
  { id: 'multi', name: 'One more', text: (n) => (n === 1 ? 'Your attack fires twice.' : `Your attack fires ${n + 1} times.`), max: 3 },
  { id: 'flame', name: "{flame}'s fire", text: () => 'One more flame circles you, burning what it touches.', max: 3 },
  { id: 'spark', name: 'Spark', text: (n) => (n === 1 ? 'Every 2 s, lightning jumps between 3 foes.' : `Lightning jumps to ${2 + n} foes and hits harder.`), max: 4 },
  { id: 'nova', name: 'Ash nova', text: (n) => (n === 1 ? 'Every 3 s, a burst of light pushes foes back.' : 'The burst grows wider and hits harder.'), max: 4 },
  { id: 'swift', name: 'Swift feet', text: () => 'You move 12% faster.', max: 3 },
  { id: 'vital', name: 'Second breath', text: () => '+25 max HP, and you heal fully.', max: 4 },
  { id: 'magnet', name: 'Pull', text: () => 'You pick up light from 50% further away.', max: 3 },
  { id: 'guard', name: 'Stand firm', text: () => 'You take 10% less damage.', max: 3 },
];

export const getUpgrade = (id: UpgradeId) => UPGRADES.find((u) => u.id === id)!;

/** Three different skills that aren't maxed, picked at random. */
export function rollUpgrades(levels: Partial<Record<UpgradeId, number>>, rng: () => number = Math.random): UpgradeId[] {
  const pool = UPGRADES.filter((u) => (levels[u.id] ?? 0) < u.max).map((u) => u.id);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

/** Light needed to go from `level` to the next one. */
export function xpToNext(level: number): number {
  return RUN_LEVELS.base + level * RUN_LEVELS.perLevel + Math.floor((level * level) / RUN_LEVELS.squareEvery);
}

// ---------- after a run ----------

export interface RunResult extends RunBest {
  zone: number;
  /** In a dungeon: the deepest floor and room reached, from 1. */
  floor?: number;
  room?: number;
  /** How it ended ('left': out by the stairs, keeping what you carried). */
  why?: string;
  /** What you wore and carried at the end (fog-gear.ts settles it into the save). */
  gear?: { worn: Partial<Record<ItemSlot, Item>>; bag: Item[] };
}

function mergeRecord(prev: RunRecord | undefined, r: RunResult): RunRecord {
  const fast = r.won ? r.seconds : null;
  if (!prev) return { depth: depthOf(r), kills: r.kills, fastest: fast };
  return { depth: Math.max(prev.depth, depthOf(r)), kills: Math.max(prev.kills, r.kills), fastest: fast === null ? prev.fastest : prev.fastest === null ? fast : Math.min(prev.fastest, fast) };
}

export function recordRun(state: GameState, r: RunResult, now: Date = new Date()): GameState {
  const fog = state.fog ?? NO_FOG;
  const prev = fog.best[r.zone];
  const broken = recordsBroken(fog.records?.[r.zone], r);
  const last: LastRun = {
    zone: r.zone,
    won: r.won,
    day: dayKey(now),
    record: r.floor ? broken.depth || broken.kills || broken.fastest : false,
    firstClear: r.won && r.zone === fog.cleared,
    pastMid: r.won || (r.floor ?? 0) > MID_FLOOR,
  };
  const better = !prev || (r.won && !prev.won) || (r.won === prev.won && (r.won ? r.seconds < prev.seconds : r.seconds > prev.seconds));
  return {
    ...state,
    fog: {
      cleared: r.won && r.zone === fog.cleared ? fog.cleared + 1 : fog.cleared,
      runs: fog.runs + 1,
      best: better ? { ...fog.best, [r.zone]: { seconds: r.seconds, kills: r.kills, level: r.level, won: r.won } } : fog.best,
      ...(r.floor ? { records: { ...fog.records, [r.zone]: mergeRecord(fog.records?.[r.zone], r) } } : fog.records ? { records: fog.records } : {}),
      last,
    },
  };
}
