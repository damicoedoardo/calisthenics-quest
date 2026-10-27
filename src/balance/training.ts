/* Training: what a workout earns. Every number here has a goal; `pnpm balance` shows what they
   add up to (src/balance/sheet.md). Change one, run it, add a line to the changelog in
   docs/handbook/game/balance.md. */

/** XP from training. Goal: not set yet (the sheet shows workouts per level today). */
export const XP = {
  /** A full workout. */
  full: 100,
  /** The minimum quest (a short workout). Lower = short days matter less. */
  mini: 30,
  /** Extra on the workout that hits the weekly goal. */
  perfectWeek: 100,
  /** Extra for coming back after `comebackDays` away. Goal: coming back feels like a win, not a penalty. */
  comeback: 50,
  /** Days away that count as a comeback. */
  comebackDays: 14,
  /** XP for each level (flat: every level costs the same). */
  perLevel: 500,
  /** Each week in a row that hit the goal adds this share to a workout's XP... */
  streakStep: 0.1,
  /** ...up to this many weeks (5 = at most x1.5). */
  streakMax: 5,
} as const;

/** Workouts a week that count as hitting the goal (perfect week, the weekly stat points). */
export const WEEKLY_GOAL = 3;

/** How fast the plan asks for more. Goal: strength comes with time, not just sessions. */
export const PROGRESSION = {
  /** An exercise's goal goes up at most this often a week. */
  maxRaisesPerWeek: 2,
} as const;
