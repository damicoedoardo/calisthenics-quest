import type { GameState } from './game';
import type { ClassId } from './gear';
import type { Build, StatId } from './stats';
import { buildOf, refundPoint, spendPoint } from './stats';
import { SWEAT } from '@/balance';

/* Sweat coins: every workout earns one, and changing who you are spends them. Taking all your
   stat points back costs `SWEAT.respec`, changing class `SWEAT.classChange` (the first change is
   free, and so is the pick in the opening). Points spent since your last workout come back free,
   so a mis-tap never costs a coin. */

export interface Sweat {
  /** Coins spent so far (earned ones come from the workouts, so only spending is saved). */
  spent: number;
  /** Class changes made after the first pick. */
  changes?: number;
}

/** Coins earned, all time. */
export const coinsEarned = (state: GameState) => state.sessions.length * SWEAT.perWorkout;

/** Coins you have now. */
export const coins = (state: GameState) => Math.max(0, coinsEarned(state) - (state.sweat?.spent ?? 0));

const spend = (state: GameState, n: number): GameState => ({ ...state, sweat: { ...state.sweat, spent: (state.sweat?.spent ?? 0) + n } });

/** Points as they stood at your last workout: what came before it costs a coin to take back. */
export function settledBuild(state: GameState): Build {
  const at = state.buildAt;
  return at && at.workouts === state.sessions.length ? at.build : buildOf(state);
}

/** Before a change to your points: note them as they stood since the last workout, once. */
export function noteBuild(state: GameState): GameState {
  const at = state.buildAt;
  if (at && at.workouts === state.sessions.length) return state;
  return { ...state, buildAt: { workouts: state.sessions.length, build: buildOf(state) } };
}

/** Whether a point in this stat comes back free (spent since your last workout). */
export const freeBack = (state: GameState, stat: StatId) => (buildOf(state)[stat] ?? 0) > (settledBuild(state)[stat] ?? 0);

/** What taking every point back costs now: nothing if they were all spent since your last workout. */
export function respecCost(state: GameState): number {
  const settled = settledBuild(state);
  return Object.values(settled).some((n) => (n ?? 0) > 0) ? SWEAT.respec : 0;
}

/** Take every point back, paying a coin if any were spent before your last workout. */
export function respec(state: GameState): GameState {
  const cost = respecCost(state);
  if (coins(state) < cost) return state;
  const paid = cost ? spend(state, cost) : state;
  return { ...paid, build: {}, buildAt: { workouts: state.sessions.length, build: {} } };
}

/** What changing class costs now: nothing for the first pick or the free changes. */
export function classCost(state: GameState): number {
  if (!state.profile.classId) return 0;
  return (state.sweat?.changes ?? 0) < SWEAT.freeChanges ? 0 : SWEAT.classChange;
}

/** Become another class, paying in sweat coins. Nothing happens if you can't pay. */
export function changeClass(state: GameState, id: ClassId): GameState {
  if (state.profile.classId === id) return state;
  const first = !state.profile.classId,
    cost = classCost(state);
  if (coins(state) < cost) return state;
  const paid = cost ? spend(state, cost) : state;
  const sweat = first ? paid.sweat : { spent: paid.sweat?.spent ?? 0, changes: (paid.sweat?.changes ?? 0) + 1 };
  return { ...paid, profile: { ...paid.profile, classId: id }, ...(sweat ? { sweat } : {}) };
}

/** Put a point into a stat (noting your points first, so it can come back free until your next workout). */
export const putPoint = (state: GameState, stat: StatId) => spendPoint(noteBuild(state), stat);

/** Take a point back out of a stat: free when it was spent since your last workout, otherwise not
    here (that's a respec). */
export const takeBack = (state: GameState, stat: StatId) => (freeBack(state, stat) ? refundPoint(noteBuild(state), stat) : state);
