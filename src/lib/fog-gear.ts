import type { GameState } from './game';
import { buildOf } from './stats';
import { itemScore, shortOf, type Item, type ItemSlot } from '@/game/dungeon/items';

/* The things you wear into the Fog, between runs. Die in a run and the Fog takes everything you
   wore and carried; win, or leave by the stairs, and you keep it all. The vault keeps items safe at
   home: it starts small and grows with your workouts, so training is what lets you keep more. */

export interface FogGear {
  worn: Partial<Record<ItemSlot, Item>>;
  vault: Item[];
}

export const NO_GEAR: FogGear = { worn: {}, vault: [] };

/** Vault slots: 4, and one more every 5 workouts, up to 20. */
export const vaultSize = (workouts: number) => Math.min(20, 4 + Math.floor(workouts / 5));

const gearOf = (s: GameState): FogGear => s.fogGear ?? NO_GEAR;

/** How a run ended for what you carried: what came home (and what didn't fit in the vault), or what the Fog took. */
export interface GearOutcome {
  kept: boolean;
  /** Into the vault. */
  stored: Item[];
  /** No room in the vault: left at the door. */
  left: Item[];
  /** Taken by the Fog. */
  lost: Item[];
}

/** What you walk into a run wearing: only what your points let you wear today (the rest waits at
    home, safe). */
export function wornFor(state: GameState): FogGear['worn'] {
  const b = buildOf(state);
  return Object.fromEntries(Object.entries(gearOf(state).worn).filter(([, it]) => it && shortOf(it, b) === 0));
}

/** After a run: keep it all on a win or a walk out by the stairs, lose it all otherwise. */
export function settleGear(state: GameState, end: { won: boolean; why?: string; gear?: { worn: FogGear['worn']; bag: Item[] } }): { state: GameState; out: GearOutcome } {
  const g = gearOf(state),
    run = end.gear ?? null;
  if (!run) return { state, out: { kept: true, stored: [], left: [], lost: [] } };
  const kept = end.won || end.why === 'left',
    // Worn at home but not taken in (your points fell short of it): it stayed safe.
    taken = wornFor(state),
    benched = Object.fromEntries(Object.entries(g.worn).filter(([slot, it]) => it && taken[slot as ItemSlot]?.id !== it.id)) as FogGear['worn'];
  if (!kept) {
    const lost = [...Object.values(run.worn).filter((x): x is Item => !!x), ...run.bag];
    return { state: { ...state, fogGear: { worn: benched, vault: g.vault } }, out: { kept, stored: [], left: [], lost } };
  }
  // A benched item whose slot you now fill goes home with the bag.
  const worn = { ...benched, ...run.worn },
    home = [...run.bag, ...Object.entries(benched).filter(([slot]) => run.worn[slot as ItemSlot]).map(([, it]) => it!)];
  const room = vaultSize(state.sessions.length) - g.vault.length,
    best = [...home].sort((a, b) => itemScore(b) - itemScore(a)),
    stored = best.slice(0, Math.max(0, room)),
    left = best.slice(Math.max(0, room));
  return { state: { ...state, fogGear: { worn, vault: [...g.vault, ...stored] } }, out: { kept, stored, left, lost: [] } };
}

/** Wear an item from the vault (what you wore goes back in its place). Nothing happens if you can't wear it yet. */
export function wearFromVault(state: GameState, id: string): GameState {
  const g = gearOf(state),
    it = g.vault.find((x) => x.id === id);
  if (!it || shortOf(it, buildOf(state)) > 0) return state;
  const old = g.worn[it.slot],
    vault = g.vault.filter((x) => x !== it);
  return { ...state, fogGear: { worn: { ...g.worn, [it.slot]: it }, vault: old ? [...vault, old] : vault } };
}

/** Take a worn item off into the vault, if there's room. */
export function takeOffToVault(state: GameState, slot: ItemSlot): GameState {
  const g = gearOf(state),
    it = g.worn[slot];
  if (!it || g.vault.length >= vaultSize(state.sessions.length)) return state;
  const worn = { ...g.worn };
  delete worn[slot];
  return { ...state, fogGear: { worn, vault: [...g.vault, it] } };
}

/** Throw an item away for good. */
export function discardItem(state: GameState, id: string): GameState {
  const g = gearOf(state);
  return { ...state, fogGear: { worn: Object.fromEntries(Object.entries(g.worn).filter(([, x]) => x?.id !== id)), vault: g.vault.filter((x) => x.id !== id) } };
}
