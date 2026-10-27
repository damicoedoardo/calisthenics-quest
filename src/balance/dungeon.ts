/* The Fog's dungeon: the dials the balance tests turn (scripts/fog-sim.mjs), elites, and run levels.
   Monsters and bosses stay as content in src/game/dungeon/content.ts; each zone's monster HP and
   damage are still in each chapter's `fog` block (src/story/chapters/), set by `pnpm fog:tune`.
   Goal for a zone: the bot wins about 1 in 3 runs when it opens, about 2 in 3 later on (ZONE_WINS). */

/** What the bot should win in a zone: the day it opens, and later on (6 workouts on; 18 for the last
    two zones, laterBy in src/sim/season.ts). `pnpm fog:tune` aims at these; `pnpm fog:sheet` flags a
    zone more than `slack` off. Harder = lower. */
export const ZONE_WINS = { open: 0.33, later: 0.67, slack: 0.15 } as const;

export const DIALS = {
  /** Monster HP, on top of the zone's. */
  hp: 1.3,
  /** How often monsters shoot (2 = twice as often). */
  fire: 3,
  /** How fast their shots fly. */
  speed: 1.5,
  /** How many monsters a room holds. */
  crowd: 1,
  /** Share of HP back on the stairs to each new floor. */
  stairs: 1,
  /** How strong chest items are (1 = as their text says). */
  relic: 1,
  /** How much more HP monsters have on the boss's floor than on the first (2 = three times). */
  deep: 3,
  /** How much harder they hit there (3 = four times): chest items, levels and the dodge make you grow fast. */
  deepDmg: 3.6,
  /** Share of HP the shrine on each floor gives back. */
  shrine: 0.25,
};

/** An elite: this much more HP, damage, size and XP, and it takes this share of a room's crowd. */
export const ELITE = { hp: 2.4, dmg: 1.25, r: 1.25, xp: 1.5, crowd: 0.5 };

/** Light (XP) to the next level in a run: base + level * perLevel + level² / squareEvery (rounded down). */
export const RUN_LEVELS = { base: 5, perLevel: 4, squareEvery: 4 } as const;
