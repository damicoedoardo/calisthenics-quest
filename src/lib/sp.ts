import type { GameState } from './game';
import type { RunResult } from './fog';
import { LAYOUT, SP_CARDS, wardenFloor } from '@/game/dungeon/content';
import { SP_TRIAL } from '@/balance';

/* The first SP, like NosTale's specialist cards. The Wanderer hands it over after a few workouts
   (the story's `sp` ask), sealed. It wakes once you've trained a little more and reached the
   mid-boss floor in the Fog. Worn, a run has the class ability, the SP's own move and its final.
   It takes the shape of whoever holds it: change class and it changes with you. */

export interface SpState {
  /** Workouts done when the Wanderer gave it. */
  givenAt: number;
  /** Reached the mid-boss floor in the Fog since then. */
  floor?: boolean;
  /** Taken off on the Hero tab (worn by default once it wakes). */
  off?: boolean;
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

/** Wearing it into a run. */
export const spWorn = (state: GameState) => spOpen(state) && !state.sp?.off;

/** Your class's SP: its name and moves. */
export const spCard = (state: GameState) => SP_CARDS[state.profile.classId ?? 'warrior'];

/** The Wanderer's gift, from the story. */
export function giveSp(state: GameState): GameState {
  return state.sp ? state : { ...state, sp: { givenAt: state.sessions.length } };
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
