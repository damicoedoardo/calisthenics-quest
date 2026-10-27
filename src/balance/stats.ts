/* Stat points: earned by training, spent on the Hero tab, used by the Fog (src/lib/stats.ts).
   Goal: a player who spreads their points ends six months (about 70 points in each of six stats)
   where 100 points in each of the old four ended: +60% damage, +48% attack speed, +75 HP, a fifth
   of each hit blocked; and on top, about +25% walk speed and one hit in five a crit. */

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

/** What the first point in each stat is worth (health in HP, the rest as a share: 0.0065 = +0.65%).
    speed is attack speed (shown as Haste), move is walk speed (shown as Speed), crit the chance of
    a hit doing double. Armor's is `ARMOR_PER_POINT`. */
export const POINT_WORTH = { health: 1.33, damage: 0.0087, speed: 0.0072, move: 0.0044, crit: 0.0026 } as const;

/** What every champion has before any point. */
export const STAT_BASE = { health: 0, armor: 0, damage: 0.12, speed: 0.08, move: 0, crit: 0.05 } as const;

/** How far loot and light fly to you, before items (0.15 = +15% on the base pull). */
export const PICKUP_REACH = 0.15;

/** A crit does this many times the hit. */
export const CRIT_HIT = 2;

/** How fast points lose worth: the FALLOFF-th point in a stat is worth half the first.
    Higher = putting everything in one stat pays off more. */
export const FALLOFF = 150;

/** Armor points: this share of every hit blocked per point (with the same falloff), at most `MAX_ARMOR`. */
export const ARMOR_PER_POINT = 0.0036;
export const MAX_ARMOR = 0.4;

/** Each class leans to one stat, as if it had this many extra points there. */
export const CLASS_LEAN_POINTS = 4;
