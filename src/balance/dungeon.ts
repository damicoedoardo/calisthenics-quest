/* The Fog's dungeon: the dials the balance tests turn (scripts/fog-sim.mjs), elites, and run levels.
   Monsters and bosses stay as content in src/game/dungeon/content.ts; each zone's monster HP and
   damage are still in each chapter's `fog` block (src/story/chapters/), set by `pnpm fog:tune`.
   Goal for a zone: the bot wins about 1 in 3 runs when it opens, about 2 in 3 later on (ZONE_WINS). */

/** What the bot should win in a zone: the day it opens, and later on (6 workouts on; 18 for the last
    two zones, laterBy in src/sim/season.ts). `pnpm fog:tune` aims at these; `pnpm fog:sheet` flags a
    zone more than `slack` off. Harder = lower. The first zone's opening day is the very first run, at 0
    workouts: losing it is meant (the story's first lesson): there the bot wins about `first` (at most 3
    points over): Edoardo, 2026-10-28: "super tough, not impossible, maybe 1%". A top dodger in their
    best finds wins about 1 in 10. */
export const ZONE_WINS = { open: 0.33, later: 0.67, slack: 0.15, first: 0.02 } as const;

export const DIALS = {
  /** Monster HP, on top of the zone's. */
  hp: 1.3,
  /** How often monsters shoot (2 = twice as often). */
  fire: 2,
  /** How fast their shots fly. Goal: most shots slower than you walk (150), so you can step out of
      their way and feel in control, as in RotMG. */
  speed: 0.95,
  /** How hard a monster's shot hits (on top of the zone's damage). Goal: slow shots still matter:
      fewer, slower and harder hitting, so the room reads clearly and a hit is a mistake you saw. */
  shot: 1.5,
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

/** The bot that measures the zones plays like a person on a phone, not a machine (`src/game/dungeon/bot.ts`).
    Goal: its win rates are what a steady, careful player gets, so ZONE_WINS means the same for people.
    Modeled on how game bots are made human: a reaction that varies, fewer shots seen when the room
    is busy or a shot is fast, a few decisions a second, a thumb that is a little off. */
export const HUMAN = {
  /** Time to notice a new shot (s): each shot gets its own, between these two. */
  reaction: [0.28, 0.5] as [number, number],
  /** Chance to see a shot coming in a calm room. */
  notice: 0.92,
  /** Shots on screen before the room counts as busy, and the chance lost per shot past that. */
  calm: 12,
  busy: 0.01,
  /** Chance lost per walk-speed (150) a shot flies faster than 0.8 of your walk. */
  fast: 0.7,
  /** The chance never drops below this. */
  floor: 0.35,
  /** Seconds between decisions: the bot holds its stick in between (about 10 a second). */
  think: 0.1,
  /** How far off its thumb pushes (radians, either way). */
  aim: 0.3,
  /** Chance it misses the moment to dodge a shot it saw. */
  dodgeMiss: 0.25,
  /** Share of a floor's rooms it walks before taking the stairs: people search the whole floor for gear. */
  explore: 1,
};

/** The gear a real player walks into a zone with, for the bot that measures it (`src/sim/seasoned.ts`):
    the best they can wear of what earlier runs dropped (this zone's and the one before), forged with
    the embers training and melted loot gave. Goal: the zones are tuned for people who keep their
    best finds and forge them, not for a hero in the starter kit. */
export const SEASONED = {
  /** Items found so far: about what a handful of runs drops. */
  finds: 24,
  /** How lucky those finds were (0 a monster, 1 a chest, 2 a boss): most come from elites and chests. */
  luck: 0.8,
  /** Embers from melting what didn't fit, per find. */
  meltEach: 4,
};
