import { ROAD } from '@/balance';
import { ROAD_CHAPTERS } from '@/story/road';
import type { When } from '@/story/types';
import type { GameState } from './game';

/* The Ember Road, the story walked with friends (story: src/story/road.ts). You set out from the
   Fog's Together door. Each chapter ends in a boss your party beats in a run Together; the next
   chapter opens once that boss fell and you've trained `ROAD.gap` more times since the one before
   opened, so the whole road lasts about two months of training whatever pace your party plays at. */

/** Saved on the hero once they set out. */
export interface RoadProgress {
  /** Workouts done when you set out. */
  from: number;
  /** Chapters whose boss fell to your party, in order. */
  beaten: number;
}

export interface RoadAt {
  started: boolean;
  /** The chapter you're on (its boss still stands, or the last one fell): 0 before you set out. */
  open: number;
  beaten: number;
  /** Workouts since you set out. */
  walked: number;
  /** Workouts until the next chapter (or the finale) can open; 0 when only a boss stands in the way. */
  nextIn: number;
  /** Every boss fell and the finale's time has come. */
  finale: boolean;
  /** The finale has played: the road is walked. */
  done: boolean;
}

export const ROAD_LENGTH = ROAD_CHAPTERS.length;

/** Workouts after setting out when chapter `n` can open (n = ROAD_LENGTH + 1: the finale). */
export const roadOpensAt = (n: number) => ROAD.gap * (n - 1);

export function roadAt(state: GameState): RoadAt {
  const r = state.road;
  if (!r) return { started: false, open: 0, beaten: 0, walked: 0, nextIn: roadOpensAt(2), finale: false, done: false };
  const walked = Math.max(0, state.sessions.length - r.from);
  let open = 1;
  while (open < ROAD_LENGTH && r.beaten >= open && walked >= roadOpensAt(open + 1)) open++;
  const finale = r.beaten >= ROAD_LENGTH && walked >= roadOpensAt(ROAD_LENGTH + 1);
  return {
    started: true,
    open,
    beaten: r.beaten,
    walked,
    nextIn: Math.max(0, roadOpensAt(Math.min(open, ROAD_LENGTH) + 1) - walked),
    finale,
    done: state.seenScenes.includes('road-end'),
  };
}

/** Set out on the road: its first chapter opens now. */
export function startRoad(state: GameState): GameState {
  return state.road ? state : { ...state, road: { from: state.sessions.length, beaten: 0 } };
}

/** Your party beat chapter `n`'s boss. It counts once that chapter is the one you're on; a hero who
    hadn't set out yet sets out with it (a friend brought them along). */
export function wonRoad(state: GameState, n: number): GameState {
  const s = startRoad(state),
    at = roadAt(s);
  if (n !== at.beaten + 1 || n > at.open) return s;
  return { ...s, road: { ...s.road!, beaten: n } };
}

/** Halfway (in workouts) through chapter `n`, when Tamsin's note waits by the fire. */
export const roadNoteAt = (n: number) => roadOpensAt(n) + Math.ceil(ROAD.gap / 2);

/** Does a story scene's `road` moment hold? (`When.road`, read by src/story/engine.ts.) */
export function roadHolds(w: NonNullable<When['road']>, state: GameState): boolean {
  const at = roadAt(state);
  if (!at.started) return false;
  if ('open' in w) return at.open >= w.open;
  // A note is for the stretch you're on; once the next chapter opens it stays behind.
  if ('note' in w) return at.open === w.note && at.walked >= roadNoteAt(w.note);
  if ('won' in w) return at.beaten >= w.won;
  return at.finale;
}
