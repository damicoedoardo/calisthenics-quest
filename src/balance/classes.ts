/* The classes in the Fog: each one's body, attack, ability and the stats it leans to.
   Goal: each class plays its own way, and the bot's win rate for every class sits within 10
   points of the four's average, on a zone's first day and six workouts later (`pnpm fog:sim`).
   Feel comes first: a change that makes the classes play the same is not a fix. */

/** How far a class's average win rate may sit from the four's (0.1 = 10 points). `pnpm fog:sheet` checks it. */
export const CLASS_FAIR = 0.1;

/** Base attack per class: how often it fires (s) and how hard it hits. */
export const ATTACK = {
  slash: { cd: 0.9, dmg: 14 },
  arrow: { cd: 0.6, dmg: 10 },
  orb: { cd: 0.8, dmg: 15 },
  wave: { cd: 1.3, dmg: 11 },
} as const;

/** Each class against the others: HP, armor, damage (orbs and waves hit crowds, so less each),
    move speed and attack speed. Up close you have to walk in and back out, so the sword and open
    hands are quicker on their feet and swing faster. */
export const CLASS_BODY = {
  slash: { hp: 1.0, armor: 0.04, dmg: 0.85, move: 1.2, haste: 1.1 },
  wave: { hp: 1.25, armor: 0.12, dmg: 1.03, move: 1.15, haste: 1.1 },
  arrow: { hp: 1.12, armor: 0.03, dmg: 1.22, move: 1, haste: 1 },
  orb: { hp: 0.9, armor: 0, dmg: 0.67, move: 1, haste: 1 },
} as const;

/** Each class ability: its clock (s) and its size. Damage is times the class's base attack. */
export const ABILITY = {
  /** The warrior rushes ahead, untouchable, hitting what it passes. */
  charge: { cd: 6, speed: 620, secs: 0.28 },
  /** The archer looses arrows all around (they pierce `pierce` foes). */
  volley: { cd: 6, arrows: 16, dmg: 1.8, pierce: 2 },
  /** The mage vanishes `reach` px ahead and bursts where it lands. */
  blink: { cd: 8, reach: 150, r: 80, dmg: 1.5 },
  /** The monk breathes: heals a share of max HP and pushes everything away (its clock is CALM, below). */
  still: { cd: 14, heal: 0.15, r: 140, dmg: 1 },
  /** No class's yet: a knockback that wipes shots. */
  shock: { cd: 7, r: 110, dmg: 1.6 },
} as const;

/** The monk's Stillness charges from fighting, not from a clock, so hiding and waiting heals
    nothing. Goal: about one Stillness every 15 to 20 seconds of fighting, as the old 14-second
    clock gave, and the monk's win rate about where it was. */
export const CALM = {
  /** Calm for each hit the monk lands on a foe. */
  hit: 1,
  /** Calm for each hit the monk takes. */
  taken: 2,
  /** Calm it takes to breathe (Stillness is ready). Higher = fewer heals. */
  full: 44,
} as const;

/** The stat each class leans to, as if it had `CLASS_LEAN_POINTS` more points there (the class's
    weapon asks for this stat too). */
export const CLASS_LEAN = { warrior: 'damage', archer: 'crit', monk: 'health', mage: 'speed' } as const;

/** The second stat each class leans to, as if it had `SECOND_LEAN_POINTS` more points there: the
    warrior and monk take hits, the archer keeps its distance, the mage hits harder. */
export const SECOND_LEAN = { warrior: 'armor', archer: 'move', monk: 'armor', mage: 'damage' } as const;
export const SECOND_LEAN_POINTS = 2;

/* The SPs, like NosTale's specialist cards: each class has four. The Wanderer hands the first over
   after `SP_TRIAL.at` workouts, sealed; it wakes once you train `SP_TRIAL.workouts` more times and
   reach the mid-boss floor in the Fog. The others come with the story (`SP_GIFTS`), awake. Worn, a
   run has the class ability, the SP's own move, its final and its passive.
   Goal: an SP feels like a new way to fight; the game around it is tuned with the first one worn
   (zones in src/story/chapters), so the pace stays the same. Every SP of a class wins about as
   often as its first (within `CLASS_FAIR`), and the classes stay fair (`pnpm fog:sheet`, and
   `SP=2 pnpm fog:sheet` for the others). */
export const SP_TRIAL = { at: 3, workouts: 2 } as const;

/** When the story gives the 2nd, 3rd and 4th SP: after this many chapters beaten. Goal: one every
    month or two, the last before the final chapter. */
export const SP_GIFTS = { 2: 2, 3: 4, 4: 5 } as const;

/** One SP move's numbers. Damage is times the class's base attack; `cd` is the own move's clock
    (s); `r` a radius, `reach` how far it looks for a monster, `knock` how far it throws them,
    `clear` how much of `r` it wipes shots in (1 = all of it), `heal` a share of your HP, `slow` how
    much slower monsters move (for `secs`), `n` how many shots or jumps, `every` a field's beat (s). */
export interface SpMoveNumbers {
  dmg: number;
  cd?: number;
  r?: number;
  reach?: number;
  knock?: number;
  clear?: number;
  heal?: number;
  slow?: number;
  secs?: number;
  speed?: number;
  arrows?: number;
  spread?: number;
  pierce?: number;
  n?: number;
  every?: number;
}

