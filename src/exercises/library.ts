import type { ExerciseId } from '@/sprites/characters/exercise';
import type { Kit } from '@/sprites/characters/moves';
import { classify } from './classify';
import { COACHING, type Family, type Kind, type Region } from './coaching';

/* The exercise library: the open catalog (free-exercise-db, public domain, 870+ exercises from
   barbell lifts to stretches; refresh with `node scripts/import-exercises.mjs`) plus the moves of
   FORMA's own program it doesn't have. The catalog is big, so it loads on demand (loadLibrary).
   Every entry has a pixel demo (classify.ts picks the movement and the gear) and coaching for that
   movement (coaching.ts: family, region, kind, tips, common mistakes). findExercises is the search
   a coach uses to build a session; `pnpm exercises:db` writes the same data to
   public/data/exercises.json for tools outside the app. */

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
  /** The pixel demo that shows it. */
  demo: ExerciseId;
  /** The gear the demo holds. */
  kit: Kit;
  family: Family;
  region: Region;
  kind: Kind;
  /** How to do it well, most important first. */
  tips: string[];
  /** What usually goes wrong. */
  mistakes: string[];
  source: 'catalog' | 'forma';
}

type Base = Omit<LibraryExercise, 'kit' | 'family' | 'region' | 'kind' | 'tips' | 'mistakes'>;

