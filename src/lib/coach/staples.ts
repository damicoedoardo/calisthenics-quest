import type { Family } from '@/exercises/coaching';
import type { ExerciseId } from '@/sprites/characters/exercise';

/* The staples: the well-known exercises of each movement family, the ones a coach would write down
   first. The catalog has 870+ exercises, many of them odd variations ("Chain Press", "Bench
   Sprint"); the coach picks from these when it can, and from the rest only to fill a gap. Library
   ids; the list order is a soft preference. */

export const STAPLES: Partial<Record<Family, string[]>> = {
  squat: ['Barbell_Squat', 'Goblet_Squat', 'Dumbbell_Squat', 'Leg_Press', 'Bodyweight_Squat', 'Front_Squat_Clean_Grip', 'Hack_Squat', 'Smith_Machine_Squat', 'Squats_-_With_Bands'],
  lunge: ['Dumbbell_Lunges', 'Bodyweight_Walking_Lunge', 'Split_Squat_with_Dumbbells', 'Barbell_Lunge', 'Dumbbell_Step_Ups', 'Dumbbell_Rear_Lunge', 'Barbell_Walking_Lunge'],
  hinge: ['Romanian_Deadlift', 'Barbell_Deadlift', 'Stiff-Legged_Dumbbell_Deadlift', 'Trap_Bar_Deadlift', 'Barbell_Hip_Thrust', 'Butt_Lift_Bridge', 'Single_Leg_Glute_Bridge', 'Kettlebell_One-Legged_Deadlift', 'Hyperextensions_Back_Extensions', 'Superman', 'Band_Good_Morning'],
  'push-horizontal': ['Barbell_Bench_Press_-_Medium_Grip', 'Dumbbell_Bench_Press', 'Incline_Dumbbell_Press', 'Machine_Bench_Press', 'Pushups', 'Incline_Push-Up', 'Push-Ups_With_Feet_Elevated', 'Push-Ups_-_Close_Triceps_Position', 'forma:archer-pushup', 'Bench_Press_-_With_Bands', 'Leverage_Chest_Press'],
  'push-vertical': ['Standing_Military_Press', 'Dumbbell_Shoulder_Press', 'Seated_Dumbbell_Press', 'Machine_Shoulder_Military_Press', 'Dips_-_Triceps_Version', 'Bench_Dips', 'Handstand_Push-Ups', 'Shoulder_Press_-_With_Bands'],
  'pull-vertical': ['Pullups', 'Chin-Up', 'forma:strict-pullup', 'Wide-Grip_Lat_Pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Band_Assisted_Pull-Up', 'forma:negatives', 'forma:dead-hang', 'Weighted_Pull_Ups'],
  'pull-horizontal': ['Bent_Over_Barbell_Row', 'One-Arm_Dumbbell_Row', 'Seated_Cable_Rows', 'Inverted_Row', 'Bent_Over_Two-Dumbbell_Row', 'T-Bar_Row_with_Handle', 'Leverage_Iso_Row'],
  arms: ['Dumbbell_Bicep_Curl', 'Hammer_Curls', 'Barbell_Curl', 'Triceps_Pushdown', 'Standing_Dumbbell_Triceps_Extension', 'EZ-Bar_Skullcrusher', 'Tricep_Dumbbell_Kickback'],
  shoulders: ['Side_Lateral_Raise', 'Face_Pull', 'Reverse_Flyes', 'Band_Pull_Apart', 'Front_Dumbbell_Raise', 'Lateral_Raise_-_With_Bands', 'Dumbbell_Shrug'],
  'legs-isolation': ['Leg_Extensions', 'Lying_Leg_Curls', 'Seated_Leg_Curl', 'Standing_Calf_Raises', 'Natural_Glute_Ham_Raise', 'Calf_Raises_-_With_Bands'],
  core: ['Plank', 'Dead_Bug', 'Side_Bridge', 'Crunches', 'Reverse_Crunch', 'forma:knee-raise', 'Hanging_Leg_Raise', 'Russian_Twist', 'Cable_Crunch', 'Ab_Roller', 'forma:tuck-lsit', 'Flat_Bench_Lying_Leg_Raise', 'Sit-Up'],
};

const ALL = new Set(Object.values(STAPLES).flat());
export const isStaple = (id: string) => ALL.has(id);

/** Hard body-weight moves, and the level of their pattern they need (2: you can do a few). */
export const NEEDS_LEVEL: Partial<Record<ExerciseId, number>> = {
  pullup: 2,
  'strict-pullup': 3,
  'lsit-pullup': 5,
  dips: 3,
  'handstand-pushup': 5,
  'archer-pushup': 4,
  'toes-to-bar': 4,
  lsit: 4,
};

/** Few-rep body-weight moves: reps per level 1..5 are lower than for a push-up or a squat. */
export const FEW_REPS: ExerciseId[] = ['pullup', 'strict-pullup', 'lsit-pullup', 'negatives', 'assisted-pullup', 'dips', 'handstand-pushup', 'archer-pushup', 'toes-to-bar'];
