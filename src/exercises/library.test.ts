import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findExercises, loadLibrary } from './library';
import { COACHING } from './coaching';
import { exportLibrary } from './export';
import { EXERCISES } from '@/sprites/characters/exercise';
import { framesFor } from '@/sprites/registry';

describe('exercise library', () => {
  it('loads the catalog and the program moves it lacks, with unique ids', async () => {
    const all = await loadLibrary();
    expect(all.length).toBeGreaterThan(850);
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    for (const x of all) {
      expect(x.name).toBeTruthy();
    }
  });

  it('every exercise has a real demo and coaching', async () => {
    for (const x of await loadLibrary()) {
      expect(EXERCISES, x.id).toContain(x.demo);
      expect(x.tips.length, x.id).toBeGreaterThan(0);
      expect(x.mistakes.length, x.id).toBeGreaterThan(0);
    }
  });

  it('every demo has coaching, moves, and is used by the library', async () => {
    const shown = new Set((await loadLibrary()).map((x) => x.demo));
    for (const demo of EXERCISES) {
      expect(COACHING[demo], demo).toBeTruthy();
      const frames = framesFor('exercise', 'idle', { exercise: demo });
      expect(new Set(frames.map((g) => g.flat().join())).size, demo).toBeGreaterThan(1);
      if (demo !== 'pullup') expect(shown.has(demo), demo).toBe(true);
    }
  });

  it('finds exercises the way a coach asks', async () => {
    const all = await loadLibrary();
    const stretches = findExercises(all, { kind: 'stretch', muscles: ['hamstrings'] });
    expect(stretches.length).toBeGreaterThan(3);
    expect(stretches.every((x) => x.kind === 'stretch' && x.primary.includes('hamstrings'))).toBe(true);
    const hinges = findExercises(all, { family: 'hinge', equipment: ['body only', 'dumbbell'], maxLevel: 'beginner' });
    expect(hinges.length).toBeGreaterThan(0);
    expect(hinges.every((x) => x.level === 'beginner' && ['body only', 'dumbbell'].includes(x.equipment))).toBe(true);
    expect(findExercises(all, { text: 'bench press', limit: 3 })).toHaveLength(3);
  });

  it('public/data/exercises.json is up to date (run `pnpm exercises:db`)', async () => {
    const file = readFileSync(new URL('../../public/data/exercises.json', import.meta.url), 'utf8');
    expect(file === (await exportLibrary())).toBe(true);
  });
});
