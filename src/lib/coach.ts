import type { BlockRole, Rir, SessionEntry, SetLog } from './game';
import type { SkillNode } from './skills';

/**
 * The coach: small, deterministic rules that shape each workout from how your
 * sets felt. No text model, nothing hidden: every call returns its reason.
 */

/** How today's plan is shaped. Easing in after time off wins over a light week. */
export type PlanMode = 'normal' | 'ease' | 'light';

/** A gap this long (days) makes the next session an easing-in one. */
export const EASE_GAP_DAYS = 10;
/** Every Nth week you train is a light week. */
export const LIGHT_WEEK_EVERY = 6;

export function planMode(gapDays: number | null, trainingWeek: number): PlanMode {
  if (gapDays !== null && gapDays >= EASE_GAP_DAYS) return 'ease';
  if (trainingWeek > 0 && trainingWeek % LIGHT_WEEK_EVERY === 0) return 'light';
  return 'normal';
}

/** One set fewer on a light week; one set fewer and about 80% of the reps when easing in. */
export function shapeBlock(sets: number, reps: number, unit: 'reps' | 'sec', mode: PlanMode): { sets: number; reps: number } {
  if (mode === 'normal') return { sets, reps };
  const fewer = Math.max(2, sets - 1);
  if (mode === 'light') return { sets: fewer, reps };
  const eased = unit === 'sec' ? Math.round((reps * 0.8) / 2) * 2 : Math.round(reps * 0.8);
  return { sets: fewer, reps: Math.max(unit === 'sec' ? 2 : 1, eased) };
}

// ---------- rest between sets ----------

export const BASE_REST: Record<BlockRole, number> = { main: 120, support: 90, core: 60 };
export const MIN_REST = 45;
export const MAX_REST = 240;

export interface Rest {
  seconds: number;
  why: string;
}

/** Rest after a set: the main exercise gets the most, and a hard set earns more. */
export function restAfter(role: BlockRole, set: SetLog, target: number): Rest {
  const base = BASE_REST[role];
  let seconds = base;
  let why = role === 'main' ? 'Main exercise: full rest' : role === 'core' ? 'Core: short rest' : 'Support: steady rest';
  if (set.rir === '0-1') {
    seconds = base + 60;
    why = 'That set was very hard: extra rest';
  } else if (set.reps < target) {
    seconds = base + 30;
    why = 'Short of target: a bit more rest';
  } else if (set.rir === '4+') {
    seconds = base - 30;
    why = 'That set was easy: shorter rest';
  }
  return { seconds: Math.min(MAX_REST, Math.max(MIN_REST, seconds)), why };
}

// ---------- the next set ----------

/** A grinder that fell short sets the next set's target to what you just managed. */
export function nextTarget(target: number, logged: SetLog[]): { reps: number; why: string | null } {
  const last = logged[logged.length - 1];
  if (last && last.rir === '0-1' && last.reps < target) return { reps: last.reps, why: 'Matched to your last set' };
  return { reps: target, why: null };
}

// ---------- the next session ----------

export interface TargetChange {
  exerciseId: string;
  from: number;
  to: number;
  why: string;
}

const easy = (s: SetLog) => s.rir === '4+';
const missed = (sets: SetLog[], target: number) => sets.filter((s) => s.reps < target).length * 2 >= sets.length;

/**
 * Next session's per-set target. `target` is the stored one (before any easing),
 * `planned` today's planned sets, `previous` the last earlier entry for this exercise.
 */
export function progressTarget(
  node: SkillNode,
  target: number,
  planned: number,
  today: SetLog[],
  previous: SessionEntry | undefined,
  mode: PlanMode,
): { to: number; why: string } {
  const step = node.unit === 'sec' ? 2 : 1;
  const cap = (n: number) => Math.min(n, node.unlockReps);
  if (mode === 'ease') return { to: target, why: 'Easing back in: same target next time' };
  if (mode === 'light') return { to: target, why: 'Light week: same target next time' };
  if (today.length < planned) return { to: target, why: 'Not every set done: same target' };
  const hit = today.every((s) => s.reps >= target);
  if (hit && today.every(easy)) return { to: cap(target + 2 * step), why: 'Every set felt easy: a bigger step' };
  if (hit && !today.some((s) => s.rir === '0-1')) return { to: cap(target + step), why: 'Clean sets: one step up' };
  const floor = Math.max(step, Math.ceil(node.startReps / 2));
  if (missed(today, target) && previous && previous.sets.length > 0 && missed(previous.sets, previous.target)) {
    return { to: Math.max(floor, target - step), why: 'Two tough sessions in a row: one step back' };
  }
  return { to: target, why: hit ? 'A grinder in there: same target' : 'Short of target: same target' };
}

export type { Rir };
