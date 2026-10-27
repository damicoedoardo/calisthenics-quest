import { daysSinceLastSession, type GameState } from './game';
import type { GearSlot, Tier } from './gear';
import { buildOf } from './stats';
import { itemScore, shortOf, type Item, type ItemSlot } from '@/game/dungeon/items';

/* The things you wear into the Fog, between runs. Die in a run and the Fog takes everything you
   wore and carried; win, or leave by the stairs, and you keep it all. The vault keeps items safe at
   home: it starts small and grows with your workouts, so training is what lets you keep more. */

export interface FogGear {
  worn: Partial<Record<ItemSlot, Item>>;
  vault: Item[];
  /** Embers found (salvage) and spent at Mira's forge; workouts earn the rest (see forge.ts). */
  embers?: { found: number; spent: number };
  /** The worn item the flame holds if you fall, while you've trained in the last 2 days. */
  guard?: ItemSlot;
  /** Runs the Fog took everything from (Mira says her line after the first). */
  deaths?: number;
  /** How the starter kit looks on the hero: the gear Mira's old forge had made, kept as it was. */
  kit?: Record<GearSlot, Tier>;
}

export const NO_GEAR: FogGear = { worn: {}, vault: [] };

/** Vault slots: 4, and one more every 5 workouts, up to 20. */
export const vaultSize = (workouts: number) => Math.min(20, 4 + Math.floor(workouts / 5));

const gearOf = (s: GameState): FogGear => s.fogGear ?? NO_GEAR;

/** Trained in the last 2 days: the flame holds your guarded item if you fall. */
export function flameGuards(state: GameState, now: Date): boolean {
  const gap = daysSinceLastSession(state, now);
  return gap !== null && gap <= 2;
}

/** How a run ended for what you carried: what came home (and what didn't fit in the vault), or what the Fog took. */
export interface GearOutcome {
  kept: boolean;
  /** The item the flame held through a fall. */
  held?: Item;
  /** Embers Mira made from what didn't fit in the vault. */
  embers?: number;
  /** Into the vault. */
  stored: Item[];
  /** No room in the vault: left at the door. */
  left: Item[];
  /** Taken by the Fog. */
  lost: Item[];
}

/** What a fall would cost right now, mid-run: the worn item the flame would hold, and what the Fog
    would take. The starter kit always comes home, so it is never at risk. */
export interface AtRisk {
  /** Kept by the flame if you fall. */
  held?: Item;
  /** The guarded item the flame can't hold yet: no training in the last 2 days. */
  cold?: Item;
  /** Taken by the Fog if you fall. */
  lost: Item[];
}

/** What you wear and carry in a run, as a fall would settle it (the same rule as `settleGear`). */
export function atRisk(state: GameState, gear: { worn: FogGear['worn']; bag: Item[] }, now: Date): AtRisk {
  const slot = gearOf(state).guard,
    guarded = slot ? gear.worn[slot] : undefined,
    pick = guarded && !guarded.starter ? guarded : undefined,
    warm = flameGuards(state, now),
    held = warm ? pick : undefined;
  const lost = [...Object.values(gear.worn), ...gear.bag].filter((x): x is Item => !!x && !x.starter && x.id !== held?.id);
  return { held, cold: warm ? undefined : pick, lost };
}

/** What you walk into a run wearing: only what your points let you wear today (the rest waits at
    home, safe). */
export function wornFor(state: GameState): FogGear['worn'] {
  const b = buildOf(state);
  return Object.fromEntries(Object.entries(gearOf(state).worn).filter(([, it]) => it && shortOf(it, b) === 0));
}

/** After a run: keep it all on a win or a walk out by the stairs, lose it all otherwise. */
export function settleGear(state: GameState, end: { won: boolean; why?: string; gear?: { worn: FogGear['worn']; bag: Item[] } }, now: Date = new Date()): { state: GameState; out: GearOutcome } {
  const g = gearOf(state),
    run = end.gear ?? null;
  if (!run) return { state, out: { kept: true, stored: [], left: [], lost: [] } };
  const kept = end.won || end.why === 'left',
    // Worn at home but not taken in (your points fell short of it): it stayed safe.
    taken = wornFor(state),
    benched = Object.fromEntries(Object.entries(g.worn).filter(([slot, it]) => it && taken[slot as ItemSlot]?.id !== it.id)) as FogGear['worn'];
  if (!kept) {
    const held = g.guard && flameGuards(state, now) ? run.worn[g.guard] : undefined,
      lost = [...Object.values(run.worn).filter((x): x is Item => !!x && x !== held), ...run.bag],
      worn = held ? { ...benched, [held.slot]: held } : benched;
    return { state: { ...state, fogGear: { ...g, worn, deaths: (g.deaths ?? 0) + (lost.length ? 1 : 0) } }, out: { kept, stored: [], left: [], lost, held } };
  }
  // A benched item whose slot you now fill goes home with the bag.
  const worn = { ...benched, ...run.worn },
    home = [...run.bag, ...Object.entries(benched).filter(([slot]) => run.worn[slot as ItemSlot]).map(([, it]) => it!)];
  const room = vaultSize(state.sessions.length) - g.vault.length,
    best = [...home].sort((a, b) => itemScore(b) - itemScore(a)),
    stored = best.slice(0, Math.max(0, room)),
    left = best.slice(Math.max(0, room));
  // What didn't fit, Mira melts down into embers.
  const embers = left.reduce((n, it) => n + salvageValue(it), 0);
  return { state: { ...state, fogGear: { ...g, worn, vault: [...g.vault, ...stored], embers: { found: (g.embers?.found ?? 0) + embers, spent: g.embers?.spent ?? 0 } } }, out: { kept, stored, left, lost: [], embers } };
}

/** Wear an item from the vault (what you wore goes back in its place). Nothing happens if you can't wear it yet. */
export function wearFromVault(state: GameState, id: string): GameState {
  const g = gearOf(state),
    it = g.vault.find((x) => x.id === id);
  if (!it || shortOf(it, buildOf(state)) > 0) return state;
  const old = g.worn[it.slot],
    vault = g.vault.filter((x) => x !== it);
  return { ...state, fogGear: { ...g, worn: { ...g.worn, [it.slot]: it }, vault: old ? [...vault, old] : vault } };
}

/** Take a worn item off into the vault, if there's room. */
export function takeOffToVault(state: GameState, slot: ItemSlot): GameState {
  const g = gearOf(state),
    it = g.worn[slot];
  if (!it || g.vault.length >= vaultSize(state.sessions.length)) return state;
  const worn = { ...g.worn };
  delete worn[slot];
  return { ...state, fogGear: { ...g, worn, vault: [...g.vault, it] } };
}

/** Throw an item away for good. */
export function discardItem(state: GameState, id: string): GameState {
  const g = gearOf(state);
  return { ...state, fogGear: { ...g, worn: Object.fromEntries(Object.entries(g.worn).filter(([, x]) => x?.id !== id)), vault: g.vault.filter((x) => x.id !== id) } };
}

/** Embers an item melts down into at the forge: more for rarer and upgraded ones. */
export function salvageValue(it: Item): number {
  const base = { common: 3, magic: 6, rare: 12, legendary: 30 }[it.rarity];
  return Math.round(base * (1 + 0.5 * (it.plus ?? 0)));
}

/** Choose the worn item the flame holds (null: none). */
export function setGuard(state: GameState, slot: ItemSlot | null): GameState {
  const g = gearOf(state),
    { guard: _old, ...rest } = g;
  return { ...state, fogGear: slot ? { ...rest, guard: slot } : rest };
}
