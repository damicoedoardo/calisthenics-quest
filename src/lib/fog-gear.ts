import { heroLevel, type GameState } from './game';
import type { GearSlot, Tier } from './gear';
import { buildOf } from './stats';
import { canWear, itemScore, type Item, type ItemSlot } from '@/game/dungeon/items';
import { MELT, VAULT, type MatId } from '@/balance';

/* The things you wear into the Fog, between runs. What you wear always comes home, so forging it is
   never wasted. Fall in a run and the Fog takes what you found and still carry in the bag; win, or
   leave by the stairs, and the bag comes home too. The vault keeps items safe at home: it starts
   small and grows with your workouts, so training is what lets you keep more. */

export interface FogGear {
  worn: Partial<Record<ItemSlot, Item>>;
  vault: Item[];
  /** Embers found (salvage) and spent at Mira's forge; workouts earn the rest (see forge.ts). */
  embers?: { found: number; spent: number };
  /** Runs that ended in a fall that cost something (Mira says her line after the first). */
  deaths?: number;
  /** Co-op materials for Mira's forge (+6 and up), found in co-op runs or given by friends. */
  mats?: Partial<Record<MatId, number>>;
  /** How the starter kit looks on the hero: the gear Mira's old forge had made, kept as it was. */
  kit?: Record<GearSlot, Tier>;
}

export const NO_GEAR: FogGear = { worn: {}, vault: [] };

/** Vault slots: 4, and one more every 5 workouts, up to 20. */
export const vaultSize = (workouts: number) => Math.min(VAULT.max, VAULT.start + Math.floor(workouts / VAULT.every));

const gearOf = (s: GameState): FogGear => s.fogGear ?? NO_GEAR;

/** How a run ended for what you carried: what came home (and what didn't fit in the vault), and what the Fog took. */
export interface GearOutcome {
  /** Won, or left by the stairs: the whole bag came home. */
  kept: boolean;
  /** Embers Mira made from what didn't fit in the vault. */
  embers?: number;
  /** Into the vault. */
  stored: Item[];
  /** No room in the vault: left at the door. */
  left: Item[];
  /** Taken by the Fog: what you found this run and still had in the bag. */
  lost: Item[];
  /** Co-op materials found in the run (always kept). */
  mats?: Partial<Record<MatId, number>>;
}

/** What a fall would take right now, mid-run: what you found and still carry in the bag. What you
    wear, and what you brought from home, always comes back (the same rule as `settleGear`). */
export function atRisk(state: GameState, bag: Item[]): Item[] {
  const home = new Set(Object.values(gearOf(state).worn).map((x) => x?.id));
  return bag.filter((x) => !x.starter && !home.has(x.id));
}

/** What you walk into a run wearing: only what your level, points and class let you wear today (the
    rest waits at home, safe: another class's weapon until you switch back). */
export function wornFor(state: GameState): FogGear['worn'] {
  const b = buildOf(state);
  return Object.fromEntries(Object.entries(gearOf(state).worn).filter(([, it]) => it && canWear(it, b, state.profile.classId, heroLevel(state))));
}

/** After a run: you keep what you wear either way. A win or a walk out by the stairs brings the bag
    home too; a fall loses what you found in it. */
export function settleGear(state: GameState, end: { won: boolean; why?: string; gear?: { worn: FogGear['worn']; bag: Item[] }; mats?: Partial<Record<MatId, number>> }): { state: GameState; out: GearOutcome } {
  const found = end.mats && Object.keys(end.mats).length ? end.mats : undefined,
    g0 = gearOf(state),
    g: FogGear = found ? { ...g0, mats: addUp(g0.mats ?? {}, found) } : g0,
    run = end.gear ?? null;
  if (found) state = { ...state, fogGear: g };
  if (!run) return { state, out: { kept: true, stored: [], left: [], lost: [], mats: found } };
  const kept = end.won || end.why === 'left',
    lost = kept ? [] : atRisk(state, run.bag),
    bag = run.bag.filter((x) => !lost.includes(x)),
    // Worn at home but not taken in (your points fell short of it): it stayed safe.
    taken = wornFor(state),
    benched = Object.fromEntries(Object.entries(g.worn).filter(([slot, it]) => it && taken[slot as ItemSlot]?.id !== it.id)) as FogGear['worn'];
  // A benched item whose slot you now fill goes home with the bag.
  const worn = { ...benched, ...run.worn },
    home = [...bag, ...Object.entries(benched).filter(([slot]) => run.worn[slot as ItemSlot]).map(([, it]) => it!)];
  const room = vaultSize(state.sessions.length) - g.vault.length,
    best = [...home].sort((a, b) => itemScore(b) - itemScore(a)),
    stored = best.slice(0, Math.max(0, room)),
    left = best.slice(Math.max(0, room));
  // What didn't fit, Mira melts down into embers.
  const embers = left.reduce((n, it) => n + salvageValue(it), 0);
  return {
    state: { ...state, fogGear: { ...g, worn, vault: [...g.vault, ...stored], embers: { found: (g.embers?.found ?? 0) + embers, spent: g.embers?.spent ?? 0 }, ...(lost.length ? { deaths: (g.deaths ?? 0) + 1 } : {}) } },
    out: { kept, stored, left, lost, embers, mats: found },
  };
}

/** Wear an item from the vault (what you wore goes back in its place). Nothing happens if you can't
    wear it yet, or it's another class's weapon. */
export function wearFromVault(state: GameState, id: string): GameState {
  const g = gearOf(state),
    it = g.vault.find((x) => x.id === id);
  if (!it || !canWear(it, buildOf(state), state.profile.classId, heroLevel(state))) return state;
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
  return Math.round(MELT[it.rarity] * (1 + MELT.perPlus * (it.plus ?? 0)));
}

/** Two sets of materials added up. */
function addUp(a: Partial<Record<MatId, number>>, b: Partial<Record<MatId, number>>): Partial<Record<MatId, number>> {
  const out = { ...a };
  for (const [id, n] of Object.entries(b) as [MatId, number][]) out[id] = (out[id] ?? 0) + n;
  return out;
}
