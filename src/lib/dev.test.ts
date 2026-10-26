import { describe, expect, it } from 'vitest';
import { initialState } from './game';
import { pendingScenes } from '@/story/engine';
import { addFakeWorkouts, clearNextZone, resetFog, skipIntro } from './dev';

const now = new Date(2026, 9, 26, 18);

describe('developer mode', () => {
  it('skips the opening straight to a ready hero', () => {
    const s = skipIntro(initialState(), now);
    expect(s.profile.onboarded).toBe(true);
    expect(s.profile.voice).toBe('You always quit.');
    expect(s.sessions).toHaveLength(0);
    expect(pendingScenes(s, now)).toEqual([]);
  });

  it('adds fake workouts after the real ones, ending today, and can skip their story scenes', () => {
    let s = addFakeWorkouts(skipIntro(initialState(), now), 5, now, true);
    expect(s.sessions).toHaveLength(5);
    expect(s.sessions[4].date).toBe(now.toISOString());
    expect(new Date(s.sessions[0].date).getTime()).toBe(now.getTime() - 8 * 86_400_000);
    expect(pendingScenes(s, now)).toEqual([]);
    expect(s.seenScenes).toContain('class-choice');

    const later = new Date(now.getTime() + 3_600_000);
    s = addFakeWorkouts(s, 2, later, false);
    expect(s.sessions).toHaveLength(7);
    // Squeezed between the last workout and now, still in order.
    const times = s.sessions.map((x) => new Date(x.date).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[6]).toBe(later.getTime());
  });

  it('beats Fog bosses and resets them', () => {
    let s = initialState();
    for (let i = 0; i < 7; i++) s = clearNextZone(s);
    expect(s.fog?.cleared).toBe(6);
    expect(resetFog(s).fog).toEqual({ cleared: 0, runs: 0, best: {} });
  });
});
