import { describe, expect, it } from 'vitest';
import { powerScore } from './power';

describe('powerScore', () => {
  it('is 100 for a warrior with no points in the starter kit', () => {
    expect(powerScore('warrior', {}).score).toBeCloseTo(100, 6);
  });
  it('grows with points in any stat that fights', () => {
    const base = powerScore('archer', {}).score;
    for (const stat of ['health', 'damage', 'speed'] as const) expect(powerScore('archer', { [stat]: 20 }).score).toBeGreaterThan(base);
  });
});
