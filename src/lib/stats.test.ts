import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { BASE, CLASS_LEAN_POINTS, STARTING_POINTS, pointsEarned, pointsFree, refundPoint, resetBuild, spendEvenly, spendPoint, statPower, statValue } from './stats';

const session = (date: Date, extra: Partial<Session> = {}): Session => ({ id: date.toISOString(), date: date.toISOString(), kind: 'full', day: 'A', xp: 100, breakdown: [], entries: [], ...extra });

describe('stat points', () => {
  it('earns points for every workout, a week at the goal, and beating last time', () => {
    expect(pointsEarned(initialState()).total).toBe(STARTING_POINTS);
    const week = [26, 28, 30].map((d) => new Date(2026, 9, d, 18));
    const state: GameState = {
      ...initialState(),
      sessions: [session(week[0]), session(week[1], { kind: 'mini' }), session(week[2], { better: true }), session(new Date(2026, 10, 3, 18))],
    };
    // 6 to start + 3 full workouts × 3 + 1 short + 2 for the week + 1 for beating last time
    expect(pointsEarned(state).total).toBe(6 + 9 + 1 + 2 + 1);
  });

  it('spends only free points, and takes them back for free', () => {
    let s = spendPoint(initialState(), 'damage', 4);
    expect(s.build).toEqual({ damage: 4 });
    expect(pointsFree(s)).toBe(STARTING_POINTS - 4);
    s = spendPoint(s, 'health', 99);
    expect(s.build).toEqual({ damage: 4, health: STARTING_POINTS - 4 });
    expect(spendPoint(s, 'speed')).toBe(s);
    s = refundPoint(s, 'damage');
    expect(pointsFree(s)).toBe(1);
    expect(pointsFree(resetBuild(s))).toBe(STARTING_POINTS);
    expect(spendEvenly(initialState()).build).toEqual({ health: 2, armor: 1, damage: 1, speed: 1, move: 1 });
  });

  it('gives a little less for each point in the same stat', () => {
    const first = statValue(1, 1),
      later = statValue(1, 150) - statValue(1, 149);
    expect(later / first).toBeGreaterThan(0.45);
    expect(later / first).toBeLessThan(0.55);
    // two stats at 80 give more than one at 160
    expect(statValue(1, 160)).toBeLessThan(2 * statValue(1, 80));
  });

  it('leans each class to its stat a little', () => {
    expect(statPower({}, 'warrior').damage).toBeCloseTo(statPower({ damage: CLASS_LEAN_POINTS }).damage);
    expect(statPower({}, 'monk').health).toBeGreaterThan(0);
    expect(statPower({}, undefined)).toEqual({ ...BASE, armor: 0, crit: 0.05 });
  });
});
