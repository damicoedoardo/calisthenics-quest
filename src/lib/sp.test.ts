import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { giveSp, setSpOff, SP_FLOOR, spAfterRun, spOpen, spTrial, spWorn } from './sp';
import { SP_TRIAL } from '@/balance';

const workouts = (n: number): Session[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), date: new Date(2026, 9, 1 + i).toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [] }));
const after = (s: GameState, n: number): GameState => ({ ...s, sessions: [...s.sessions, ...workouts(n)] });

describe('the first SP', () => {
  it('is sealed until its trial is done: more workouts and the mid-boss floor', () => {
    let s = giveSp(after(initialState(), SP_TRIAL.at));
    expect(spTrial(s)).toMatchObject({ workouts: 0, floor: false });
    s = after(s, SP_TRIAL.workouts);
    expect(spOpen(s)).toBe(false);
    expect(spAfterRun(s, { floor: SP_FLOOR - 1 })).toBe(s);
    s = spAfterRun(s, { floor: SP_FLOOR });
    expect(spOpen(s)).toBe(true);
    expect(spWorn(s)).toBe(true);
    expect(spWorn(setSpOff(s, true))).toBe(false);
  });

  it('is never given twice, and nothing counts before it is given', () => {
    const s = initialState();
    expect(spAfterRun(s, { floor: 10 })).toBe(s);
    const g = giveSp(s);
    expect(giveSp(after(g, 3)).sp?.givenAt).toBe(0);
  });
});
