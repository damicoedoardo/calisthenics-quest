/* Stat points: earned by training, spent on the Hero tab, used by the Fog (src/lib/stats.ts).
   Goal: points are about 40% of a player's power growth (POWER_SPLIT in power.ts); a player who
   spreads their points ends six months (about 84 points in each of five stats) at about +87%
   damage, +70% attack speed, +115 HP, 23% of each hit blocked and about +28% walk speed. Crit is
   not a stat: it comes from weapons and item bonuses (CRIT here, WEAPON_CRIT in items.ts); its
   share of training went into the other five when it left. */

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
    speed is attack speed (shown as Haste), move is walk speed (shown as Speed). Armor's is
    `ARMOR_PER_POINT`. */
export const POINT_WORTH = { health: 1.736, damage: 0.01128, speed: 0.00937, move: 0.00424 } as const;

/** What every champion has before any point. */
export const STAT_BASE = { health: 0, armor: 0, damage: 0.12, speed: 0.08, move: 0 } as const;

/** How far loot and light fly to you, before items (0.15 = +15% on the base pull). */
export const PICKUP_REACH = 0.15;

/** Crits, Diablo-like: every hero has `base` chance and a crit does `hit` times the hit; weapons
    (WEAPON_CRIT) and item bonuses (crit, critDmg) add to both. Goal: crit is a gear choice, not
    a stat point. */
export const CRIT = { base: 0.05, hit: 2 } as const;
/** A crit does this many times the hit, before items (`CRIT.hit`). */
export const CRIT_HIT = CRIT.hit;

/** How fast points lose worth: the FALLOFF-th point in a stat is worth half the first.
    Higher = putting everything in one stat pays off more. */
export const FALLOFF = 150;

/** Armor points: this share of every hit blocked per point (with the same falloff), at most `MAX_ARMOR`. */
export const ARMOR_PER_POINT = 0.00347;
export const MAX_ARMOR = 0.4;

/** Each class leans to one stat, as if it had this many extra points there. */
export const CLASS_LEAN_POINTS = 4;
