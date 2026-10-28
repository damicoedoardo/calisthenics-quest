import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { nextLoot, purseOf, spendable } from './loot';
import { pointsFree } from './stats';
import { EMBERS, POINTS, SWEAT } from '@/balance';

const workouts = (n: number): Session[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), date: new Date(2026, 9, 1 + i * 3).toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [] }));
const after = (s: GameState, n: number): GameState => ({ ...s, sessions: [...s.sessions, ...workouts(n)] });

describe('loot', () => {
  it('the purse reads what the rules already count', () => {
    const s = after(initialState(), 4);
    const p = purseOf(s);
    expect(p.points).toBe(pointsFree(s));
    expect(p.coins).toBe(4 * SWEAT.perWorkout);
    expect(p.embers).toBe(4 * EMBERS.full);
    expect(p.mats).toBe(0);
  });

  it('the next workout gives the full or the minimum share', () => {
    const s = initialState(),
      now = new Date(2026, 9, 1);
    expect(nextLoot(s, 'normal', now)).toMatchObject({ points: POINTS.full, embers: EMBERS.full, coins: SWEAT.perWorkout });
    expect(nextLoot(s, 'rough', now)).toMatchObject({ points: POINTS.mini, embers: EMBERS.mini });
  });

  it('points not spent are flagged', () => {
    expect(spendable(after(initialState(), 1)).points).toBe(true);
  });
});
