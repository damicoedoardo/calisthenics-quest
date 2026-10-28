/* Items the Fog drops: how strong, how rare, how much they ask (src/game/dungeon/items.ts), and
   how often they drop (src/game/dungeon/engine.ts). An item's level is zone * 10 + floor. After a
   change: `pnpm balance`, then `pnpm fog:tune` (items shift the win rates). */

/** How much the dungeon's finds give next to the starter kit. Higher = items matter more.
    Goal: gear is about 40% of a player's power growth (POWER_SPLIT in power.ts). */
export const ITEM_POWER = 1.68;

/** What an item gives just for wearing it, before rarity and the roll: at level 0, and more per level. */
export const ITEM_BASE = {
  /** A weapon's damage (0.03 = +3%). */
  weaponDamage: 0.03,
  weaponDamagePerLevel: 0.0018,
  /** Armor's HP... */
  armorHealth: 4,
  armorHealthPerLevel: 0.5,
  /** ...and its armor (share of damage taken away). */
  armorArmor: 0.01,
  armorArmorPerLevel: 0.0004,
} as const;

/** Each rolled number lands between this share of its full size and the full size (0.75: 75-100%). */
export const ITEM_ROLL_LOW = 0.75;

/** What a drop is: a weapon below `weapon`, armor below `armor`, else a charm (0.4 / 0.75: 40% / 35% / 25%). */
export const SLOT_ODDS = { weapon: 0.4, armor: 0.75 } as const;

/** Each bonus's size at item level 0 (`base`) and how much it grows per level (`per`), before ITEM_POWER. */
export const BONUS_SIZE = {
  damage: { base: 0.02, per: 0.001 },
  speed: { base: 0.02, per: 0.001 },
  health: { base: 3, per: 0.4 },
  armor: { base: 0.006, per: 0.0003 },
  move: { base: 0.02, per: 0.0006 },
  heal: { base: 0.3, per: 0.02 },
  cooldown: { base: 0.03, per: 0.0012 },
  /** Crit chance (0.02 = +2 points of chance). */
  crit: { base: 0.02, per: 0.0006 },
  /** Crit damage: added to what a crit does (0.1 = a crit does x2.1 instead of x2). */
  critDmg: { base: 0.08, per: 0.004 },
  /** Slayer: more damage to elites, golems, the mid-boss and the boss. */
  slayer: { base: 0.04, per: 0.002 },
  /** Life steal: this share of the damage you deal comes back as HP. */
  leech: { base: 0.004, per: 0.0002 },
  /** Evade: the chance a hit on you misses entirely (at most MAX_EVADE). */
  evade: { base: 0.007, per: 0.0003 },
  /** Ability power: the class ability and the SP's moves hit harder. */
  power: { base: 0.04, per: 0.002 },
} as const;

/** Which bonuses each slot can roll (the forge's reroll too). Goal: a weapon reads as attack, armor
    as defence, a charm can be anything. A bonus never repeats what the item gives anyway. */
export const BONUS_POOL = {
  weapon: ['damage', 'speed', 'crit', 'critDmg', 'slayer', 'leech', 'power', 'cooldown'],
  armor: ['health', 'armor', 'evade', 'move', 'heal', 'cooldown'],
  charm: ['damage', 'speed', 'health', 'armor', 'move', 'heal', 'cooldown', 'crit', 'critDmg', 'slayer', 'leech', 'evade', 'power'],
} as const;

/** Each class's weapon carries its own crit, just for wearing it (times rarity and the roll, not
    the item's level): chance and extra crit damage. Goal: weapons feel different; the bow is the
    crit weapon (the archer's old Crit lean), the staff the steady one. */
export const WEAPON_CRIT = {
  warrior: { crit: 0.04, critDmg: 0.2 },
  archer: { crit: 0.06, critDmg: 0.2 },
  monk: { crit: 0.03, critDmg: 0.15 },
  mage: { crit: 0.05, critDmg: 0.25 },
} as const;

/** Evade never goes above this, however it is stacked. Goal: you still have to dodge. */
export const MAX_EVADE = 0.25;
/** Life steal heals at most this share of your max HP a second. Goal: it helps, it doesn't make
    you unkillable in a crowd. */
export const LEECH_CAP = 0.04;
/** Share of damage dealt to elites and bosses, for the power scale (slayer only works on them). */
export const SLAYER_SHARE = 0.45;

/** Items also ask for a hero level (the level from training XP), the one a player who hits the
    weekly goal has when the item becomes wearable (`WEAR_AFTER`), less `slack` workouts. No slack:
    a level spans three or four workouts, so 2 let a fresh hero (level 1) wear a zone 1 legendary
    with no training at all (Edoardo 2026-10-28). Goal: a level need can't be met by piling points
    in one stat or starting over; it counts every workout. */
export const LEVEL_NEED = { slack: 0 } as const;

/** Per rarity: how many bonuses (from, to) and how strong (x every number). What it asks is `WEAR_AFTER`. */
export const RARITY_SIZE = {
  common: { bonuses: [0, 0], power: 1 },
  magic: { bonuses: [1, 1], power: 1.1 },
  rare: { bonuses: [2, 3], power: 1.25 },
  legendary: { bonuses: [4, 4], power: 1.6 },
} as const;

/** How often each rarity drops on floor 1 from a plain monster (weights). */
export const RARITY_WEIGHTS = { common: 60, magic: 28, rare: 10, legendary: 2 } as const;

/** How luck (see DROP_LUCK) and depth push drops rarer: common's weight is divided by
    1 + luck * commonPerLuck + floor * commonPerFloor, the others multiplied by
    1 + luck * rarerPerLuck + floor * rarerPerFloor. */
export const RARITY_LEAN = { commonPerLuck: 1, commonPerFloor: 0.06, rarerPerLuck: 0.6, rarerPerFloor: 0.05 } as const;

/** When an item can be worn: this many workouts after its zone opens, by rarity and depth (floors
    1-3, 4-7, 8-10). It asks for the points a player who hits the weekly goal and spreads them evenly
    has in each stat by then, so a change to stat points never breaks gear. Goal: what you find is
    mostly wearable soon, and a zone's best item before the next zone opens (about 12 workouts). */
export const WEAR_AFTER = {
  common: [0, 2, 4],
  magic: [0, 2, 4],
  rare: [2, 4, 7],
  legendary: [4, 7, 11],
} as const;

/** The free starter kit everyone has: a plain weapon, no armor (Edoardo 2026-10-28). Goal: a
    run with nothing found yet still has a weapon, and the first armor you find is a real step up. */
export const STARTER = { weaponDamage: 0.05 } as const;

/** Chance a kill or a chest drops an item: an elite, a golem, any other monster, a chest. */
export const DROPS = { elite: 0.15, golem: 0.3, plain: 0.006, chest: 0.5 } as const;

/** Luck of each source (leans rarer, see RARITY_LEAN): a plain monster 0. */
export const DROP_LUCK = { elite: 0.5, chest: 1, midBoss: 2, boss: 2 } as const;

/** Items the bag holds during a run. */
export const BAG = 8;
