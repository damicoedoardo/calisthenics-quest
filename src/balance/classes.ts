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
    weapon asks for this stat too). The archer leaned to Crit until crit left the stats: its crits
    come from the bow now (WEAPON_CRIT in items.ts). */
export const CLASS_LEAN = { warrior: 'damage', archer: 'speed', monk: 'health', mage: 'speed' } as const;

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

/** One SP move's numbers. Damage is times the class's base attack (ATTACK, as the passives; not
    the SP weapon's, so tuning a weapon leaves its moves alone); `cd` is the own move's clock (s);
    `r` a radius, `reach` how far it looks for a monster (or how long a beam, wall or throw is; a
    move aimed at the strongest looks in the whole room), `width` how wide a beam, wall, throw or
    dash is, `speed` how fast a dash or throw goes (px/s), `knock` how far it throws them, `clear`
    how much of `r` it wipes shots in (1 = all of it), `heal` a share of your HP (Soul Harvest: for
    each monster hit), `slow` how much slower monsters move, `secs` how long it lasts (a leap: the
    time in the air, untouchable), `n` how many hits or jumps, `every` a field's beat or the gap
    between a storm's hits (s), `boost` how much more a marked monster takes, or your next hit
    after a vanish (0.5 = half again). */
export interface SpMoveNumbers {
  dmg: number;
  cd?: number;
  r?: number;
  reach?: number;
  width?: number;
  knock?: number;
  clear?: number;
  heal?: number;
  slow?: number;
  secs?: number;
  speed?: number;
  n?: number;
  every?: number;
  boost?: number;
  pull?: number;
}

/** Each SP's own move (the second button). Tuned with `SP=n pnpm fog:sim`: every SP of a class
    within `CLASS_FAIR` of its first. */
export const SP_SKILL: Record<string, SpMoveNumbers> = {
  // warrior: Leap, Shield Wall, Harpoon, Reap
  leap: { cd: 10, reach: 260, secs: 0.3, r: 100, dmg: 0.9, knock: 220 },
  shieldwall: { cd: 12, secs: 2, r: 90, dmg: 0.5, knock: 260, clear: 1 },
  harpoon: { cd: 10, reach: 260, dmg: 1.2, pull: 95 },
  reap: { cd: 6, reach: 240, width: 26, dmg: 0.7, speed: 520 },
  // archer: Piercing Shot, Bomb, Call, Vanish
  piercing: { cd: 6, reach: 420, width: 16, dmg: 2.4 },
  bomb: { cd: 8, reach: 300, r: 80, secs: 3, every: 0.5, dmg: 0.6 },
  call: { cd: 7, r: 70, dmg: 2.2, knock: 160 },
  vanish: { cd: 12, secs: 1.5, boost: 1, dmg: 0 },
  // mage: Fire Wall, Bubble, Blessing, Curse
  firewall: { cd: 8, reach: 160, width: 22, secs: 3, every: 0.4, dmg: 0.6 },
  bubble: { cd: 8, reach: 280, secs: 2, dmg: 2 },
  blessing: { cd: 15, secs: 0.8, r: 90, dmg: 0.4, knock: 200, heal: 0.02, clear: 1 },
  curse: { cd: 8, reach: 260, secs: 5, boost: 0.5, dmg: 0.5 },
  // monk: Rising Dragon, Pounce, Tide Spin, Ki Wave
  risingdragon: { cd: 7, r: 110, dmg: 0.7, knock: 280, clear: 0.6 },
  pounce: { cd: 9, reach: 360, secs: 0.3, r: 70, dmg: 1, knock: 140 },
  tidespin: { cd: 10, secs: 2, r: 100, dmg: 0.5, knock: 260, clear: 1 },
  kiwave: { cd: 7, reach: 360, width: 20, dmg: 0.9 },
};

/** The SP's final fills by fighting, like the monk's calm: points for each hit landed and taken.
    Goal: about one final in a long fight (a mid-boss, a boss), not one a room. */
export const SURGE = { hit: 1, taken: 2, full: 300 } as const;

