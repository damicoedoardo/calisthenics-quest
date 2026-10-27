import type { ClassId } from '@/lib/gear';
import type { Build, StatId } from '@/lib/stats';

/* What the dungeon drops, as data: the things you wear, how rare they come, the bonuses they can
   carry, and what each asks of your training before you can wear it. engine.ts drops and wears
   them; src/lib/fog-gear.ts keeps them in the save between runs.
   An item you can't wear yet tells you how far away it is: its requirement is stat points spent on
   the Hero tab, which only workouts earn. */

/** Where an item is worn. */
export type ItemSlot = 'weapon' | 'armor' | 'charm';
export const ITEM_SLOTS: ItemSlot[] = ['weapon', 'armor', 'charm'];
export const SLOT_NAME: Record<ItemSlot, string> = { weapon: 'Weapon', armor: 'Armor', charm: 'Charm' };

/** Diablo's colors: white, blue, yellow, orange. */
export type Rarity = 'common' | 'magic' | 'rare' | 'legendary';
export const RARITY: Record<Rarity, { name: string; color: string; bonuses: [number, number]; need: number; power: number }> = {
  common: { name: 'Common', color: '#e2e8f0', bonuses: [0, 0], need: 0.9, power: 1 },
  magic: { name: 'Magic', color: '#60a5fa', bonuses: [1, 1], need: 1, power: 1.1 },
  rare: { name: 'Rare', color: '#facc15', bonuses: [2, 3], need: 1.15, power: 1.25 },
  legendary: { name: 'Legendary', color: '#fb923c', bonuses: [4, 4], need: 1.35, power: 1.6 },
};
/** How often each rarity drops (deeper floors and bosses lean rarer, see `rollRarity`). */
export const RARITY_ODDS: [Rarity, number][] = [
  ['common', 60],
  ['magic', 28],
  ['rare', 10],
  ['legendary', 2],
];

/** What a bonus does, and its size at item level 0 and how much it grows per level. */
export type BonusId = 'damage' | 'speed' | 'health' | 'armor' | 'move' | 'heal' | 'cooldown' | 'pickup';
export const BONUSES: Record<BonusId, { name: string; base: number; per: number; show: (v: number) => string; word: string }> = {
  damage: { name: 'Damage', base: 0.02, per: 0.001, show: (v) => `+${Math.round(v * 100)}% damage`, word: 'Fury' },
  speed: { name: 'Attack speed', base: 0.02, per: 0.001, show: (v) => `+${Math.round(v * 100)}% attack speed`, word: 'Haste' },
  health: { name: 'Health', base: 3, per: 0.4, show: (v) => `+${Math.round(v)} HP`, word: 'Life' },
  armor: { name: 'Armor', base: 0.006, per: 0.0003, show: (v) => `-${Math.round(v * 100)}% damage taken`, word: 'Stone' },
  move: { name: 'Move speed', base: 0.02, per: 0.0006, show: (v) => `+${Math.round(v * 100)}% move speed`, word: 'Wind' },
  heal: { name: 'Heal on kill', base: 0.3, per: 0.02, show: (v) => `+${v.toFixed(1)} HP a kill`, word: 'Embers' },
  cooldown: { name: 'Ability', base: 0.03, per: 0.0012, show: (v) => `ability ${Math.round(v * 100)}% faster`, word: 'Focus' },
  pickup: { name: 'Pickup', base: 0.06, per: 0.003, show: (v) => `+${Math.round(v * 100)}% pickup range`, word: 'Pull' },
};
const BONUS_IDS = Object.keys(BONUSES) as BonusId[];

export interface Item {
  id: string;
  slot: ItemSlot;
  /** The class it's made for (a weapon or armor); null for a charm anyone wears. */
  cls: ClassId | null;
  rarity: Rarity;
  /** Zone and depth it came from: zone * 10 + floor. Bigger is stronger. */
  level: number;
  name: string;
  /** What it gives just for wearing it: a weapon's damage, armor's HP and armor. */
  base: { id: BonusId; v: number }[];
  bonuses: { id: BonusId; v: number }[];
  /** Points spent in this stat it needs, or null for none. */
  need: { stat: StatId; n: number } | null;
  /** The free starter kit: never lost, never kept in the vault. */
  starter?: boolean;
  /** Upgrades at Mira's forge, 0 to MAX_PLUS: each makes everything on it stronger. */
  plus?: number;
  /** Bonuses rerolled at the forge so far (each reroll rolls from its own seed). */
  rerolls?: number;
}

/** The forge's highest upgrade, and how much stronger each one makes an item. */
export const MAX_PLUS = 5;
export const PLUS_STEP = 0.1;
/** How much stronger an item is for its upgrades. */
export const boostOf = (it: Item) => 1 + PLUS_STEP * (it.plus ?? 0);
/** An item's name with its upgrades: "Ashen sword +2". */
export const nameOf = (it: Item) => (it.plus ? `${it.name} +${it.plus}` : it.name);

