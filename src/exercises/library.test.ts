import { describe, expect, it } from 'vitest';
import { DEMOS, loadLibrary } from './library';
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

  it('every demo link points at a real catalog entry and a real demo', async () => {
    const ids = new Set((await loadLibrary()).map((x) => x.id));
    for (const [id, demo] of Object.entries(DEMOS)) {
      expect(ids.has(id), id).toBe(true);
      expect(EXERCISES).toContain(demo);
    }
  });

  it('every demo is in the library and moves', async () => {
    const shown = new Set((await loadLibrary()).map((x) => x.demo));
    for (const demo of EXERCISES) {
      const frames = framesFor('exercise', 'idle', { exercise: demo });
      expect(new Set(frames.map((g) => g.flat().join())).size, demo).toBeGreaterThan(1);
      if (demo !== 'pullup') expect(shown.has(demo), demo).toBe(true);
    }
  });
});
