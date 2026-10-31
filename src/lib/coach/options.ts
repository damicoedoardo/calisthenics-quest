import { CHOICES } from '@/balance';
import type { Family } from '@/exercises/coaching';
import type { LibraryExercise } from '@/exercises/library';
import type { ExerciseId } from '@/sprites/characters/exercise';
import type { Choice, CoachProfile, Gear, Level, Pattern } from './types';
import { FEW_REPS, isStaple } from './staples';

/* What an exercise can turn into: easier moves of the same kind, and others that train the same
   thing. Found in the library by code, never by the LLM, so every choice is a real exercise with a
   demo and coaching, and uses only gear you have. */

const LEVELS = ['beginner', 'intermediate', 'expert'] as const;
export const levelIndex = (x: Pick<LibraryExercise, 'level'>) => LEVELS.indexOf(x.level);
/** The hardest library level a pattern level reaches: 1-2 beginner, 3-4 intermediate, 5 expert. */
export const maxLevelFor = (l: Level) => (l <= 2 ? 0 : l <= 4 ? 1 : 2);

/** The pattern a movement family trains, for its level. */
export function patternOf(f: Family): Pattern | null {
  if (f === 'push-horizontal' || f === 'push-vertical' || f === 'shoulders' || f === 'arms') return 'push';
  if (f === 'pull-horizontal' || f === 'pull-vertical' || f === 'carry') return 'pull';
  if (f === 'squat' || f === 'lunge' || f === 'legs-isolation' || f === 'plyometric') return 'squat';
  if (f === 'hinge' || f === 'power') return 'hinge';
  if (f === 'core') return 'core';
  if (f === 'cardio') return 'run';
  return null;
}

/** The library's equipment you can use with your gear. Body weight always works. */
export function equipmentFor(gear: Gear[]): string[] {
  const out = new Set(['body only']);
  for (const g of gear) {
    if (g === 'gym') ['dumbbell', 'barbell', 'kettlebells', 'cable', 'machine', 'bands', 'e-z curl bar', 'medicine ball', 'exercise ball', 'foam roll', 'other'].forEach((e) => out.add(e));
    if (g === 'dumbbells') ['dumbbell', 'kettlebells'].forEach((e) => out.add(e));
    if (g === 'bands') out.add('bands');
  }
  return [...out];
}

/** A pull-up needs something to hang from. */
export const hasBar = (gear: Gear[]) => gear.includes('bar') || gear.includes('gym');

/** Can you do it with your gear? */
export function usable(x: LibraryExercise, gear: Gear[]): boolean {
  if (!equipmentFor(gear).includes(x.equipment)) return false;
  if (x.family === 'pull-vertical' && x.equipment === 'body only' && !hasBar(gear)) return false;
  if (x.family === 'core' && /hanging|toes to bar|knee raise/i.test(x.name) && !hasBar(gear)) return false;
  return true;
}

/** Done with a weight you pick. */
export const isWeighted = (x: Pick<LibraryExercise, 'equipment' | 'demo'>) =>
  !['body only', 'bands', 'foam roll', 'exercise ball'].includes(x.equipment) && !FEW_REPS.includes(x.demo) && !HOLDS.includes(x.demo) && x.demo !== 'inverted-row';

export function toChoice(x: LibraryExercise): Choice {
  return { id: x.id, name: x.name, demo: x.demo, cue: x.tips[0] ?? '', family: x.family, equipment: x.equipment, ...(isWeighted(x) ? { weighted: true } : {}) };
}

/** Plain names first: "Pushups" before "Push-Ups With Feet On An Exercise Ball". */
export const plainness = (x: LibraryExercise) => x.name.split(/[\s_-]+/).length + (x.steps.length ? 0 : 3) - (isStaple(x.id) ? 6 : 0);

