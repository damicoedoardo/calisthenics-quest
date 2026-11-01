import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { eventsBetween, heroContext, openEvent, runEndEvent } from './analytics';

const session = (i: number, extra: Partial<Session> = {}): Session => ({
  id: String(i),
  date: new Date(2026, 9, 1 + i * 2).toISOString(),
  kind: 'full',
  day: 'A',
  xp: 100,
  breakdown: [],
  entries: [{ exerciseId: 'push', target: 10, sets: [{ reps: 10, rir: '2-3' }, { reps: 9, rir: '0-1' }] }],
  ...extra,
});

const hero = (n: number): GameState => ({
  ...initialState(),
  profile: { ...initialState().profile, onboarded: true, classId: 'warrior', letter: { why: 'secret', want: 'secret', forWho: 'secret', remind: 'secret' }, voice: 'secret' },
  sessions: Array.from({ length: n }, (_, i) => session(i)),
});

const names = (a: GameState, b: GameState) => eventsBetween(a, b).map((e) => e.name);

describe('play stats', () => {
  it('logs a finished workout with its gap since the last one', () => {
    const a = hero(2);
    const b = { ...a, sessions: [...a.sessions, session(2, { felt: 'right' })] };
    const [e] = eventsBetween(a, b);
    expect(e.name).toBe('workout_done');
    expect(e.props).toMatchObject({ n: 3, sets: 2, exercises: 1, gap_days: 2, planned_by: 'built-in' });
  });

  it('counts a restore or a jump once, not as workouts', () => {
    expect(names(hero(1), hero(4))).toEqual(['save_jumped']);
  });

  it('logs onboarding, class, scenes and a cleared zone', () => {
    const a = { ...initialState(), seenScenes: ['a'] };
    const b: GameState = { ...a, profile: { ...a.profile, onboarded: true, classId: 'mage' }, seenScenes: ['a', 'b'], fog: { cleared: 1, runs: 3, best: {} } };
    // A cleared zone ends its story chapter too.
    expect(names(a, b)).toEqual(['onboarded', 'class_picked', 'scene_seen', 'chapter_started', 'zone_cleared']);
  });

  it('sends nothing for an unchanged save', () => {
    const a = hero(3);
    expect(eventsBetween(a, a)).toEqual([]);
    expect(eventsBetween(a, { ...a })).toEqual([]);
  });

  it('never sends the player\'s own words', () => {
    const a = hero(4);
    const all = [
      heroContext(a, new Date(2026, 9, 20)),
      openEvent(a, new Date(2026, 9, 20)).props,
      runEndEvent(a, { zone: 0, won: false, seconds: 90, kills: 12, level: 3, floor: 2, room: 1, why: 'hp' }, { party: false, bot: false, start_at: null }).props,
      ...eventsBetween(hero(3), a).map((e) => e.props),
    ];
    expect(JSON.stringify(all)).not.toContain('secret');
  });

  it('describes a run end with zone from 1 and how it ended', () => {
    const e = runEndEvent(hero(4), { zone: 0, won: false, seconds: 90.4, kills: 12, level: 3, floor: 2, room: 1, why: 'hp' }, { party: false, bot: false, start_at: null });
    expect(e.props).toMatchObject({ zone: 1, won: false, why: 'hp', floor: 2, seconds: 90, weapon_rarity: 'starter', pts_damage: 0 });
  });
});
