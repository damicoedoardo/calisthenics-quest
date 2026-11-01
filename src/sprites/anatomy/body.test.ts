import { describe, expect, it } from 'vitest';
import { ANATOMY_DEMOS, WORKS, anatomyFor, scene } from './body';

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
      // In at least one view (an arm pointing at you hides its own muscles).
      const fills = (['side', 'front'] as const).flatMap((v) => scene(ex, v, 0.5).shapes.map((p) => p.fill));
      expect(fills).toContain('#f97316');
      expect(WORKS[ex].main.length).toBeGreaterThan(0);
    }
  });

  it('reads gear and bench from the exercise name', () => {
    expect(anatomyFor('bench-press', 'Incline Dumbbell Bench Press')).toEqual({ id: 'bench-press', variant: { gear: 'dumbbell', incline: true } });
    expect(anatomyFor('barbell-squat', 'Goblet Squat')).toEqual({ id: 'squat', variant: { goblet: true } });
    expect(anatomyFor('strict-pullup', 'Pull-up')?.id).toBe('pullup');
    expect(anatomyFor('chest-fly', 'Cable Crossover')).toBeNull();
    expect(anatomyFor('chest-fly', 'Dumbbell Flyes')?.id).toBe('chest-fly');
    expect(anatomyFor('front-squat', 'Goblet Squat')).toEqual({ id: 'squat', variant: { goblet: true } });
    expect(anatomyFor('leg-press', 'Hack Squat')).toBeNull();
    expect(anatomyFor('calf-stretch', 'Calf Stretch Hands Against Wall')?.id).toBe('wall-calf-stretch');
    expect(anatomyFor('arm-stretch', 'Iron Crosses (stretch)')).toBeNull();
    expect(anatomyFor('foam-roll', 'Quadriceps-SMR')?.id).toBe('roll-quads');
    expect(anatomyFor('cat-cow', 'Cat Stretch')?.id).toBe('cat-cow');
    expect(anatomyFor('cat-cow', 'Stomach Vacuum')).toBeNull();
    for (const [mv, name] of [['bench-press', 'Incline Dumbbell Bench Press'], ['barbell-squat', 'Goblet Squat'], ['curl', 'Barbell Curl'], ['barbell-row', 'Dumbbell Row']]) {
      const a = anatomyFor(mv, name)!;
      for (const view of ['side', 'front'] as const) {
        const s = scene(a.id, view, 0.3, { variant: a.variant });
        for (const p of s.shapes) expect(p.d).not.toMatch(/NaN|Infinity/);
      }
    }
  });
});