/** Bodyweight moves with a hand-drawn demo and no catalog entry of their own. */
const PROGRAM_ONLY: Record<string, Pick<CatalogExercise, 'name' | 'steps' | 'equipment' | 'level' | 'force' | 'primary' | 'secondary'>> = {
  'archer-pushup': { name: 'Archer push-up', steps: ['Wide hands, shift onto one arm, the other stays straight. Reps per side.'], equipment: 'body only', level: 'intermediate', force: 'push', primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  'dead-hang': { name: 'Dead hang', steps: ['Full grip on the bar, shoulders active, breathe.'], equipment: 'body only', level: 'beginner', force: 'static', primary: ['forearms'], secondary: ['lats', 'shoulders'] },
  negatives: { name: 'Pull-up negatives', steps: ['Jump to the top, lower yourself over 5 slow seconds.'], equipment: 'body only', level: 'beginner', force: 'pull', primary: ['lats'], secondary: ['biceps', 'middle back'] },
  'strict-pullup': { name: 'Strict pull-up', steps: ['Dead hang start, no kipping. Many small sets beat one big one.'], equipment: 'body only', level: 'intermediate', force: 'pull', primary: ['lats'], secondary: ['biceps', 'middle back'] },
  'lsit-pullup': { name: 'L-sit pull-up', steps: ['Hold the legs at 90° for the whole rep.'], equipment: 'body only', level: 'expert', force: 'pull', primary: ['lats'], secondary: ['abdominals', 'biceps'] },
  'knee-raise': { name: 'Hanging knee raise', steps: ['Knees to chest, no swinging. Control the way down.'], equipment: 'body only', level: 'beginner', force: 'pull', primary: ['abdominals'], secondary: [] },
  'tuck-lsit': { name: 'Tuck L-sit', steps: ['On dip bars or parallettes, push the floor away, knees tucked.'], equipment: 'body only', level: 'beginner', force: 'static', primary: ['abdominals'], secondary: ['triceps', 'shoulders'] },
  'one-leg-lsit': { name: 'One-leg L-sit', steps: ['One leg straight, one tucked. Switch each set.'], equipment: 'body only', level: 'intermediate', force: 'static', primary: ['abdominals'], secondary: ['quadriceps', 'triceps'] },
  lsit: { name: 'Full L-sit', steps: ['Both legs straight and locked, toes pointed.'], equipment: 'body only', level: 'expert', force: 'static', primary: ['abdominals'], secondary: ['quadriceps', 'triceps'] },
  'toes-to-bar': { name: 'Toes to bar', steps: ['Straight legs up to the bar, slow on the way down.'], equipment: 'body only', level: 'expert', force: 'pull', primary: ['abdominals'], secondary: ['lats', 'forearms'] },
};

/** Runs for the coach's running days: each is an effort and a time, built step by step. */
const RUN_BASE = { category: 'cardio', equipment: 'body only', force: null, mechanic: null, primary: ['quadriceps'], secondary: ['calves', 'hamstrings', 'glutes'], demo: 'run' as const, source: 'forma' as const };
const RUNS: Base[] = [
  { ...RUN_BASE, id: 'forma:easy-run', name: 'Easy run', level: 'beginner', steps: ['Run at a pace where you could still talk in full sentences.', 'If you have to stop, walk for a minute and go again.'] },
  { ...RUN_BASE, id: 'forma:run-walk', name: 'Run-walk', level: 'beginner', steps: ['Run easy for a few minutes, then walk one minute. Repeat.', 'The walks are part of the plan, not a failure.'] },
  { ...RUN_BASE, id: 'forma:interval-run', name: 'Interval run', level: 'intermediate', steps: ['Warm up with easy running.', 'Run fast but in control for the fast parts, then jog or walk easy until the next one.', 'Cool down with easy running.'] },
  { ...RUN_BASE, id: 'forma:long-run', name: 'Long run', level: 'intermediate', steps: ['Slower than your easy pace, for longer.', 'Drink water if it is warm. Walk breaks are fine.'] },
];

/** Staples the catalog is missing, written for FORMA. */
const OWN: Base[] = [
  ...RUNS,
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

function programOnly(): Base[] {
  return Object.entries(PROGRAM_ONLY).map(([id, x]) => ({
    id: `forma:${id}`,
    category: 'strength',
    mechanic: 'compound',
    ...x,
    demo: id as ExerciseId,
    source: 'forma' as const,
  }));
}

/** Adds the movement's coaching; the kit is the classifier's for catalog entries, none otherwise. */
function withCoaching(x: Base, kit: Kit): LibraryExercise {
  return { ...x, kit, ...COACHING[x.demo] };
}

let loaded: Promise<LibraryExercise[]> | null = null;

/** Every exercise, sorted by name. Loads the catalog the first time. */
export function loadLibrary(): Promise<LibraryExercise[]> {
  loaded ??= import('./catalog.json').then(({ default: catalog }) =>
    [
      ...(catalog as CatalogExercise[]).map((x) => {
        const { demo, kit } = classify(x);
        return withCoaching({ ...x, demo, source: 'catalog' }, kit);
      }),
      ...programOnly().map((x) => withCoaching(x, 'none')),
      ...OWN.map((x) => withCoaching(x, x.demo === 'kettlebell-swing' ? 'kettlebell' : 'none')),
    ].sort((a, b) => a.name.localeCompare(b.name)),
  );
  return loaded;
}

/** What the equipment filter offers, most common first. */
export const EQUIPMENT = ['body only', 'dumbbell', 'barbell', 'kettlebells', 'cable', 'machine', 'bands', 'other'] as const;

export const CATEGORIES = ['strength', 'stretching', 'plyometrics', 'cardio', 'powerlifting', 'olympic weightlifting', 'strongman'] as const;

export const KINDS: Kind[] = ['strength', 'power', 'plyometric', 'cardio', 'stretch', 'mobility'];

export const FAMILIES: Family[] = [
  'squat',
  'hinge',
  'lunge',
  'push-horizontal',
  'push-vertical',
  'pull-horizontal',
  'pull-vertical',
  'arms',
  'shoulders',
  'legs-isolation',
  'core',
  'carry',
  'power',
  'plyometric',
  'cardio',
  'stretch',
  'mobility',
];

export interface ExerciseQuery {
  /** Words that must all appear in the name, muscles, equipment or family. */
  text?: string;
  /** Any of these muscles, as primary (or secondary too with `anyMuscle`). */
  muscles?: string[];
  anyMuscle?: boolean;
  /** Only exercises that need nothing but these (e.g. ['body only', 'dumbbell']). */
  equipment?: string[];
  kind?: Kind | Kind[];
  family?: Family | Family[];
  region?: Region | Region[];
  /** At most this hard: 'beginner' leaves out intermediate and expert. */
  maxLevel?: CatalogExercise['level'];
  limit?: number;
}

const LEVELS = ['beginner', 'intermediate', 'expert'] as const;
const list = <T>(v: T | T[] | undefined) => (v === undefined ? undefined : Array.isArray(v) ? v : [v]);

/** Searches the library the way a coach builds a session: by movement, muscle, gear and level. */
export function findExercises(all: LibraryExercise[], q: ExerciseQuery): LibraryExercise[] {
  const words = (q.text ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const kinds = list(q.kind);
  const families = list(q.family);
  const regions = list(q.region);
  const muscles = q.muscles?.map((m) => m.toLowerCase());
  const max = q.maxLevel ? LEVELS.indexOf(q.maxLevel) : 2;
  const found = all.filter(
    (x) =>
      (!kinds || kinds.includes(x.kind)) &&
      (!families || families.includes(x.family)) &&
      (!regions || regions.includes(x.region)) &&
      (!q.equipment || q.equipment.includes(x.equipment)) &&
      LEVELS.indexOf(x.level) <= max &&
      (!muscles || (q.anyMuscle ? [...x.primary, ...x.secondary] : x.primary).some((m) => muscles.includes(m))) &&
      words.every((w) => searchText(x).includes(w)),
  );
  return q.limit ? found.slice(0, q.limit) : found;
}

export const searchText = (x: LibraryExercise) => `${x.name} ${x.primary.join(' ')} ${x.equipment} ${x.family} ${x.kind}`.toLowerCase();

export function exerciseById(all: LibraryExercise[], id: string): LibraryExercise | undefined {
  return all.find((x) => x.id === id);
}
