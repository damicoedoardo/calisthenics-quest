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

/* The first SP, like NosTale's specialist cards: the Wanderer hands it over after `SP_TRIAL.at`
   workouts, sealed; it wakes once you train `SP_TRIAL.workouts` more times and reach the mid-boss
   floor in the Fog. Worn, a run has the class ability, the SP's own move and its final.
   Goal: the SP feels like a new way to fight, not a new tier of power: with it, a zone's win rate
   rises by about 10 points or less, and the classes stay within `CLASS_FAIR` (`pnpm fog:sheet`). */
export const SP_TRIAL = { at: 3, workouts: 2 } as const;

/** Each SP's own move (the second button): its clock (s) and size; damage is times the class's
    base attack. Whirl (warrior), Pin Shot (archer), Starfall (mage), Palm Wave (monk). */
export const SP_SKILL = {
  slash: { cd: 7, r: 100, dmg: 1, knock: 260 },
  arrow: { cd: 6, arrows: 5, spread: 0.12, dmg: 2.4, pierce: 6 },
  orb: { cd: 8, reach: 260, r: 90, dmg: 1.3 },
  wave: { cd: 9, r: 120, dmg: 0.7, knock: 320 },
} as const;

/** The SP's final fills by fighting, like the monk's calm: points for each hit landed and taken.
    Goal: about one final in a long fight (a mid-boss, a boss), not one a room. */
export const SURGE = { hit: 1, taken: 2, full: 300 } as const;

/** Each SP's passive, always on while it's worn, NosTale style: it changes how you play more than
    how hard you hit. Embers (warrior): a hit can set a monster burning, `dmg` times your slash
    every `every` s for `secs`. Tailwind (archer): after a dodge you run `move` faster for `secs`.
    Split Star (mage): every `every`th attack throws one more orb at another monster. Flow (monk):
    a hit you land heals `heal` of your HP, at most once every `every` s. Goal: the SP with its passive wins no more
    often than before (the fog sheet), each class still fair. */
export const SP_PASSIVE = {
  slash: { chance: 0.2, secs: 2, every: 0.5, dmg: 0.1 },
  arrow: { secs: 1.5, move: 0.4 },
  orb: { every: 4 },
  wave: { heal: 0.004, every: 1 },
} as const;

/** Each SP's final: Phoenix Blade (warrior, all around you), Arrow Rain (archer, every monster in
    the room), Falling Sky (mage, a wide blast that wipes every shot), Thousand Palms (monk, heals
    and pushes). Damage is times the class's base attack. */
export const SP_FINAL = {
  slash: { r: 220, dmg: 4 },
  arrow: { dmg: 4.5 },
  orb: { r: 260, dmg: 3 },
  wave: { r: 200, dmg: 2, heal: 0.1, knock: 400 },
} as const;
