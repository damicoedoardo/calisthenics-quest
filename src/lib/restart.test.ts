import { describe, expect, it } from 'vitest';
import { codeMatches, startOverCode } from './restart';
import { seeded } from './random';

describe('start over code', () => {
  it('is six clear letters and digits', () => {
    const rng = seeded(7);
    for (let i = 0; i < 50; i++) expect(startOverCode(rng)).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  });

  it('matches whatever the case and spaces', () => {
    expect(codeMatches(' k7p x2m ', 'K7PX2M')).toBe(true);
    expect(codeMatches('K7PX2', 'K7PX2M')).toBe(false);
    expect(codeMatches('', 'K7PX2M')).toBe(false);
  });
});
