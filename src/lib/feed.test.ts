import { describe, expect, it } from 'vitest';
import { cleanLine, newPosts, workoutCard, workoutLine } from './feed';
import type { Session } from './game';

const session = (p: Partial<Session> = {}): Session => ({
  id: 's',
  date: '2026-10-29T18:40:00Z',
  kind: 'full',
  day: 'A',
  xp: 100,
  breakdown: [],
  entries: [
    { exerciseId: 'warm', target: 1, sets: [{ reps: 1, rir: '4+' }], name: 'Joint circles' },
    { exerciseId: 'push', target: 10, sets: [{ reps: 10, rir: '2-3' }, { reps: 9, rir: '2-3' }], name: 'Push-up' },
    { exerciseId: 'dip', target: 8, sets: [{ reps: 8, rir: '0-1' }], name: 'Dip' },
  ],
  ...p,
});

describe('feed', () => {
  it('sums a workout up for a post', () => {
    const w = workoutCard(session(), { title: 'Push day', startedAt: '2026-10-29T18:02:00Z', taps: new Set(['warm']) });
    expect(w).toEqual({ title: 'Push day', minutes: 38, sets: 3, exercises: ['Push-up', 'Dip'], mini: false, started_at: '2026-10-29T18:02:00Z' });
    expect(workoutLine(w)).toBe('38 min · 3 sets');
    expect(workoutLine({ ...w, minutes: 0, sets: 1, mini: true })).toBe('Minimum quest · 1 set');
  });

  it('works without a start time', () => {
    expect(workoutCard(session(), { title: 'x' }).minutes).toBe(0);
  });

  it('tidies text', () => {
    expect(cleanLine('  felt\n great  ', 280)).toBe('felt great');
    expect(cleanLine('x'.repeat(300), 280)).toHaveLength(280);
  });

  it('counts friends’ posts since you last looked', () => {
    const posts = [
      { at: '2026-10-29T18:00:00Z', mine: false },
      { at: '2026-10-29T17:00:00Z', mine: false },
      { at: '2026-10-29T18:30:00Z', mine: true },
    ];
    expect(newPosts(posts, '2026-10-29T17:30:00Z')).toBe(1);
    expect(newPosts(posts, null)).toBe(2);
  });
});
