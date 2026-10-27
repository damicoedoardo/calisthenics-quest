/* What the forge spends and the vault holds, between Fog runs (src/lib/forge.ts, fog-gear.ts).
   Goal: training is the main income; melting loot adds a little. One item from +0 to +5 takes
   about 5 weeks of training at 3 workouts a week. */

/** Embers a workout earns. */
export const EMBERS = {
  /** A full workout. */
  full: 10,
  /** The minimum quest. */
  mini: 4,
} as const;

/** Mira's forge. What each upgrade costs, +1 to +15, is STEPS in upgrades.ts. */
export const FORGE = {
  /** Roll one bonus again. */
  reroll: 15,
} as const;

/** Embers an item melts down into, by rarity... */
export const MELT = {
  common: 3,
  magic: 6,
  rare: 12,
  legendary: 30,
  /** ...and this much more for each plus on it (0.5: a +2 item melts for twice as much). */
  perPlus: 0.5,
} as const;

/** The vault at home. Goal: room grows with training, so keeping more is a reason to train. */
export const VAULT = {
  /** Slots to start with. */
  start: 4,
  /** One more slot every this many workouts... */
  every: 5,
  /** ...up to this many. */
  max: 20,
} as const;

/** Trained in the last this-many days: the flame keeps your guarded item if you fall. */
export const FLAME_GUARD_DAYS = 2;
