import { RAMP, REST, TIME } from '@/balance';
import type { SlotRole } from '../program';
import type { PlanItem } from './types';

/* How long a workout takes: every set's work (reps at a few seconds each, or the hold), its rest,
   getting set up for each exercise, the ramp-up sets before a first heavy lift, and the warm-up
   and cool-down parts. The workout screen rests with `restFor` too, so the clock it counts and
   the minutes it promised come from the same numbers. */

type Timed = Pick<PlanItem, 'role' | 'unit' | 'sets' | 'low' | 'high' | 'rest' | 'run' | 'weighted' | 'skipped' | 'ramp'>;

/** Seconds of rest after a set: the coach's own, else by role (a weighted main lift rests longer). */
export function restFor(it: { role: SlotRole; rest?: number; weighted?: boolean }): number {
  if (it.rest) return it.rest;
  if (it.role === 'core') return REST.core;
  if (it.role === 'accessory') return REST.accessory;
  return it.weighted ? REST.heavy : REST.main;
}

/** Seconds one exercise takes, a rest after each set included. */
export function secondsOf(it: Timed): number {
  if (it.skipped) return 0;
  if (it.run) return it.low;
  if (it.role === 'warmup' || it.role === 'stretch') return it.low * it.sets + TIME.change;
  const mid = (it.low + it.high) / 2;
  const work = it.unit === 'sec' ? mid : mid * (it.weighted ? TIME.weightedRep : TIME.rep);
  const ramp = (it.ramp ?? 0) * (work + RAMP.rest);
  return Math.round(it.sets * (work + restFor(it)) + (it.weighted ? TIME.setupWeighted : TIME.setup) + ramp);
}

/** About how many minutes the workout takes (what's skipped left out). */
export function minutesOf(items: Timed[]): number {
  return Math.round(items.reduce((a, it) => a + secondsOf(it), 0) / 60);
}
