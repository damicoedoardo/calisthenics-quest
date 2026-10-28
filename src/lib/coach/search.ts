import type { Family } from '@/exercises/coaching';
import type { LibraryExercise } from '@/exercises/library';
import { isStaple } from './staples';

/* A fuzzy search over the exercise library, for the coach (and anyone typing): words in any order,
   typos and plurals forgiven ("pushup", "push ups", "dumbell rows"), and everyday words mapped to
   the library's own ("abs" is abdominals, "chest" is pectorals' push moves). Each word is scored
   against the exercise's name, muscles, gear and movement; plain, well-known moves come first. */

/** Everyday words and the library's words for them. */
const SAME: Record<string, string[]> = {
  abs: ['abdominals', 'core'],
  ab: ['abdominals', 'core'],
  belly: ['abdominals'],
  core: ['abdominals', 'core'],
  chest: ['chest', 'push-horizontal'],
  pecs: ['chest'],
  back: ['lats', 'middle back', 'lower back'],
  lats: ['lats'],
  legs: ['quadriceps', 'hamstrings', 'glutes', 'squat', 'lunge'],
  leg: ['quadriceps', 'hamstrings', 'glutes'],
  quads: ['quadriceps'],
  hams: ['hamstrings'],
  butt: ['glutes'],
  bum: ['glutes'],
  arms: ['biceps', 'triceps', 'arms'],
  bis: ['biceps'],
  tris: ['triceps'],
  shoulder: ['shoulders'],
  delts: ['shoulders'],
  calf: ['calves'],
  pushup: ['push', 'up', 'pushups'],
  pullup: ['pull', 'up', 'pullups'],
  chinup: ['chin', 'up'],
  situp: ['sit', 'up'],
  bodyweight: ['body only'],
  'no-gear': ['body only'],
  db: ['dumbbell'],
  kb: ['kettlebells'],
  bb: ['barbell'],
  cardio: ['cardio', 'run'],
  run: ['run', 'cardio'],
  running: ['run'],
  jog: ['run'],
  stretch: ['stretch', 'stretching'],
  stretches: ['stretch'],
  mobility: ['mobility', 'stretch'],
  easy: ['assisted', 'incline', 'knee', 'beginner'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ');
/** One word, plural and -ing taken off. */
const stem = (w: string) => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '').replace(/ing$/, '');

function words(x: LibraryExercise): string[] {
  const text = [x.name, x.primary.join(' '), x.secondary.join(' '), x.equipment, x.family, x.kind, x.category, x.level, x.demo].join(' ');
  return [...new Set(norm(text).split(/\s+/).filter(Boolean).map(stem))];
}

/** At most one letter off (added, missing or wrong). */
function near(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    miss = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) i++, j++;
    else {
      if (++miss > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else i++, j++;
    }
  }
  return miss + (a.length - i) + (b.length - j) <= 1;
}

/** How well one query word fits an exercise's words: 3 exact, 2 start of a word, 1.5 a typo off, 1 inside. */
function fit(q: string, ws: string[]): number {
  let best = 0;
  for (const w of ws) {
    if (w === q) return 3;
    if (w.startsWith(q) && q.length >= 3) best = Math.max(best, 2);
    else if (q.length >= 4 && near(q, w)) best = Math.max(best, 1.5);
    else if (q.length >= 4 && w.includes(q)) best = Math.max(best, 1);
  }
  return best;
}

/** The query as groups: each group is a word and the words it may also mean. */
function groups(query: string): string[][] {
  const raw = norm(query.replace(/push[\s-]?ups?/gi, 'pushup').replace(/pull[\s-]?ups?/gi, 'pullup').replace(/chin[\s-]?ups?/gi, 'chinup').replace(/sit[\s-]?ups?/gi, 'situp')).split(/\s+/).filter(Boolean);
  const skip = new Set(['a', 'an', 'the', 'with', 'for', 'and', 'or', 'of', 'to', 'on', 'my', 'some', 'exercise', 'exercises', 'move', 'moves']);
  return raw.filter((w) => !skip.has(w)).map((w) => [stem(w), ...(SAME[w] ?? SAME[stem(w)] ?? []).flatMap((s) => norm(s).split(/\s+/).map(stem))]);
}

export interface SearchHit {
  x: LibraryExercise;
  score: number;
}

/** The best matches for `query`, from `pool`, best first. A word nothing fits counts against. */
export function searchExercises(pool: LibraryExercise[], query: string, opts: { family?: Family; limit?: number } = {}): LibraryExercise[] {
  const gs = groups(query);
  const hits: SearchHit[] = [];
  for (const x of pool) {
    if (opts.family && x.family !== opts.family) continue;
    const ws = words(x);
    let score = 0,
      missed = 0;
    for (const g of gs) {
      const f = Math.max(...g.map((q, k) => fit(q, ws) * (k === 0 ? 1 : 0.8)));
      if (f === 0) missed++;
      score += f;
    }
    // Every word has to land somewhere, but one miss in three is forgiven.
    if (gs.length && missed > Math.floor(gs.length / 3)) continue;
    score += (isStaple(x.id) ? 2 : 0) - x.name.split(/\s+/).length * 0.15 - (x.steps.length ? 0 : 0.5);
    hits.push({ x, score });
  }
  hits.sort((a, b) => b.score - a.score || a.x.name.localeCompare(b.x.name));
  return hits.slice(0, opts.limit ?? 10).map((h) => h.x);
}
