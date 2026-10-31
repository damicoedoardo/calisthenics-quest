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

/** How many main moves (the big compound lifts or skills) fit in your minutes. Warm-up,
    accessories, core and cool-down come on top. Goal: the workout ends within a few minutes of
    what you said. */
export const MAIN_MOVES: Record<20 | 30 | 40 | 60, number> = { 20: 2, 30: 3, 40: 3, 60: 4 };

/** Accessory moves after the main ones (arms, shoulders, a leg isolation, lighter and higher
    reps), by minutes. Goal: a short workout stays on the big moves; a long one rounds them out. */
export const ACCESSORY_MOVES: Record<20 | 30 | 40 | 60, number> = { 20: 0, 30: 0, 40: 1, 60: 2 };

/** Accessories: sets and reps, whatever the goal. Goal: lighter, controlled, close to the top of
    the range without grinding. */
export const ACCESSORY_DOSE = { sets: 3, low: 10, high: 15 } as const;

/** The warm-up, seconds per part: `pulse` (easy cardio to get warm), each `move` (joint circles
    and dynamic moves for what the day trains), and the most it holds for a short workout.
    Goal: about 5 minutes, warm and moving before the first hard set. */
export const WARMUP_SEC = { pulse: 180, shortPulse: 120, move: 45, whole: 60 } as const;

/** Light ramp-up sets before the first weighted lift (not logged), and their rest. Goal: the
    first heavy set never comes cold. */
export const RAMP = { sets: 2, rest: 45 } as const;

/** The cool-down: stretches by minutes, and seconds each. Goal: what was trained most gets
    stretched, in two or three easy minutes. */
export const COOLDOWN = { stretches: { 20: 1, 30: 2, 40: 2, 60: 3 } as Record<20 | 30 | 40 | 60, number>, sec: 45 } as const;

/** How long a workout takes, for the "about N min" a workout shows and the check that it fits.
    Seconds per rep (`rep`, slower with a weight: `weightedRep`), getting set up for an exercise
    (loading a bar: `setupWeighted`, else `setup`), moving between warm-up or stretch parts
    (`change`). Goal: the estimate lands within a few minutes of a real workout. */
export const TIME = { rep: 3, weightedRep: 4, setup: 20, setupWeighted: 45, change: 10 } as const;

/** How far over your minutes a workout may go before sets are trimmed. Goal: "40 minutes" never
    turns into an hour. */
export const TIME_SLACK = 0.1;

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

/** Which days of the coming week hold a workout, by workouts a week: days after the week's first
    day. Goal: a rest day between workouts where the week has room, never more than two in a row. */
export const WEEK_SPREAD: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 3, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

/** Rest after a set, seconds, when the coach didn't set one: a weighted main lift (`heavy`), any
    other main move (`main`, as `REST_SECONDS`), an accessory, core; and the range a coach may set
    per exercise. Goal: heavy sets get time to breathe, light ones keep moving. */
export const REST = { heavy: 120, main: 90, accessory: 60, core: 60, min: 30, max: 240 } as const;