/** The hand-made ladders of the bodyweight moves: these easier demos come first, in this order. */
export const LADDER: Partial<Record<ExerciseId, ExerciseId[]>> = {
  'strict-pullup': ['pullup', 'negatives', 'assisted-pullup', 'inverted-row'],
  pullup: ['negatives', 'assisted-pullup', 'inverted-row', 'lat-pulldown'],
  'lsit-pullup': ['strict-pullup', 'pullup', 'negatives'],
  negatives: ['assisted-pullup', 'inverted-row', 'dead-hang'],
  'assisted-pullup': ['inverted-row', 'lat-pulldown', 'dead-hang'],
  'archer-pushup': ['pushup', 'incline-pushup'],
  'diamond-pushup': ['pushup', 'incline-pushup'],
  pushup: ['incline-pushup'],
  dips: ['bench-dip', 'incline-pushup'],
  'handstand-pushup': ['shoulder-press', 'pushup'],
  lsit: ['one-leg-lsit', 'tuck-lsit', 'knee-raise'],
  'one-leg-lsit': ['tuck-lsit', 'knee-raise'],
  'toes-to-bar': ['leg-raise', 'knee-raise', 'dead-bug'],
  'knee-raise': ['leg-raise', 'dead-bug'],
  'barbell-squat': ['squat', 'leg-press'],
  'front-squat': ['squat', 'leg-press'],
  squat: ['bridge'],
  lunge: ['step-up', 'squat', 'bridge'],
  deadlift: ['rdl', 'kettlebell-swing', 'bridge'],
  rdl: ['good-morning', 'bridge'],
  'bench-press': ['pushup', 'incline-pushup'],
  plank: ['dead-bug'],
  'ab-rollout': ['plank', 'dead-bug'],
  'russian-twist': ['dead-bug', 'crunch'],
  'shoulder-press': ['pushup'],
  'barbell-row': ['seated-row', 'inverted-row'],
  'side-plank': ['dead-bug'],
};

/** Names that usually mean an easier version. */
const EASY_WORDS = /assisted|incline|knee|kneeling|band|machine|negative|wall|box|partial|half|supported/i;

type Base = Pick<LibraryExercise, 'id' | 'demo' | 'family' | 'region' | 'level'>;

/** Up to CHOICES.easier easier moves of the same kind, the closest step first. */
export function easierChoices(all: LibraryExercise[], of: Base, gear: Gear[]): Choice[] {
  const ladder = LADDER[of.demo] ?? [];
  const lvl = LEVELS.indexOf(of.level);
  const fromLadder = ladder.map((demo) => best(all.filter((x) => x.demo === demo && x.id !== of.id && usable(x, gear)))).filter((x): x is LibraryExercise => !!x);
  const others = all
    .filter((x) => x.family === of.family && x.region === of.region && x.id !== of.id && x.demo !== of.demo && usable(x, gear) && x.kind === 'strength')
    .filter((x) => levelIndex(x) < lvl || (levelIndex(x) === lvl && EASY_WORDS.test(x.name)))
    .sort((a, b) => Number(isStaple(b.id)) - Number(isStaple(a.id)) || levelIndex(b) - levelIndex(a) || Number(EASY_WORDS.test(b.name)) - Number(EASY_WORDS.test(a.name)) || plainness(a) - plainness(b));
  return distinct([...fromLadder, ...others]).slice(0, CHOICES.easier).map(toChoice);
}

/** Up to CHOICES.swaps others that train the same thing, no harder. */
export function swapChoices(all: LibraryExercise[], of: Base, gear: Gear[]): Choice[] {
  const lvl = LEVELS.indexOf(of.level);
  const same = all.filter((x) => x.family === of.family && x.region === of.region && x.id !== of.id && x.demo !== of.demo && usable(x, gear) && levelIndex(x) <= Math.max(lvl, 0));
  return distinct(same.sort((a, b) => plainness(a) - plainness(b))).slice(0, CHOICES.swaps).map(toChoice);
}

/** The plainest exercise of a few. */
function best(xs: LibraryExercise[]): LibraryExercise | undefined {
  return [...xs].sort((a, b) => plainness(a) - plainness(b))[0];
}

/** One choice per demo: three names for the same movement are no choice. */
function distinct(xs: LibraryExercise[]): LibraryExercise[] {
  const seen = new Set<string>();
  return xs.filter((x) => !seen.has(x.demo) && seen.add(x.demo));
}

/** What each sore spot keeps out. */
const SPARE: Partial<Record<CoachProfile['avoid'][number]['area'], (x: LibraryExercise) => boolean>> = {
  knee: (x) => x.family === 'lunge' || x.family === 'plyometric' || x.family === 'power',
  back: (x) => (x.family === 'hinge' && x.equipment === 'barbell') || x.family === 'power' || /good morning/i.test(x.name),
  shoulder: (x) => x.family === 'push-vertical' || /dip|handstand/i.test(x.name),
  wrist: (x) => x.family === 'push-horizontal' && x.equipment === 'body only',
};

/** The rules that keep exercises off your sore spots. */
export function spares(profile: CoachProfile): ((x: LibraryExercise) => boolean)[] {
  return profile.avoid.map((a) => SPARE[a.area]).filter((f): f is (x: LibraryExercise) => boolean => !!f);
}

/** Demos done as a hold, in seconds. */
export const HOLDS: ExerciseId[] = ['plank', 'side-plank', 'dead-hang', 'tuck-lsit', 'one-leg-lsit', 'lsit'];