/** Each SP's own move (the second button). */
export const SP_SKILL: Record<string, SpMoveNumbers> = {
  // warrior: Whirl, Quake, Thunder Dash, Sun Guard
  whirl: { cd: 7, r: 100, dmg: 1, knock: 260, clear: 0.7 },
  quake: { cd: 7, r: 130, dmg: 1.1, knock: 460 },
  thunderdash: { cd: 6, speed: 720, secs: 0.22, dmg: 1.6 },
  sunguard: { cd: 14, secs: 0.7, r: 90, dmg: 0.5, knock: 260, clear: 1 },
  // archer: Pin Shot, Frost Arrow, Thorn Trap, Shadow Step
  pin: { cd: 6, arrows: 5, spread: 0.12, dmg: 2.4, pierce: 6 },
  frostarrow: { cd: 6, arrows: 3, spread: 0.18, dmg: 3.4, pierce: 2 },
  thorntrap: { cd: 8, reach: 300, r: 80, secs: 3, every: 0.5, dmg: 0.55 },
  shadowstep: { cd: 6, speed: 660, secs: 0.22, dmg: 1.5 },
  // mage: Starfall, Crystal Shards, Hourglass, Void Step
  starfall: { cd: 8, reach: 260, r: 90, dmg: 1.3 },
  shards: { cd: 7, n: 10, dmg: 1.1, pierce: 1 },
  hourglass: { cd: 9, reach: 260, r: 100, secs: 3, every: 0.5, dmg: 0.75, slow: 0.6 },
  voidstep: { cd: 6, speed: 760, secs: 0.2, dmg: 1.8 },
  // monk: Palm Wave, Tiger Pounce, Lotus Bloom, Rising Sun
  palm: { cd: 9, r: 120, dmg: 0.7, knock: 320, clear: 1 },
  pounce: { cd: 8, speed: 680, secs: 0.22, dmg: 0.9 },
  lotus: { cd: 12, secs: 1.4, r: 110, dmg: 0.4, knock: 280, heal: 0.02, clear: 1 },
  risingsun: { cd: 7, reach: 220, r: 110, dmg: 1.3, knock: 320 },
};

/** The SP's final fills by fighting, like the monk's calm: points for each hit landed and taken.
    Goal: about one final in a long fight (a mid-boss, a boss), not one a room. */
export const SURGE = { hit: 1, taken: 2, full: 300 } as const;

/** Each SP's final; a final always wipes the shots in its reach. */
export const SP_FINAL: Record<string, SpMoveNumbers> = {
  phoenix: { r: 220, dmg: 4, knock: 300, clear: 1 },
  mountain: { reach: 300, r: 170, dmg: 5, knock: 420 },
  thunderclap: { n: 8, reach: 340, dmg: 3.6 },
  dawnbreak: { r: 240, dmg: 2, heal: 0.05 },
  rain: { dmg: 4.5 },
  blizzard: { r: 230, secs: 4, every: 0.5, dmg: 0.9, slow: 0.6 },
  wildvolley: { n: 28, dmg: 1.8, pierce: 4 },
  moonfall: { n: 10, reach: 380, dmg: 2.8 },
  sky: { r: 260, dmg: 3 },
  prism: { n: 8, reach: 340, dmg: 2.8 },
  stopsands: { dmg: 2.4, slow: 0.8, secs: 3 },
  rift: { r: 240, secs: 3, every: 0.4, dmg: 1.1 },
  palms: { r: 200, dmg: 2, heal: 0.1, knock: 400, clear: 1 },
  hundredclaws: { n: 10, reach: 320, dmg: 1.9 },
  nirvana: { r: 240, dmg: 1.6, heal: 0.08 },
  solarflare: { dmg: 3.2 },
};

/** Each SP's passive, always on while it's worn, NosTale style: it changes how you play more than
    how hard you hit. Embers: a hit can set a monster burning, `dmg` times your attack every
    `every` s for `secs`. Bedrock: standing still for `after` s, you take `cut` less. Static and
    Sunburst: every `every`th hit, a spark (to another monster) or a burst (round you) of `dmg`.
    Second Wind: once a floor, under `below` of your HP, heal `heal`. Tailwind: after a dodge you
    run `move` faster for `secs`. Frostbite: a hit can slow a monster by `slow` for `secs`. Harvest:
    a kill heals `heal`. Focus: above `above` of your HP, `crit` more crits. Split Star: every
    `every`th attack one more orb. Crystal Shell: after a dodge, a shell takes the next hit within
    `secs`. Swift Sands: the final fills `fill` times as fast. Rebound: a hit on you hits back `dmg`
    in `r`. Flow: a hit you land heals `heal`, at most every `every` s. Momentum: moving builds up
    to `dmg` more damage over `secs`. Quickstep: the dodge's clock is `cd` times as long. */
export const SP_PASSIVE = {
  embers: { chance: 0.2, secs: 2, every: 0.5, dmg: 0.1 },
  bedrock: { after: 0.4, cut: 0.55 },
  static: { every: 4, reach: 160, dmg: 0.8 },
  secondwind: { below: 0.25, heal: 0.1 },
  tailwind: { secs: 1.5, move: 0.4 },
  frostbite: { chance: 0.2, slow: 0.4, secs: 1.5 },
  harvest: { heal: 0.005 },
  focus: { above: 0.8, crit: 0.07 },
  splitstar: { every: 4 },
  shell: { secs: 3 },
  swiftsurge: { fill: 1.6 },
  rebound: { r: 120, dmg: 2 },
  flow: { heal: 0.004, every: 1 },
  momentum: { secs: 1.5, dmg: 0.1 },
  quickstep: { cd: 0.8 },
  sunburst: { every: 4, r: 90, dmg: 1.1 },
} as const;
