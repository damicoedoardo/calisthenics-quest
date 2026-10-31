import { daysSinceLastSession, type GameState } from './game';
import { seeded } from './random';
import { NO_GEAR, salvageValue, type FogGear } from './fog-gear';
import { betterBy, MAX_PLUS, rerollBonus, safeFloor, type Item, type Rarity } from '@/game/dungeon/items';
import { EMBERS, FORGE, FORGE_RISK, MAT_IDS, STEPS, type MatId } from '@/balance';

/* Mira's forge, on the Hero tab's Gear part. Workouts earn embers, and the forge spends them: upgrade an item
   (+1 to +15), roll one of its bonuses again, or melt an item down for a few embers. Embers come
   mostly from training; melting down what the dungeon gives adds a little. From +6 a step also asks
   for materials, which only co-op runs drop, and from +7 it can miss (the numbers are in
   src/balance/upgrades.ts). */

/** Embers a workout earns (src/balance/economy.ts). */
export { EMBERS };
/** The embers the next upgrade asks (more each step, STEPS in src/balance/upgrades.ts). */
export const upgradeCost = (it: Item) => STEPS[Math.min(MAX_PLUS - 1, it.plus ?? 0)].embers;
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

/** The materials the next upgrade asks (none up to +5). */
export const upgradeMats = (it: Item): Partial<Record<MatId, number>> => STEPS[Math.min(MAX_PLUS - 1, it.plus ?? 0)].mats;

/** The materials you have. */
export const matsOf = (state: GameState): Partial<Record<MatId, number>> => gearOf(state).mats ?? {};

/** Materials you still need for the next upgrade (empty: you have them all). */
export function matsShort(state: GameState, it: Item): Partial<Record<MatId, number>> {
  const have = matsOf(state),
    out: Partial<Record<MatId, number>> = {};
  for (const [id, n] of Object.entries(upgradeMats(it)) as [MatId, number][]) if ((have[id] ?? 0) < n) out[id] = n - (have[id] ?? 0);
  return out;
}

/** Trained lately: Mira's hands are steadier (FORGE_RISK.rested). */
export function rested(state: GameState, now: Date): boolean {
  const gap = daysSinceLastSession(state, now);
  return gap !== null && gap <= FORGE_RISK.restedDays;
}

/** The chance the next upgrade holds (0-1): the step's own, plus each miss since the last that
    held, plus training lately. */
export function upgradeOdds(state: GameState, it: Item, now: Date): number {
  const step = STEPS[Math.min(MAX_PLUS - 1, it.plus ?? 0)];
  if (step.odds >= 1) return 1;
  return Math.min(1, step.odds + (it.misses ?? 0) * FORGE_RISK.pity + (rested(state, now) ? FORGE_RISK.rested : 0));
}

/** Whether the forge would take this item one step up now. */
export function canUpgrade(state: GameState, it: Item): boolean {
  return !it.starter && (it.plus ?? 0) < MAX_PLUS && embersOf(state) >= upgradeCost(it) && Object.keys(matsShort(state, it)).length === 0;
}

/** What an upgrade did: it held, it missed and the item stayed, or it missed and slipped one plus. */
export type Forged = 'held' | 'missed' | 'slipped';

/** Try to take an item one step up. The embers and materials are spent either way; from +7 it can
    miss (seeded from the item's id and its tries, so a press always gives the same result). */
export function tryUpgrade(state: GameState, id: string, now: Date = new Date()): { state: GameState; forged: Forged | null } {
  const it = findItem(state, id);
  if (!it || !canUpgrade(state, it)) return { state, forged: null };
  const plus = it.plus ?? 0,
    odds = upgradeOdds(state, it, now),
    rnd = seeded([...it.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 11) + (it.tries ?? 0) * 104729);
  let next: Item, forged: Forged;
  if (odds >= 1 || rnd() < odds) {
    next = { ...it, plus: plus + 1, misses: undefined };
    forged = 'held';
  } else {
    const slip = rnd() < FORGE_RISK.drop && plus - 1 >= safeFloor(plus);
    next = { ...it, plus: slip ? plus - 1 : plus, misses: (it.misses ?? 0) + 1 };
    forged = slip ? 'slipped' : 'missed';
  }
  if (plus >= 5) next.tries = (it.tries ?? 0) + 1;
  if (!next.misses) delete next.misses;
  const spent = change(state, id, next, upgradeCost(it));
  return { state: { ...spent, fogGear: { ...spent.fogGear!, mats: addMats(matsOf(spent), upgradeMats(it), -1) } }, forged };
}

/** Upgrade an item one step, if you have what it asks and it isn't at the top (it can miss from +7). */
export function upgrade(state: GameState, id: string, now: Date = new Date()): GameState {
  return tryUpgrade(state, id, now).state;
}

/** Materials added (`sign` 1) or taken away (-1), never under 0. */
export function addMats(have: Partial<Record<MatId, number>>, more: Partial<Record<MatId, number>>, sign: 1 | -1 = 1): Partial<Record<MatId, number>> {
  const out: Partial<Record<MatId, number>> = {};
  for (const id of MAT_IDS) {
    const n = Math.max(0, (have[id] ?? 0) + sign * (more[id] ?? 0));
    if (n) out[id] = n;
  }
  return out;
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
  return change(state, id, null, -salvageValue(it));
}

/** What "Melt many" can take from the vault: every item of one rarity, or every item weaker than
    what you wear in its slot. */
export type MeltPick = Rarity | 'weaker';

/** The vault items a pick melts. Never what you wear, a starter, or an item you forged (+1 or
    more): those you melt one at a time from their card. */
export function meltable(state: GameState, pick: MeltPick): Item[] {
  const g = gearOf(state);
  return g.vault.filter((it) => {
    if (it.starter || (it.plus ?? 0) > 0) return false;
    if (pick !== 'weaker') return it.rarity === pick;
    const pct = betterBy(it, g.worn[it.slot]);
    return pct !== null && pct < 0;
  });
}

/** Melt many vault items at once (worn and starter ones are skipped): their embers all go to you. */
export function salvageMany(state: GameState, ids: readonly string[]): GameState {
  const g = gearOf(state),
    want = new Set(ids),
    gone = g.vault.filter((it) => want.has(it.id) && !it.starter);
  if (!gone.length) return state;
  const e = g.embers ?? { found: 0, spent: 0 },
    found = gone.reduce((n, it) => n + salvageValue(it), 0);
  return { ...state, fogGear: { ...g, vault: g.vault.filter((it) => !gone.includes(it)), embers: { ...e, found: e.found + found } } };
}

/** Give a friend some materials: they leave your save once the server has taken the gift. */
export function giveMats(state: GameState, mat: MatId, n: number): GameState {
  const g = gearOf(state);
  return { ...state, fogGear: { ...g, mats: addMats(g.mats ?? {}, { [mat]: n }, -1) } };
}

/** Gifts from friends, into your save. */
export function takeGifts(state: GameState, gifts: { mat: string; n: number }[]): GameState {
  const g = gearOf(state),
    more: Partial<Record<MatId, number>> = {};
  for (const x of gifts) if ((MAT_IDS as string[]).includes(x.mat) && x.n > 0) more[x.mat as MatId] = (more[x.mat as MatId] ?? 0) + x.n;
  return Object.keys(more).length ? { ...state, fogGear: { ...g, mats: addMats(g.mats ?? {}, more) } } : state;
}
