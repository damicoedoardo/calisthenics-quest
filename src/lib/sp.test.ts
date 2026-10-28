import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { giveSp, setSpOff, SP_FLOOR, spAfterRun, spOpen, spOwned, spTrial, spWorn, wearSp } from './sp';
import { SP_TRIAL } from '@/balance';
import { SP_CARDS, SP_ELEMENTS } from '@/game/dungeon/content';

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
    expect(spWorn(s)).toBe(1);
    expect(spWorn(setSpOff(s, true))).toBe(0);
  });

  it('is never given twice, and nothing counts before it is given', () => {
    const s = initialState();
    expect(spAfterRun(s, { floor: 10 })).toBe(s);
    const g = giveSp(s);
    expect(giveSp(after(g, 3)).sp?.givenAt).toBe(0);
  });
});

describe('the later SPs', () => {
  const woken = (): GameState => spAfterRun(after(giveSp(after(initialState(), SP_TRIAL.at)), SP_TRIAL.workouts), { floor: SP_FLOOR });

  it('come awake and worn, and only the ones given show', () => {
    let s = woken();
    expect(spOwned(s)).toEqual([1]);
    s = giveSp(setSpOff(s, true), 2);
    expect(spOwned(s)).toEqual([1, 2]);
    expect(spWorn(s)).toBe(2);
    expect(giveSp(s, 2)).toBe(s);
  });

  it('can be swapped, but never for one you lack', () => {
    const s = giveSp(woken(), 3);
    expect(spWorn(wearSp(s, 1))).toBe(1);
    expect(wearSp(s, 4)).toBe(s);
  });
});

describe('the elements', () => {
  it('gives each class one SP of each element', () => {
    for (const cards of Object.values(SP_CARDS)) expect(cards.map((c) => c.element).sort()).toEqual([...SP_ELEMENTS].sort());
  });
});
