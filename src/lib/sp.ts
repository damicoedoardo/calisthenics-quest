import type { GameState } from './game';
import type { RunResult } from './fog';
import { LAYOUT, spDef, wardenFloor, type SpNo } from '@/game/dungeon/content';
import { SP_TRIAL } from '@/balance';

/* The SPs, like NosTale's specialist cards: four for each class. The Wanderer hands the first over
   after a few workouts (the story's `sp` ask), sealed. It wakes once you've trained a little more
   and reached the mid-boss floor in the Fog. The story gives the others later, awake, as surprises
   (`SP_GIFTS`): nothing shows an SP before it's yours. Worn, a run has the class ability, the SP's
   own move, its final and its passive. You wear one at a time, picked on the Hero tab. An SP takes
   the shape of whoever holds it: change class and it changes with you. */

export interface SpState {
  /** Workouts done when the Wanderer gave it. */
  givenAt: number;
  /** Reached the mid-boss floor in the Fog since then. */
  floor?: boolean;
  /** Taken off on the Hero tab (worn by default once it wakes). */
  off?: boolean;
  /** The SPs the story gave after the first (2 to 4), awake from the start. */
  more?: SpNo[];
  /** The one you wear (left out: the newest you have). */
  worn?: SpNo;
}

/** The floor the trial asks you to reach, from 1: the mid-boss's. */
export const SP_FLOOR = wardenFloor(LAYOUT) + 1;

/** Where the trial stands: workouts since the gift (and how many it asks), and the floor. */
export function spTrial(state: GameState): { workouts: number; need: number; floor: boolean } | null {
  const sp = state.sp;
  if (!sp) return null;
  return { workouts: Math.min(SP_TRIAL.workouts, state.sessions.length - sp.givenAt), need: SP_TRIAL.workouts, floor: !!sp.floor };
}

/** The SP has woken: the trial is done. */
export function spOpen(state: GameState): boolean {
  const t = spTrial(state);
  return !!t && t.workouts >= t.need && t.floor;
}

/** The SPs you have and can wear, in order: the first once it has woken, then the story's gifts. */
export function spOwned(state: GameState): SpNo[] {
  const sp = state.sp;
  if (!sp) return [];
  return [...(spOpen(state) ? [1 as SpNo] : []), ...(sp.more ?? [])].sort((a, b) => a - b);
}

/** The SP you'd wear: the one you picked, or the newest you have (0 when you have none awake). */
export function spChosen(state: GameState): SpNo | 0 {
  const own = spOwned(state),
    pick = state.sp?.worn;
  return pick && own.includes(pick) ? pick : (own.at(-1) ?? 0);
}

/** The SP worn into a run, or 0 (none awake, or taken off). */
export const spWorn = (state: GameState): SpNo | 0 => (state.sp?.off ? 0 : spChosen(state));

/** One of your class's SPs (the one you'd wear, when none is named): its name, moves and passive. */
export const spCard = (state: GameState, n?: SpNo) => spDef(state.profile.classId, n || spChosen(state) || 1);

/** The Wanderer's gift, from the story: the first (sealed), or a later one, awake and put on. */
export function giveSp(state: GameState, n: SpNo = 1): GameState {
  if (n === 1) return state.sp ? state : { ...state, sp: { givenAt: state.sessions.length } };
  const sp = state.sp ?? { givenAt: state.sessions.length, floor: true };
  if (sp.more?.includes(n)) return state;
  const { off: _off, ...rest } = sp;
  return { ...state, sp: { ...rest, more: [...(sp.more ?? []), n], worn: n } };
}

/** Wear another of your SPs. */
export function wearSp(state: GameState, n: SpNo): GameState {
  if (!state.sp || !spOwned(state).includes(n)) return state;
  const { off: _off, ...rest } = state.sp;
  return { ...state, sp: { ...rest, worn: n } };
}

/** After a run: reaching the mid-boss floor counts for the trial. */
export function spAfterRun(state: GameState, r: Pick<RunResult, 'floor'>): GameState {
  const sp = state.sp;
  if (!sp || sp.floor || (r.floor ?? 0) < SP_FLOOR) return state;
  return { ...state, sp: { ...sp, floor: true } };
}

/** Wear it or take it off. */
export function setSpOff(state: GameState, off: boolean): GameState {
  if (!state.sp) return state;
  const { off: _old, ...rest } = state.sp;
  return { ...state, sp: off ? { ...rest, off: true } : rest };
}

/** The simulators' model player: given the SP on time, a trial done two workouts later (reaching
    the mid-boss floor is quick by then), so it wears one from this many workouts on. */
export const SP_MODEL_AT = SP_TRIAL.at + SP_TRIAL.workouts;
