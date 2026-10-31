import { describe, expect, it } from 'vitest';
import { ANATOMY_DEMOS, WORKS, scene } from './body';

describe('anatomy demos', () => {
  it('draws every exercise from both sides through a whole rep, with clean numbers', () => {
    for (const ex of ANATOMY_DEMOS) {
      for (const view of ['side', 'front'] as const) {
        for (let t = 0; t < 1; t += 0.05) {
          const s = scene(ex, view, t);
          expect(s.shapes.length).toBeGreaterThan(20);
          for (const p of s.shapes) expect(p.d).not.toMatch(/NaN|Infinity/);
          // The frame stays the same for the whole rep.
          expect(s.viewBox).toBe(scene(ex, view, 0).viewBox);
        }
      }
    }
  });

  it('colors the muscles each move works', () => {
    for (const ex of ANATOMY_DEMOS) {
      const fills = scene(ex, 'side', 0.5).shapes.map((p) => p.fill);
      expect(fills).toContain('#f97316');
      expect(WORKS[ex].main.length).toBeGreaterThan(0);
    }
  });
});
