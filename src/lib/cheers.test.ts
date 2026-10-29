import { describe, expect, it } from 'vitest';
import { CHEER_LIMIT, cleanCheer, quickCheers, trainingLabel } from './cheers';
import { initialState } from './game';

describe('cheers', () => {
  it('tidies what a friend typed', () => {
    expect(cleanCheer('  one   more\nset!  ')).toBe('one more set!');
    expect(cleanCheer('   ')).toBe('');
    expect(cleanCheer('x'.repeat(200))).toHaveLength(CHEER_LIMIT.length);
  });

  it('puts the friend in the quick lines, short enough to send', () => {
    expect(quickCheers('Ben Rossi')[0]).toBe('Push, Ben!');
    expect(quickCheers('')[0]).toBe('Push!');
    for (const c of quickCheers('A'.repeat(24))) expect(cleanCheer(c)).toBe(c);
  });

  it('names the workout for friends', () => {
    expect(trainingLabel(initialState())).toBe('A workout');
    expect(trainingLabel(initialState()).length).toBeLessThanOrEqual(40);
  });
});
