import { daysSinceLastSession, type GameState } from './game';
import { getPath, type PathId } from './skills';

/* The Fog: the game you play between workouts. A run is a few minutes of surviving waves of
   Fog creatures, picking new skills as you level, until the zone's boss shows up. Runs are free to
   replay and losing costs nothing. What makes you stronger, and what opens the next zone, is
   real training: your skill tree is your power, and your workouts call Ember to fight with you. */

export interface Zone {
  id: number;
  name: string;
  /** Workouts done before the zone opens (the zone before must be cleared too). */
  workouts: number;
  /** Enemy toughness. */
  hp: number;
  dmg: number;
  /** Ground color and the tint over the fog. */
  ground: string;
  fog: string;
}

export const ZONES: Zone[] = [
  { id: 0, name: 'The Ashen Edge', workouts: 0, hp: 1, dmg: 1, ground: '#231d2e', fog: '#4a3f63' },
  { id: 1, name: 'The Hollow Woods', workouts: 6, hp: 1.8, dmg: 1.25, ground: '#111a17', fog: '#1f3b33' },
  { id: 2, name: 'Mirror Lake', workouts: 15, hp: 3, dmg: 1.5, ground: '#101826', fog: '#253a5c' },
  { id: 3, name: 'The Plateau', workouts: 30, hp: 4.5, dmg: 1.8, ground: '#1c1712', fog: '#4a3a26' },
  { id: 4, name: 'The Summit', workouts: 50, hp: 6.5, dmg: 2.2, ground: '#1a1a22', fog: '#e2e8f0' },
];

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
}

export const NO_FOG: FogProgress = { cleared: 0, runs: 0, best: {} };

export type ZoneStatus = { state: 'cleared' | 'open' } | { state: 'locked'; why: string };

export function zoneStatus(state: GameState, zone: Zone): ZoneStatus {
  const fog = state.fog ?? NO_FOG;
  if (zone.id < fog.cleared) return { state: 'cleared' };
  if (zone.id > fog.cleared) return { state: 'locked', why: `Beat the boss of ${ZONES[zone.id - 1].name} first` };
  const left = zone.workouts - state.sessions.length;
  if (left > 0) return { state: 'locked', why: `Opens after ${zone.workouts} workouts: ${left} to go` };
  return { state: 'open' };
}

// ---------- power from training ----------

export interface Power {
  /** Skill-tree level per path: beaten skills, the same number that forges your gear. */
  levels: Record<PathId, number>;
  /** Push: extra damage (0.12 = +12%). */
  strike: number;
  /** Pull: extra attack speed, and a wider pickup reach. */
  reach: number;
  /** Core: extra max HP and less damage taken. */
  hold: number;
  armor: number;
  /** Ember's flames circling you, one more at each step of your workout count. */
  flames: number;
  /** Trained in the last two days: the run starts with a free skill. */
  fresh: boolean;
}

/** Workouts it takes for each of Ember's flames. */
export const FLAME_AT = [1, 6, 15, 30];

export function powerOf(state: GameState, now: Date): Power {
  const levels = state.progress;
  const gap = daysSinceLastSession(state, now);
  return {
    levels,
    strike: 0.12 * levels.push,
    reach: 0.08 * levels.pull,
    hold: 15 * levels.core,
    armor: Math.min(0.4, 0.04 * levels.core),
    flames: FLAME_AT.filter((n) => state.sessions.length >= n).length,
    fresh: gap !== null && gap <= 2,
  };
}

/** What your next real step would add, per path, for the "train to grow" hints. */
export function nextGrowth(state: GameState, path: PathId): string | null {
  const node = getPath(path).nodes[state.progress[path]];
  if (!node) return null;
  const gain = path === 'push' ? 'Strike +12%' : path === 'pull' ? 'Reach +8%' : 'Hold +15 HP';
  return `Beat ${node.name}: ${gain}`;
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
  { id: 'flame', name: "Ember's flame", text: () => 'One more flame circles you, burning what it touches.', max: 3 },
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
  return 5 + level * 4 + Math.floor((level * level) / 4);
}

// ---------- after a run ----------

export interface RunResult extends RunBest {
  zone: number;
}

export function recordRun(state: GameState, r: RunResult): GameState {
  const fog = state.fog ?? NO_FOG;
  const prev = fog.best[r.zone];
  const better = !prev || (r.won && !prev.won) || (r.won === prev.won && (r.won ? r.seconds < prev.seconds : r.seconds > prev.seconds));
  return {
    ...state,
    fog: {
      cleared: r.won && r.zone === fog.cleared ? fog.cleared + 1 : fog.cleared,
      runs: fog.runs + 1,
      best: better ? { ...fog.best, [r.zone]: { seconds: r.seconds, kills: r.kills, level: r.level, won: r.won } } : fog.best,
    },
  };
}
