/* The coach: how big a workout it builds. These set the real-world dose, not the game's power: the
   XP and stat points of a workout stay the same whatever it holds (src/balance/training.ts). The
   rules that use them are in src/lib/coach/. Goal for all of them: every workout feels winnable and
   fits the minutes you said, never to failure. */

/** Sets and reps for the main lifts, by your goal. Goal: the classic ranges for each aim. */
export const DOSE = {
  strength: { sets: 4, low: 5, high: 8 },
  muscle: { sets: 3, low: 8, high: 12 },
  endurance: { sets: 3, low: 12, high: 15 },
  health: { sets: 3, low: 8, high: 12 },
  skill: { sets: 4, low: 3, high: 6 },
} as const;

/** Bodyweight moves start from your level, not your goal: reps at the bottom of the range, per
    level 1..5. Goal: a level 1 can do the first set, a level 5 is not bored. */
export const BODY_REPS = { low: [3, 5, 8, 10, 12], high: [8, 10, 15, 20, 25] } as const;

/** Few-rep body-weight moves (pull-ups, dips, archer push-ups): reps per level 1..5. Goal: 3
    pull-ups in a row at level 2 means sets of 2-4, never a set you can't finish. */
export const FEW_REPS_RANGE = { low: [1, 2, 3, 5, 6], high: [3, 4, 6, 8, 10] } as const;

/** Core holds, seconds, per level 1..5. */
export const HOLD_SEC = { low: [15, 20, 30, 40, 45], high: [30, 40, 60, 75, 90] } as const;

/** How many main moves fit in your minutes (warm-up, core and stretch come on top).
    Goal: the workout ends within a few minutes of what you said. */
export const MAIN_MOVES: Record<20 | 30 | 40 | 60, number> = { 20: 2, 30: 3, 40: 4, 60: 5 };

/** About how long one set takes with its rest, in seconds. Used to check the total time. */
export const SET_SECONDS = 150;

/** The most sets of one movement family in a workout. Goal: no part of you gets hammered. */
export const MAX_SETS_PER_FAMILY = 8;

/** The most hard sets in a workout. Goal: even a long day stays under about 24 hard sets. */
export const MAX_SETS = 24;

/** Running: the run's minutes by level 1..5 for an easy day, and how intervals are built.
    Goal: a level 1 can finish it with walk breaks; the long run grows slowly. */
export const RUN = {
  easyMin: [15, 20, 25, 30, 40],
  /** A long run is this much longer than an easy one. */
  longFactor: 1.5,
  /** Intervals: fast seconds, easy seconds, rounds by level. */
  fastSec: [30, 45, 60, 60, 90],
  easySec: [90, 90, 90, 60, 60],
  rounds: [4, 5, 6, 8, 8],
  /** Below this level an easy run is run-walk: 1 min walk after every this many minutes. */
  walkBreakBelow: 3,
  walkEvery: 3,
  /** The most a week's running may grow over last week's. Goal: about +10% a week. */
  weeklyGrowth: 0.1,
} as const;

/** How many easier and swap choices each exercise carries. */
export const CHOICES = { easier: 3, swaps: 3 } as const;

/** Coach notes kept at most. Goal: the coach's memory stays small enough to read in one look. */
export const MAX_NOTES = 30;

/** A level moves after this many recent workouts of a movement felt easy (4+ left) or very hard
    (0-1 left) on most sets. Goal: a wrong guess at setup fixes itself in about two weeks. */
export const LEVEL_SHIFT = { window: 3, need: 2 } as const;
