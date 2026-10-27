import type { GameState } from './game';
import { seeded } from './random';
import { NO_GEAR, salvageValue, type FogGear } from './fog-gear';
import { MAX_PLUS, rerollBonus, type Item } from '@/game/dungeon/items';
import { EMBERS, FORGE } from '@/balance';

/* Mira's forge, on the Play tab's gear card. Workouts earn embers, and the forge spends them: upgrade an item
   (+1 to +5), roll one of its bonuses again, or melt an item down for a few embers. Embers come
   mostly from training; melting down what the dungeon gives adds a little. */

/** Embers a workout earns (src/balance/economy.ts). */
export { EMBERS };
/** What the forge asks. An upgrade costs more each step: 10, 20, 30, 40, 50. */
export const upgradeCost = (it: Item) => FORGE.upgradeStep * ((it.plus ?? 0) + 1);
export const REROLL_COST = FORGE.reroll;

const gearOf = (s: GameState): FogGear => s.fogGear ?? NO_GEAR;

/** Embers from workouts, plus what was melted down, less what was spent. */
export function embersEarned(state: GameState): number {
  return state.sessions.reduce((n, s) => n + EMBERS[s.kind], 0);
}
export function embersOf(state: GameState): number {
  const e = gearOf(state).embers;
  return embersEarned(state) + (e?.found ?? 0) - (e?.spent ?? 0);
}

/** An item you own, worn or in the vault. */
export function findItem(state: GameState, id: string): Item | undefined {
  const g = gearOf(state);
  return [...Object.values(g.worn), ...g.vault].find((x) => x?.id === id);
}

/** The item swapped for `next` wherever it is, and the embers changed by `spend` (less is found). */
function change(state: GameState, id: string, next: Item | null, spend: number): GameState {
  const g = gearOf(state),
    swap = (x: Item) => (x.id === id ? next : x);
  const worn = Object.fromEntries(
    Object.entries(g.worn)
      .map(([slot, x]) => [slot, x && swap(x)] as const)
      .filter(([, x]) => x),
  ) as FogGear['worn'];
  const e = g.embers ?? { found: 0, spent: 0 },
    embers = spend >= 0 ? { ...e, spent: e.spent + spend } : { ...e, found: e.found - spend };
  return { ...state, fogGear: { ...g, worn, vault: g.vault.map(swap).filter((x): x is Item => !!x), embers } };
}

/** Upgrade an item one step, if there are embers enough and it isn't at the top. */
export function upgrade(state: GameState, id: string): GameState {
  const it = findItem(state, id);
  if (!it || it.starter || (it.plus ?? 0) >= MAX_PLUS || embersOf(state) < upgradeCost(it)) return state;
  return change(state, id, { ...it, plus: (it.plus ?? 0) + 1 }, upgradeCost(it));
}

/** Roll bonus `i` of an item again (each item's rerolls follow their own seed, so a replay is the same). */
export function reroll(state: GameState, id: string, i: number): GameState {
  const it = findItem(state, id);
  if (!it || !it.bonuses[i] || embersOf(state) < REROLL_COST) return state;
  const seed = [...it.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) + (it.rerolls ?? 0) * 7919;
  const next = rerollBonus(it, i, seeded(seed));
  return next === it ? state : change(state, id, next, REROLL_COST);
}

/** Melt an item down into embers. */
export function salvage(state: GameState, id: string): GameState {
  const it = findItem(state, id);
  if (!it || it.starter) return state;
  const g = gearOf(state);
  const out = change(state, id, null, -salvageValue(it));
  return g.guard && g.worn[g.guard]?.id === id ? { ...out, fogGear: { ...out.fogGear!, guard: undefined } } : out;
}
