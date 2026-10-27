import type { ItemLook } from '@/game/dungeon/items';

export type ClassId = 'warrior' | 'archer' | 'monk' | 'mage';
export type GearSlot = 'weapon' | 'armor' | 'shield';
/** 0 = nothing yet, 1..6: one slot goes up a tier every few workouts. */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HeroClass {
  id: ClassId;
  name: string;
  /** The stat it leans to in the Fog (src/lib/stats.ts CLASS_LEAN). */
  lean: string;
  weapon: string;
  pitch: string;
}

export const CLASSES: HeroClass[] = [
  { id: 'warrior', name: 'Warrior', lean: 'Damage', weapon: 'sword', pitch: 'Up close, every blow counts.' },
  { id: 'archer', name: 'Archer', lean: 'Reach', weapon: 'bow', pitch: 'Keep your distance, gather the light.' },
  { id: 'monk', name: 'Monk', lean: 'Health', weapon: 'staff', pitch: 'Holding steady is a kind of power.' },
  { id: 'mage', name: 'Mage', lean: 'Speed', weapon: 'wand', pitch: 'Quick hands, many sparks.' },
];

export function getClass(id: ClassId | undefined): HeroClass | null {
  return CLASSES.find((c) => c.id === id) ?? null;
}

export interface Gear {
  slot: GearSlot;
  tier: Tier;
  name: string;
  color: string;
  glow?: string;
  /** The Fog item worn in this slot (the shield slot shows the charm): its kind, rarity and seed,
      so the hero wears that very item, not just its tier. Left out for the forge's old looks. */
  item?: ItemLook;
  /** That item's upgrades at Mira's forge: from +4 the hero shines with it (src/components/PlusGlow.tsx). */
  plus?: number;
}

export const TIER_COLORS: Record<Tier, string> = {
  0: 'transparent',
  1: '#a16207',
  2: '#9ca3af',
  3: '#cbd5e1',
  4: '#fbbf24',
  5: '#f97316',
  6: '#7c3aed',
};

/* The gear colours as text on the dark UI. A few tiers' sprite colours are too dark to read as
   words (under 4.5:1 on the cards), so their text is lifted; the sprites keep the originals. */
const TIER_TEXT: Partial<Record<Tier, string>> = { 0: '#8291a7', 1: '#cd7f32', 6: '#a78bfa' };
export const tierText = (tier: Tier) => TIER_TEXT[tier] ?? TIER_COLORS[tier];

const GLOWS: Partial<Record<Tier, string>> = { 5: '#fb923c', 6: '#a78bfa' };

const MATERIALS: Record<GearSlot, string[]> = {
  weapon: ['Wooden', 'Iron', 'Steel', "Knight's", 'Flame', 'Dragon'],
  armor: ['Leather armor', 'Chainmail', 'Iron armor', 'Steel armor', 'Flame armor', 'Dragon armor'],
  shield: ['Wooden', 'Iron', 'Steel', 'Tower', 'Flame', 'Legendary'],
};

const SHIELD_NAME: Record<ClassId, string> = { warrior: 'shield', archer: 'quiver', monk: 'bracers', mage: 'orb' };

/** A slot goes up a tier every this many workouts. */
export const GEAR_EVERY = 4;
/** Which slot the next tier goes to, in turn. The weapon and armor start at tier 1. */
const FORGE_ORDER: GearSlot[] = ['shield', 'weapon', 'armor'];
const START: Record<GearSlot, number> = { weapon: 1, armor: 1, shield: 0 };

/** Gear tiers after this many workouts. */
export function tiersAt(workouts: number): Record<GearSlot, Tier> {
  const tiers = { ...START };
  const steps = Math.floor(workouts / GEAR_EVERY);
  for (let i = 0; i < steps; i++) {
    const open = FORGE_ORDER.filter((s) => tiers[s] < 6);
    if (open.length === 0) break;
    // the next slot in turn, skipping any that are already at the top
    const slot = FORGE_ORDER[i % FORGE_ORDER.length];
    tiers[tiers[slot] < 6 ? slot : open[0]] += 1;
  }
  return tiers as Record<GearSlot, Tier>;
}

/** Workouts until the next tier, and what it forges; null once everything is at the top. */
export function nextForge(workouts: number, cls: ClassId | undefined): { in: number; gear: Gear } | null {
  const now = tiersAt(workouts);
  const at = (Math.floor(workouts / GEAR_EVERY) + 1) * GEAR_EVERY;
  const then = tiersAt(at);
  const slot = (Object.keys(now) as GearSlot[]).find((s) => then[s] > now[s]);
  if (!slot) return null;
  return { in: at - workouts, gear: makeGear(slot, then[slot], cls) };
}

export function gearName(slot: GearSlot, tier: Tier, cls: ClassId | undefined): string {
  if (tier === 0) return slot === 'armor' ? 'Gym shirt' : 'Nothing yet';
  const material = MATERIALS[slot][tier - 1];
  if (slot === 'armor') return material;
  const noun = slot === 'weapon' ? getClass(cls)?.weapon ?? 'sword' : SHIELD_NAME[cls ?? 'warrior'];
  return `${material} ${noun}`;
}

export function makeGear(slot: GearSlot, tier: Tier, cls: ClassId | undefined): Gear {
  return { slot, tier, name: gearName(slot, tier, cls), color: TIER_COLORS[tier], glow: GLOWS[tier] };
}

export function equippedGear(cls: ClassId | undefined, workouts: number): Record<GearSlot, Gear> {
  const tiers = tiersAt(workouts);
  return {
    weapon: makeGear('weapon', tiers.weapon, cls),
    armor: makeGear('armor', tiers.armor, cls),
    shield: makeGear('shield', tiers.shield, cls),
  };
}

/** Every slot at one tier (the art's previews and fingerprints). */
export function uniformGear(cls: ClassId | undefined, tier: Tier): Record<GearSlot, Gear> {
  return { weapon: makeGear('weapon', tier, cls), armor: makeGear('armor', tier, cls), shield: makeGear('shield', tier, cls) };
}