/** Each class's weapon and the stat it asks for (the class's own stat, CLASS_LEAN). */
export const WEAPONS: Record<ClassId, { noun: string; stat: StatId; icon: ItemIcon }> = {
  warrior: { noun: 'sword', stat: 'damage', icon: 'sword' },
  archer: { noun: 'bow', stat: 'reach', icon: 'bow' },
  monk: { noun: 'staff', stat: 'health', icon: 'staff' },
  mage: { noun: 'wand', stat: 'speed', icon: 'wand' },
};
/** Armor by weight: heavy for the warrior, light for the archer and monk, a robe for the mage. */
export const ARMORS: Record<ClassId, { noun: string; icon: ItemIcon }> = {
  warrior: { noun: 'plate', icon: 'heavy' },
  archer: { noun: 'jerkin', icon: 'light' },
  monk: { noun: 'wraps', icon: 'light' },
  mage: { noun: 'robe', icon: 'robe' },
};
export type ItemIcon = 'sword' | 'bow' | 'staff' | 'wand' | 'heavy' | 'light' | 'robe' | 'charm';
export const iconOf = (it: Item): ItemIcon => (it.slot === 'charm' ? 'charm' : it.slot === 'weapon' ? WEAPONS[it.cls ?? 'warrior'].icon : ARMORS[it.cls ?? 'warrior'].icon);

/** The material in a name, by zone. */
const MATERIAL = ['Ashen', 'Drowned', 'Builder\'s', 'Sunworn', 'Hollow', 'Summit'];
const CHARMS = ['ring', 'amulet', 'token', 'band'];
/** A rare's name, from two halves. */
const RARE_A = ['Ember', 'Grave', 'Storm', 'Dusk', 'Iron', 'Bright', 'Quiet', 'Wild'];
const RARE_B = ['Fang', 'Song', 'Oath', 'Thorn', 'Heart', 'Spark', 'Mark', 'Vow'];
/** The legendaries, by class (and the charms'), one name for each zone. */
const LEGENDS: Record<ClassId | 'charm', string[]> = {
  warrior: ['First Light', 'Tidebreaker', 'Good Enough', 'Long Road', 'Unbowed', 'Last Step'],
  archer: ['Far Call', 'Still Water', 'True Line', 'Patience', 'Seen Through', 'Open Sky'],
  monk: ['Quiet Root', 'Deep Breath', 'Steady Hands', 'Slow Fire', 'Held Ground', 'Mountain'],
  mage: ['Little Spark', 'Mirror Glass', 'Blueprint', 'Kindling', 'Unwritten', 'Dawn'],
  charm: ['The Wanderer\'s Coin', 'Lia\'s Shard', 'Sol\'s Nail', 'Vela\'s Seal', 'Rook\'s Pebble', 'The Summit Stone'],
};

/** How much the dungeon's finds give next to the starter kit: big enough that a good weapon is
    worth training for (a mid-dungeon one is about one run skill). */
export const ITEM_POWER = 2.2;
/** How big a bonus is at this level, before the roll. */
const sizeOf = (id: BonusId, level: number) => (BONUSES[id].base + BONUSES[id].per * level) * ITEM_POWER;

/** Stat points an even build has in each stat when a zone opens (this many workouts in). */
const evenPoints = (workouts: number) => (6 + workouts * 3.67) / 4;

export interface DropAt {
  /** The zone (0-5), how many workouts in it opens, and the floor (0-9). */
  zone: number;
  workouts: number;
  floor: number;
  cls: ClassId | undefined;
}

/** A rarity, leaning rarer deeper down and for bigger sources (`luck` 0: a monster, 1: a chest, 2: a boss). */
export function rollRarity(rnd: () => number, floor: number, luck: number): Rarity {
  const odds = RARITY_ODDS.map(([r, w]): [Rarity, number] => [r, r === 'common' ? w / (1 + luck + floor * 0.06) : w * (1 + luck * 0.6 + floor * 0.05)]),
    total = odds.reduce((n, [, w]) => n + w, 0);
  let x = rnd() * total;
  for (const [r, w] of odds) if ((x -= w) < 0) return r;
  return 'common';
}

