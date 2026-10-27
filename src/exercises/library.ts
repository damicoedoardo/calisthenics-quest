import { PATHS } from '@/lib/skills';
import type { ExerciseId } from '@/sprites/characters/exercise';

/* The exercise library: the open catalog (free-exercise-db, public domain, 870+ exercises from
   barbell lifts to stretches; refresh with `node scripts/import-exercises.mjs`) plus the moves of
   FORMA's own program it doesn't have. The catalog is big, so it loads on demand (loadLibrary).
   Which entries have a pixel demo is the DEMOS table below: add a demo in
   src/sprites/characters/exercise.ts, then point catalog ids at it here. */

export interface CatalogExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  level: 'beginner' | 'intermediate' | 'expert';
  force: string | null;
  mechanic: string | null;
  primary: string[];
  secondary: string[];
  steps: string[];
}

export interface LibraryExercise extends CatalogExercise {
  /** The pixel demo that shows it, if there is one yet. */
  demo?: ExerciseId;
  source: 'catalog' | 'forma';
}

/** Catalog id -> the demo that shows it. */
export const DEMOS: Record<string, ExerciseId> = {
  // the program's moves
  'Incline_Push-Up': 'incline-pushup',
  'Incline_Push-Up_Medium': 'incline-pushup',
  Pushups: 'pushup',
  'Push-Ups_-_Close_Triceps_Position': 'diamond-pushup',
  Parallel_Bar_Dip: 'dips',
  'Dips_-_Triceps_Version': 'dips',
  'Band_Assisted_Pull-Up': 'assisted-pullup',
  Pullups: 'pullup',
  // the first batch of gym moves
  Bodyweight_Squat: 'squat',
  Barbell_Squat: 'barbell-squat',
  Barbell_Full_Squat: 'barbell-squat',
  Barbell_Deadlift: 'deadlift',
  'Barbell_Bench_Press_-_Medium_Grip': 'bench-press',
  Dumbbell_Bicep_Curl: 'curl',
  Dumbbell_Shoulder_Press: 'shoulder-press',
  Bent_Over_Barbell_Row: 'barbell-row',
  Plank: 'plank',
  Bodyweight_Walking_Lunge: 'lunge',
};

/** The program's moves with no catalog entry of their own, shown from the skill tree. */
const PROGRAM_ONLY: Record<string, Pick<CatalogExercise, 'equipment' | 'level' | 'force' | 'primary' | 'secondary'>> = {
  'archer-pushup': { equipment: 'body only', level: 'intermediate', force: 'push', primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'dead-hang': { equipment: 'body only', level: 'beginner', force: 'static', primary: ['forearms'], secondary: ['lats', 'shoulders'] },
  negatives: { equipment: 'body only', level: 'beginner', force: 'pull', primary: ['lats'], secondary: ['biceps', 'middle back'] },
  'strict-pullup': { equipment: 'body only', level: 'intermediate', force: 'pull', primary: ['lats'], secondary: ['biceps', 'middle back'] },
  'lsit-pullup': { equipment: 'body only', level: 'expert', force: 'pull', primary: ['lats'], secondary: ['abdominals', 'biceps'] },
  'knee-raise': { equipment: 'body only', level: 'beginner', force: 'pull', primary: ['abdominals'], secondary: [] },
  'tuck-lsit': { equipment: 'body only', level: 'beginner', force: 'static', primary: ['abdominals'], secondary: ['triceps', 'shoulders'] },
  'one-leg-lsit': { equipment: 'body only', level: 'intermediate', force: 'static', primary: ['abdominals'], secondary: ['quadriceps', 'triceps'] },
  lsit: { equipment: 'body only', level: 'expert', force: 'static', primary: ['abdominals'], secondary: ['quadriceps', 'triceps'] },
  'toes-to-bar': { equipment: 'body only', level: 'expert', force: 'pull', primary: ['abdominals'], secondary: ['lats', 'forearms'] },
};

/** Staples the catalog is missing, written for FORMA. */
const OWN: LibraryExercise[] = [
  {
    id: 'forma:kettlebell-swing',
    name: 'Kettlebell Swing',
    category: 'strength',
    equipment: 'kettlebells',
    level: 'beginner',
    force: 'pull',
    mechanic: 'compound',
    primary: ['glutes', 'hamstrings'],
    secondary: ['lower back', 'shoulders', 'forearms'],
    steps: [
      'Stand with feet a little wider than your hips, the kettlebell on the floor a step in front of you.',
      'Hinge at the hips with a flat back, grab the handle with both hands and hike it back between your legs.',
      'Snap your hips forward and squeeze your glutes: the bell floats up to chest height on straight arms. Your arms only guide it.',
      'Let it fall back, hinge again as it passes between your legs, and go straight into the next rep.',
    ],
    demo: 'kettlebell-swing',
    source: 'forma',
  },
];

function programOnly(): LibraryExercise[] {
  return PATHS.flatMap((p) => p.nodes)
    .filter((n) => n.id in PROGRAM_ONLY)
    .map((n) => ({
      id: `forma:${n.id}`,
      name: n.name,
      category: 'strength',
      mechanic: 'compound',
      steps: [n.cue],
      ...PROGRAM_ONLY[n.id],
      demo: n.id as ExerciseId,
      source: 'forma' as const,
    }));
}

let loaded: Promise<LibraryExercise[]> | null = null;

/** Every exercise, sorted by name. Loads the catalog the first time. */
export function loadLibrary(): Promise<LibraryExercise[]> {
  loaded ??= import('./catalog.json').then(({ default: catalog }) =>
    [...(catalog as CatalogExercise[]).map((x): LibraryExercise => ({ ...x, demo: DEMOS[x.id], source: 'catalog' })), ...programOnly(), ...OWN].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  );
  return loaded;
}

/** What the equipment filter offers, most common first. */
export const EQUIPMENT = ['body only', 'dumbbell', 'barbell', 'kettlebells', 'cable', 'machine', 'bands', 'other'] as const;

export const CATEGORIES = ['strength', 'stretching', 'plyometrics', 'cardio', 'powerlifting', 'olympic weightlifting', 'strongman'] as const;
