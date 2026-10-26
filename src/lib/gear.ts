import { PATHS, type PathId } from './skills';

export type ClassId = 'warrior' | 'archer' | 'monk' | 'mage';
export type GearSlot = 'weapon' | 'armor' | 'shield';
/** 0 = nothing yet, 1..6 = one tier per beaten skill. */
export type Tier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HeroClass {
  id: ClassId;
  name: string;
  /** Path that earns +10% XP and forges the weapon. Mage uses whichever path is furthest behind. */
  path: PathId | 'balance';
  weapon: string;
  pitch: string;
}

export const CLASSES: HeroClass[] = [
  { id: 'warrior', name: 'Warrior', path: 'push', weapon: 'sword', pitch: 'Every push-up is a strike.' },
  { id: 'archer', name: 'Archer', path: 'pull', weapon: 'bow', pitch: 'Pulling up is drawing the bow.' },
  { id: 'monk', name: 'Monk', path: 'core', weapon: 'staff', pitch: 'Holding still is a kind of power.' },
  { id: 'mage', name: 'Mage', path: 'balance', weapon: 'wand', pitch: 'Power comes from balance.' },
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

const GLOWS: Partial<Record<Tier, string>> = { 5: '#fb923c', 6: '#a78bfa' };

const MATERIALS: Record<GearSlot, string[]> = {
  weapon: ['Wooden', 'Iron', 'Steel', "Knight's", 'Flame', 'Dragon'],
  armor: ['Leather armor', 'Chainmail', 'Iron armor', 'Steel armor', 'Flame armor', 'Dragon armor'],
  shield: ['Wooden', 'Iron', 'Steel', 'Tower', 'Flame', 'Legendary'],
};

const SHIELD_NAME: Record<ClassId, string> = { warrior: 'shield', archer: 'quiver', monk: 'bracers', mage: 'orb' };

/** Which path feeds each gear slot. The class path always forges the weapon. */
export function slotPaths(cls: ClassId | undefined, progress: Record<PathId, number>): Record<GearSlot, PathId> {
  switch (cls) {
    case 'archer':
      return { weapon: 'pull', armor: 'push', shield: 'core' };
    case 'monk':
      return { weapon: 'core', armor: 'pull', shield: 'push' };
    case 'mage': {
      const lowest = lowestPath(progress);
      const rest = (['pull', 'push', 'core'] as PathId[]).filter((p) => p !== lowest);
      return { weapon: lowest, armor: rest[0], shield: rest[1] };
    }
    default:
      return { weapon: 'push', armor: 'pull', shield: 'core' };
  }
}

/** The path with the smallest share of its tree beaten (ties: push, pull, core). */
export function lowestPath(progress: Record<PathId, number>): PathId {
  let best: PathId = 'push';
  let bestShare = Infinity;
  for (const p of PATHS) {
    const share = progress[p.id] / p.nodes.length;
    if (share < bestShare) {
      best = p.id;
      bestShare = share;
    }
  }
  return best;
}

/** XP bonus path for a class (Mage follows whichever path is furthest behind). */
export function classPath(cls: ClassId | undefined, progress: Record<PathId, number>): PathId | null {
  const c = getClass(cls);
  if (!c) return null;
  return c.path === 'balance' ? lowestPath(progress) : c.path;
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

export function equippedGear(cls: ClassId | undefined, progress: Record<PathId, number>): Record<GearSlot, Gear> {
  const map = slotPaths(cls, progress);
  const tierOf = (p: PathId) => Math.min(progress[p], 6) as Tier;
  return {
    weapon: makeGear('weapon', tierOf(map.weapon), cls),
    armor: makeGear('armor', tierOf(map.armor), cls),
    shield: makeGear('shield', tierOf(map.shield), cls),
  };
}

/** Gear that a node unlock on `path` would forge, for the skill tree preview. */
export function rewardFor(cls: ClassId | undefined, progress: Record<PathId, number>, path: PathId, nodeIndex: number): Gear {
  const map = slotPaths(cls, progress);
  const slot = (Object.keys(map) as GearSlot[]).find((s) => map[s] === path) ?? 'weapon';
  return makeGear(slot, Math.min(nodeIndex + 1, 6) as Tier, cls);
}
