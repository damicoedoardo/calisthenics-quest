import { describe, expect, it } from 'vitest';
import { equippedGear, type ClassId } from '../gear';
import { DEFAULT_LOOK, heroSpec } from './cast';
import { S, frame, tint } from './engine';

const painted = (g: (string | null)[][]) => g.flat().filter(Boolean).length;

describe('64x64 sprites', () => {
  it('draws every class at every tier, idle and action, as 64x64 frames', () => {
    for (const cls of [undefined, 'warrior', 'archer', 'monk', 'mage'] as (ClassId | undefined)[])
      for (const t of [0, 3, 6]) {
        const spec = heroSpec({ gear: equippedGear(cls, { push: t, pull: t, core: t }), classId: cls });
        for (const mode of ['idle', 'action'] as const)
          for (let f = 0; f < 4; f++) {
            const g = frame(spec, DEFAULT_LOOK, mode, f);
            expect(g).toHaveLength(S);
            expect(g.every((row) => row.length === S)).toBe(true);
            expect(painted(g)).toBeGreaterThan(600);
          }
      }
  });

  it('the idle loop bobs and the attack moves the arm', () => {
    const spec = heroSpec({ gear: equippedGear('warrior', { push: 2, pull: 2, core: 2 }), classId: 'warrior' });
    const key = (g: (string | null)[][]) => g.map((r) => r.join(',')).join('|');
    expect(key(frame(spec, DEFAULT_LOOK, 'idle', 0))).not.toBe(key(frame(spec, DEFAULT_LOOK, 'idle', 2)));
    expect(key(frame(spec, DEFAULT_LOOK, 'action', 0))).not.toBe(key(frame(spec, DEFAULT_LOOK, 'action', 1)));
  });

  it('tint keeps the shape and only uses the ramp', () => {
    const g = frame(heroSpec({ gear: equippedGear(undefined, { push: 1, pull: 1, core: 1 }) }), DEFAULT_LOOK, 'idle', 0);
    const ramp = ['#000001', '#000002', '#000003'];
    const t = tint(g, ramp);
    expect(painted(t)).toBe(painted(g));
    expect(new Set(t.flat().filter(Boolean)).size).toBeLessThanOrEqual(ramp.length);
  });
});
