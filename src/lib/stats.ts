import type { ClassId } from './gear';
import type { GameState } from './game';
import { weekKey, WEEKLY_GOAL } from './game';

/* Stat points: training earns them, the champion spends them. Every workout gives points whatever it
   was (gym, a run, a stretch day), so the reward never depends on what the plan asked for. The
   player puts them into four stats and can take them all back for free at any time. Each point in
   the same stat gives a little less than the one before, so spreading pays and six months of points
   don't break the Fog. */

export type StatId = 'health' | 'damage' | 'reach' | 'speed';

export interface Stat {
  id: StatId;
  name: string;
  /** What it does in the Fog, in a few words. */
  text: string;
  /** The first point's worth; later points give less (see `statValue`). */
  per: number;
  /** How the value reads: "+12% damage", "+20 HP". */
  show: (v: number) => string;
}

const pct = (what: string) => (v: number) => `+${Math.round(v * 100)}% ${what}`;

/* Sized so a player who spreads their points ends six months (about 100 points a stat) where the
   old skill tree ended: +60% damage, +48% attack speed, +75 HP. */
export const STATS: Stat[] = [
  { id: 'health', name: 'Health', text: 'More HP, and you take a little less damage', per: 1, show: (v) => `+${Math.round(v)} HP` },
  { id: 'damage', name: 'Damage', text: 'Every hit lands harder', per: 0.0065, show: pct('damage') },
  { id: 'reach', name: 'Reach', text: 'You pick up light from further away', per: 0.01, show: pct('pickup range') },
  { id: 'speed', name: 'Speed', text: 'You attack faster', per: 0.0054, show: pct('attack speed') },
];

/** What every champion has before any point: the old skill tree's starting steps. */
export const BASE: Record<StatId, number> = { health: 0, damage: 0.12, reach: 0.15, speed: 0.08 };

export const getStat = (id: StatId) => STATS.find((s) => s.id === id)!;

/** Points for each thing done. */
export const POINTS = { full: 3, mini: 1, week: 2, better: 1 } as const;
/** Points every hero starts with, so the first run already has something to spend. */
export const STARTING_POINTS = 6;
/** How fast points lose worth: the 150th point in a stat is worth half the first. */
const FALLOFF = 150;
/** Health also gives armor: this much per point, at most `MAX_ARMOR`. */
const ARMOR_PER = 0.0027;
const MAX_ARMOR = 0.4;
/** Each class leans to one stat, as if it had this many extra points there. */
export const CLASS_LEAN_POINTS = 4;
export const CLASS_LEAN: Record<ClassId, StatId> = { warrior: 'damage', archer: 'reach', monk: 'health', mage: 'speed' };

export type Build = Partial<Record<StatId, number>>;

/** The total worth of n points in a stat with this first-point worth. */
export function statValue(per: number, n: number): number {
  return n <= 0 ? 0 : per * FALLOFF * Math.log(1 + n / FALLOFF);
}

/** Every point earned so far, with where it came from. */
export function pointsEarned(state: GameState): { total: number; lines: { label: string; points: number }[] } {
  const full = state.sessions.filter((s) => s.kind === 'full').length;
  const mini = state.sessions.length - full;
  const better = state.sessions.filter((s) => s.better).length;
  const weeks = new Map<string, number>();
  for (const s of state.sessions) {
    const k = weekKey(new Date(s.date));
    weeks.set(k, (weeks.get(k) ?? 0) + 1);
  }
  const goals = [...weeks.values()].filter((n) => n >= WEEKLY_GOAL).length;
  const lines = [
    { label: 'To start with', points: STARTING_POINTS },
    { label: `Full workouts (${full})`, points: full * POINTS.full },
    { label: `Short workouts (${mini})`, points: mini * POINTS.mini },
    { label: `Weekly goals hit (${goals})`, points: goals * POINTS.week },
    { label: `Better than last time (${better})`, points: better * POINTS.better },
  ].filter((l) => l.points > 0);
  return { total: lines.reduce((a, l) => a + l.points, 0), lines };
}

export function buildOf(state: GameState): Build {
  return state.build ?? {};
}

export function pointsSpent(state: GameState): number {
  return Object.values(buildOf(state)).reduce((a, n) => a + (n ?? 0), 0);
}

export function pointsFree(state: GameState): number {
  return Math.max(0, pointsEarned(state).total - pointsSpent(state));
}

/** Put n points (default one) into a stat, as many as are free. */
export function spendPoint(state: GameState, stat: StatId, n = 1): GameState {
  const add = Math.min(n, pointsFree(state));
  if (add <= 0) return state;
  const build = buildOf(state);
  return { ...state, build: { ...build, [stat]: (build[stat] ?? 0) + add } };
}

/** Take one point back out of a stat. */
export function refundPoint(state: GameState, stat: StatId): GameState {
  const build = buildOf(state);
  if (!build[stat]) return state;
  return { ...state, build: { ...build, [stat]: build[stat]! - 1 } };
}

/** Take every point back, free. */
export function resetBuild(state: GameState): GameState {
  return { ...state, build: {} };
}

/** Spread every free point over the four stats, each to the one with the fewest (the simulator's players, and dev mode). */
export function spendEvenly(state: GameState): GameState {
  let s = state;
  while (pointsFree(s) > 0) {
    const b = buildOf(s);
    const low = STATS.reduce((a, st) => ((b[st.id] ?? 0) < (b[a.id] ?? 0) ? st : a));
    s = spendPoint(s, low.id);
  }
  return s;
}

/** What the champion's points do, as the Fog uses them. */
export interface StatPower {
  /** Extra max HP. */
  health: number;
  /** Damage taken is cut by this share. */
  armor: number;
  /** Extra damage (0.12 = +12%). */
  damage: number;
  /** Extra pickup range for light (0.2 = +20%). */
  reach: number;
  /** Extra attack speed. */
  speed: number;
}

export function statPower(build: Build, classId?: ClassId): StatPower {
  const lean = classId ? CLASS_LEAN[classId] : null;
  const n = (id: StatId) => (build[id] ?? 0) + (lean === id ? CLASS_LEAN_POINTS : 0);
  const v = (id: StatId) => BASE[id] + statValue(getStat(id).per, n(id));
  return {
    health: v('health'),
    armor: Math.min(MAX_ARMOR, statValue(ARMOR_PER, n('health'))),
    damage: v('damage'),
    reach: v('reach'),
    speed: v('speed'),
  };
}

/** What one more point in a stat would add, for the + button's label. */
export function nextPoint(build: Build, stat: StatId, classId?: ClassId): string {
  const now = statPower(build, classId)[stat];
  const then = statPower({ ...build, [stat]: (build[stat] ?? 0) + 1 }, classId)[stat];
  const d = then - now;
  return stat === 'health' ? `+${d.toFixed(1)} HP` : `+${(d * 100).toFixed(1)}%`;
}