/** A new item for this spot in the dungeon. Weapons and armor are made for your class. */
export function rollItem(rnd: () => number, at: DropAt, rarity: Rarity): Item {
  const cls = at.cls ?? 'warrior',
    level = at.zone * 10 + at.floor,
    r = RARITY[rarity],
    s = rnd(),
    slot: ItemSlot = s < 0.4 ? 'weapon' : s < 0.75 ? 'armor' : 'charm',
    roll = () => 0.75 + rnd() * 0.25,
    mat = MATERIAL[Math.min(MATERIAL.length - 1, at.zone)];
  const base: Item['base'] =
    slot === 'weapon'
      ? [{ id: 'damage', v: (0.03 + 0.0018 * level) * ITEM_POWER * r.power * roll() }]
      : slot === 'armor'
        ? [
            { id: 'health', v: (4 + 0.5 * level) * ITEM_POWER * r.power * roll() },
            { id: 'armor', v: (0.01 + 0.0004 * level) * ITEM_POWER * r.power * roll() },
          ]
        : [];
  const [lo, hi] = r.bonuses,
    count = (slot === 'charm' ? 1 : 0) + lo + Math.floor(rnd() * (hi - lo + 1)),
    // A bonus never repeats what the item gives anyway (armor's HP and armor).
    pool = BONUS_IDS.filter((id) => !base.some((b) => b.id === id)),
    bonuses: Item['bonuses'] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    bonuses.push({ id, v: sizeOf(id, level) * r.power * roll() });
  }
  const noun = slot === 'weapon' ? WEAPONS[cls].noun : slot === 'armor' ? ARMORS[cls].noun : CHARMS[Math.floor(rnd() * CHARMS.length)];
  const name =
    rarity === 'legendary'
      ? slot === 'armor'
        ? `${LEGENDS[cls][Math.min(5, at.zone)]} ${noun}`
        : LEGENDS[slot === 'charm' ? 'charm' : cls][Math.min(5, at.zone)]
      : rarity === 'rare'
        ? `${RARE_A[Math.floor(rnd() * RARE_A.length)]} ${RARE_B[Math.floor(rnd() * RARE_B.length)]}`
        : rarity === 'magic' && bonuses.length
          ? `${mat} ${noun} of ${BONUSES[bonuses[0].id].word}`
          : `${mat} ${noun}`;
  const stat: StatId | null = slot === 'weapon' ? WEAPONS[cls].stat : slot === 'armor' ? 'health' : null,
    n = Math.round(evenPoints(at.workouts) * (0.5 + 0.6 * (at.floor / 9)) * r.need);
  return {
    id: Math.floor(rnd() * 2 ** 32).toString(36) + Math.floor(rnd() * 2 ** 32).toString(36),
    slot,
    cls: slot === 'charm' ? null : cls,
    rarity,
    level,
    name,
    base,
    bonuses,
    need: stat && n > 0 ? { stat, n } : null,
  };
}

/** The free starter kit for a class: a plain weapon and armor anyone can wear. */
export function starterKit(cls: ClassId | undefined): Record<'weapon' | 'armor', Item> {
  const c = cls ?? 'warrior';
  return {
    weapon: { id: `starter-weapon-${c}`, slot: 'weapon', cls: c, rarity: 'common', level: 0, name: `Plain ${WEAPONS[c].noun}`, base: [{ id: 'damage', v: 0.05 }], bonuses: [], need: null, starter: true },
    armor: { id: `starter-armor-${c}`, slot: 'armor', cls: c, rarity: 'common', level: 0, name: `Plain ${ARMORS[c].noun}`, base: [{ id: 'health', v: 6 }, { id: 'armor', v: 0.015 }], bonuses: [], need: null, starter: true },
  };
}

/** Whether a build meets an item's requirement, and if not, how many points short. */
export function shortOf(item: Item, build: Build): number {
  if (!item.need) return 0;
  return Math.max(0, item.need.n - (build[item.need.stat] ?? 0));
}

/** Everything an item gives, summed by bonus. */
export function itemTotals(items: (Item | undefined)[]): Partial<Record<BonusId, number>> {
  const out: Partial<Record<BonusId, number>> = {};
  for (const it of items) if (it) for (const b of [...it.base, ...it.bonuses]) out[b.id] = (out[b.id] ?? 0) + b.v * boostOf(it);
  return out;
}

/** What a bonus is worth next to the others, for comparing two items (1 = a mid-dungeon bonus). */
const WORTH: Record<BonusId, number> = { damage: 1 / 0.09, speed: 1 / 0.075, health: 1 / 28, armor: 1 / 0.03, move: 0.6 / 0.06, heal: 0.7 / 1.8, cooldown: 0.6 / 0.1, pickup: 0.3 / 0.2 };
export function itemScore(it: Item | undefined): number {
  if (!it) return 0;
  return [...it.base, ...it.bonuses].reduce((n, b) => n + b.v * WORTH[b.id], 0) * boostOf(it);
}

/** Each line of an item's card. */
export function itemLines(it: Item): string[] {
  return [...it.base, ...it.bonuses].map((b) => BONUSES[b.id].show(b.v * boostOf(it)));
}

/** The item with bonus `i` rolled again: a different bonus, sized for the item's level and rarity. */
export function rerollBonus(it: Item, i: number, rnd: () => number): Item {
  if (!it.bonuses[i]) return it;
  const pool = BONUS_IDS.filter((id) => !it.base.some((b) => b.id === id) && !it.bonuses.some((b) => b.id === id)),
    id = pool[Math.floor(rnd() * pool.length)];
  if (!id) return it;
  const v = sizeOf(id, it.level) * RARITY[it.rarity].power * (0.75 + rnd() * 0.25);
  return { ...it, bonuses: it.bonuses.map((b, k) => (k === i ? { id, v } : b)), rerolls: (it.rerolls ?? 0) + 1 };
}

/** The hero's look for an item: a gear tier (1-6) from how deep it was found and how rare it is. */
export function tierOf(it: Item): number {
  const bump = it.rarity === 'legendary' ? 2 : it.rarity === 'rare' ? 1 : 0;
  return Math.max(1, Math.min(6, 1 + Math.floor(it.level / 10) + bump));
}
