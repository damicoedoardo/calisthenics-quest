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
  arrow: { hp: 1.05, armor: 0, dmg: 1.22, move: 1, haste: 1 },
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