/** Each SP's final; a final always wipes the shots in its reach. */
export const SP_FINAL: Record<string, SpMoveNumbers> = {
  inferno: { r: 130, secs: 3, every: 0.3, dmg: 0.3 },
  judgment: { r: 150, dmg: 5.5, knock: 380 },
  tidalcharge: { speed: 900, secs: 0.6, width: 40, dmg: 3.4 },
  soulharvest: { dmg: 1.5, heal: 0.008 },
  arrowrain: { reach: 320, r: 170, secs: 3, every: 0.3, dmg: 0.9 },
  barrage: { dmg: 4.5 },
  pack: { n: 9, reach: 340, dmg: 2.4 },
  thousandcuts: { n: 10, reach: 380, dmg: 2.8 },
  meteor: { reach: 320, r: 180, dmg: 5, knock: 420 },
  tsunami: { dmg: 2.8, knock: 420 },
  radiance: { dmg: 1.4, slow: 0.6, secs: 2 },
  voidedge: { reach: 520, width: 60, dmg: 5 },
  dragonroar: { reach: 520, width: 50, dmg: 3 },
  hundredclaws: { r: 60, n: 10, every: 0.08, dmg: 0.35 },
  riverdance: { n: 10, reach: 320, dmg: 1.9 },
  spiritbomb: { reach: 340, r: 200, dmg: 2.8, knock: 400 },
};

/** Each SP weapon's basic attack, NosTale style: the weapon changes how you fight. `cd` and `dmg`
    are times the class's base attack (ATTACK); `reach` how far a swing goes or a shot flies (px),
    `arc` how wide a swing cuts (radians each side; 3.2 = all around), `pierce` how many monsters a
    shot goes through, `blast` a burst where a shot lands (px), `back` a throw that comes back
    (hitting each monster once each way), `heal` a share of your HP each hit, `cut` how wide a swing
    also knocks shots out of the air (radians each side; none when not set). Cutting shots is
    most of what keeps a fighter up close alive, and quick swings cut often, so it is the main
    lever for the close-up weapons. Goal: the SPs of a class win about as often as each other
    (`SP=n pnpm fog:sim`, within `CLASS_FAIR`), and each one feels like its weapon. */
export interface SpWeaponNumbers {
  cd: number;
  dmg: number;
  reach?: number;
  arc?: number;
  pierce?: number;
  blast?: number;
  back?: boolean;
  heal?: number;
  cut?: number;
}
export const SP_WEAPON: Record<string, SpWeaponNumbers> = {
  // warrior: slow wide axe, heavy hammer, long lance, wide scythe
  greataxe: { cd: 1.4, dmg: 1, arc: 2.4, reach: 95, cut: 0.7 },
  hammer: { cd: 1.2, dmg: 1.15, cut: 1.3 },
  lance: { cd: 1.15, dmg: 1, arc: 0.45, reach: 135, cut: 0.45 },
  scythe: { cd: 1.1, dmg: 0.64, arc: 1.6, reach: 115, cut: 0.4 },
  // archer: far piercing bow, slow cannon that bursts, boomerang that comes back, fast daggers
  longbow: { cd: 1.1, dmg: 1.1, pierce: 2 },
  cannon: { cd: 1.7, dmg: 1.5, blast: 55 },
  boomerang: { cd: 1.2, dmg: 0.7, reach: 200, back: true },
  daggers: { cd: 0.45, dmg: 0.32, arc: 1, reach: 75, cut: 0.38 },
  // mage: bursting fireballs, a quick water orb, a light that heals, a shadow sword up close
  flamestaff: { cd: 1, dmg: 1, blast: 70 },
  waterorb: { cd: 0.6, dmg: 0.7 },
  bellstaff: { cd: 1, dmg: 0.7, heal: 0.0005 },
  hexblade: { cd: 0.7, dmg: 1.9, arc: 1.6, reach: 85, cut: 1.6 },
  // monk: fast fists, faster claws, a staff that spins all round, ki blasts from far
  gauntlets: { cd: 0.5, dmg: 0.45, arc: 0.9, reach: 70, cut: 0.45 },
  claws: { cd: 0.4, dmg: 0.26, arc: 1.3, reach: 70, cut: 0.35 },
  bo: { cd: 1, dmg: 0.95 },
  kipalms: { cd: 0.9, dmg: 0.45 },
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
