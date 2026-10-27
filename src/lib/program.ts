import { COACHING } from '@/exercises/coaching';
import type { ExerciseId } from '@/sprites/characters/exercise';

/* The built-in plan: two full-body days that alternate, each opening with a warm-up and closing with
   a stretch. Every move is a library exercise with its own pixel demo and coaching. It is the plan
   until the workout planner builds sessions from the library, and the plan the app falls back to
   offline after that. */

export type Kit = 'gym' | 'home';
export type DayType = 'A' | 'B';
/** Warm-up and stretch are one tap; main and core sets are logged with reps left in the tank. */
export type SlotRole = 'warmup' | 'main' | 'core' | 'stretch';

export interface Slot {
  /** The exercise's demo id: the same id the library and its coaching use. */
  id: ExerciseId;
  name: string;
  role: SlotRole;
  unit: 'reps' | 'sec';
  sets: number;
  /** Per-set target range: start at the bottom, earn a rep at a time up to the top. */
  low: number;
  high: number;
  /** Done with a weight you pick: at the top of the range, add a little weight and start again. */
  weighted?: boolean;
}

const slot = (id: ExerciseId, name: string, role: SlotRole, sets: number, low: number, high = low, extra: Partial<Slot> = {}): Slot => ({
  id,
  name,
  role,
  unit: role === 'warmup' || role === 'stretch' ? 'sec' : 'reps',
  sets,
  low,
  high,
  ...extra,
});

const warmup = slot('circles', 'Joint circles', 'warmup', 1, 90);
const sec = { unit: 'sec' as const };

export const PLAN: Record<Kit, Record<DayType, Slot[]>> = {
  gym: {
    A: [
      warmup,
      slot('barbell-squat', 'Barbell squat', 'main', 3, 8, 12, { weighted: true }),
      slot('bench-press', 'Bench press', 'main', 3, 8, 12, { weighted: true }),
      slot('lat-pulldown', 'Lat pulldown', 'main', 3, 10, 15, { weighted: true }),
      slot('plank', 'Plank', 'core', 3, 20, 60, sec),
      slot('quad-stretch', 'Quad stretch', 'stretch', 1, 60),
    ],
    B: [
      warmup,
      slot('rdl', 'Romanian deadlift', 'main', 3, 8, 12, { weighted: true }),
      slot('shoulder-press', 'Shoulder press', 'main', 3, 8, 12, { weighted: true }),
      slot('seated-row', 'Seated row', 'main', 3, 10, 15, { weighted: true }),
      slot('dead-bug', 'Dead bug', 'core', 3, 8, 15),
      slot('toe-touch', 'Toe touch stretch', 'stretch', 1, 60),
    ],
  },
  home: {
    A: [
      warmup,
      slot('squat', 'Squat', 'main', 3, 10, 20),
      slot('pushup', 'Push-up', 'main', 3, 5, 15),
      slot('inverted-row', 'Table row', 'main', 3, 5, 12),
      slot('plank', 'Plank', 'core', 3, 20, 60, sec),
      slot('quad-stretch', 'Quad stretch', 'stretch', 1, 60),
    ],
    B: [
      warmup,
      slot('lunge', 'Lunge', 'main', 3, 8, 15),
      slot('bench-dip', 'Chair dip', 'main', 3, 6, 15),
      slot('bridge', 'Glute bridge', 'main', 3, 10, 20),
      slot('side-plank', 'Side plank', 'core', 2, 15, 45, sec),
      slot('child-pose', "Child's pose", 'stretch', 1, 60),
    ],
  },
};

/** The one line of form shown while training: the exercise's first coaching tip. */
export function cueOf(id: ExerciseId): string {
  return COACHING[id]?.tips[0] ?? '';
}

/** Every exercise the built-in plan can ask for. */
export function planExercises(): Slot[] {
  const all = Object.values(PLAN).flatMap((days) => Object.values(days).flat());
  return all.filter((s, i) => all.findIndex((o) => o.id === s.id) === i);
}

/** How each part of a workout is named and colored on screen. */
export const ROLE_LABEL: Record<SlotRole, string> = { warmup: 'Warm-up', main: 'Main', core: 'Core', stretch: 'Stretch' };
export const ROLE_COLOR: Record<SlotRole, string> = { warmup: '#fbbf24', main: '#fb923c', core: '#38bdf8', stretch: '#34d399' };
