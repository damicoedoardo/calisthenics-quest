/* Stat points: earned by training, spent on the Hero tab, used by the Fog (src/lib/stats.ts).
   Goal: a player who spreads their points ends six months (about 100 points a stat) at about
   +60% damage, +48% attack speed, +75 HP. */

/** Points for each thing done. */
export const POINTS = {
  /** A full workout. */
  full: 3,
  /** The minimum quest. */
  mini: 1,
  /** Each week that hit the weekly goal. */
  week: 2,
  /** A workout better than last time. */
  better: 1,
} as const;

/** Points every hero starts with, so the first run already has something to spend. */
export const STARTING_POINTS = 6;

/** What the first point in each stat is worth (health in HP, the rest as a share: 0.0065 = +0.65%). */
export const POINT_WORTH = { health: 1, damage: 0.0065, reach: 0.01, speed: 0.0054 } as const;

/** What every champion has before any point. */
export const STAT_BASE = { health: 0, damage: 0.12, reach: 0.15, speed: 0.08 } as const;

/** How fast points lose worth: the FALLOFF-th point in a stat is worth half the first.
    Higher = putting everything in one stat pays off more. */
export const FALLOFF = 150;

/** Health also gives armor: this much per point (with the same falloff), at most `MAX_ARMOR`. */
export const ARMOR_PER_POINT = 0.0027;
export const MAX_ARMOR = 0.4;

/** Each class leans to one stat, as if it had this many extra points there. */
export const CLASS_LEAN_POINTS = 4;
