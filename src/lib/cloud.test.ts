import { describe as group, expect, it } from 'vitest';
import { cloudState, describe, plan } from './cloud';
import { initialState, type GameState } from './game';
import { addFakeWorkouts } from './dev';

const fresh = initialState();
const played = (n: number): GameState => addFakeWorkouts(initialState(), n, new Date(2026, 9, 1), true);
const cloud = (rev: number, workouts: number, data?: unknown) => ({ rev, workouts, updated_at: '2026-10-27T10:00:00Z', data });

group('cloud sync plan', () => {
  it('uploads when the cloud has nothing', () => {
    expect(plan(played(3), null, null)).toEqual({ kind: 'upload', baseRev: null });
    expect(plan(fresh, null, 4)).toEqual({ kind: 'upload', baseRev: null });
  });

  it('carries on from the rev this phone last saw', () => {
    expect(plan(played(5), cloud(7, 4), 7)).toEqual({ kind: 'upload', baseRev: 7 });
  });

  it('takes the cloud onto a fresh phone', () => {
    expect(plan(fresh, cloud(3, 12), null)).toEqual({ kind: 'use-cloud' });
  });

  it('keeps the phone when the cloud is empty', () => {
    expect(plan(played(2), cloud(1, 0), null)).toEqual({ kind: 'upload', baseRev: 1 });
  });

  it('takes the newer save from another device without asking', () => {
    // The cloud moved on past the rev this phone saw: more workouts there wins.
    expect(plan(played(3), cloud(9, 12), 8)).toEqual({ kind: 'use-cloud' });
    expect(plan(played(3), cloud(9, 12), null)).toEqual({ kind: 'use-cloud' });
    // A tie goes to the cloud, the side that was played and sent.
    expect(plan(played(3), cloud(9, 3), 8)).toEqual({ kind: 'use-cloud' });
  });

  it('keeps the phone when it has more workouts than the cloud', () => {
    expect(plan(played(5), cloud(9, 3), 8)).toEqual({ kind: 'upload', baseRev: 9 });
  });
});

group('cloud copy', () => {
  it('reads a cloud save back into a game state', () => {
    const s = played(2);
    expect(cloudState(cloud(1, 2, JSON.parse(JSON.stringify(s))))?.sessions).toHaveLength(2);
    expect(cloudState(cloud(1, 0, { hello: 1 }))).toBeNull();
    expect(cloudState(cloud(1, 0))).toBeNull();
  });

  it('says what each side holds', () => {
    expect(describe(1)).toBe('1 workout');
    expect(describe(12, '2026-10-27T10:00:00Z')).toMatch(/^12 workouts, /);
  });
});
