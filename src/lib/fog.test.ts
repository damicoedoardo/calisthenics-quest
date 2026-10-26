import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { UPGRADES, ZONES, powerOf, recordRun, rollUpgrades, xpToNext, zoneStatus } from './fog';

const day = (d: number) => new Date(2026, 9, d, 18);

const sessions = (n: number, lastDay = 25): Session[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    date: day(lastDay - (n - 1 - i)).toISOString(),
    kind: 'full',
    day: 'A',
    xp: 100,
    breakdown: [],
    entries: [],
    unlocked: [],
  }));

describe('the Fog', () => {
  it('opens a zone only after its boss before falls and enough workouts are done', () => {
    const s = initialState();
    expect(zoneStatus(s, ZONES[0]).state).toBe('open');
    expect(zoneStatus(s, ZONES[1])).toEqual({ state: 'locked', why: 'Beat the boss of The Ashen Edge first' });
    const cleared: GameState = { ...s, fog: { cleared: 1, runs: 3, best: {} } };
    expect(zoneStatus(cleared, ZONES[0]).state).toBe('cleared');
    expect(zoneStatus(cleared, ZONES[1])).toEqual({ state: 'locked', why: 'Opens after 6 workouts: 6 to go' });
    expect(zoneStatus({ ...cleared, sessions: sessions(6) }, ZONES[1]).state).toBe('open');
  });

  it('turns the skill tree and workouts into power, and only training raises it', () => {
    const fresh = powerOf(initialState(), day(26));
    expect(fresh).toMatchObject({ strike: 0.12, reach: 0.08, hold: 0, flames: 0, fresh: false });
    const trained = powerOf({ ...initialState(), progress: { push: 3, pull: 2, core: 2 }, sessions: sessions(6) }, day(26));
    expect(trained.strike).toBeCloseTo(0.36);
    expect(trained.hold).toBe(30);
    expect(trained.armor).toBeCloseTo(0.08);
    expect(trained.flames).toBe(2);
    expect(trained.fresh).toBe(true);
    expect(powerOf({ ...initialState(), sessions: sessions(1, 20) }, day(26)).fresh).toBe(false);
  });

  it('offers three different skills that are not maxed', () => {
    const roll = rollUpgrades({}, () => 0.5);
    expect(new Set(roll).size).toBe(3);
    const maxed = Object.fromEntries(UPGRADES.filter((u) => u.id !== 'swift').map((u) => [u.id, u.max]));
    expect(rollUpgrades(maxed)).toEqual(['swift']);
    expect(xpToNext(2)).toBeGreaterThan(xpToNext(1));
  });

  it('clears a zone when its boss falls, and keeps the best run', () => {
    let s = recordRun(initialState(), { zone: 0, won: false, seconds: 130, kills: 80, level: 6 });
    expect(s.fog).toEqual({ cleared: 0, runs: 1, best: { 0: { won: false, seconds: 130, kills: 80, level: 6 } } });
    s = recordRun(s, { zone: 0, won: false, seconds: 90, kills: 40, level: 4 });
    expect(s.fog?.best[0].seconds).toBe(130);
    s = recordRun(s, { zone: 0, won: true, seconds: 270, kills: 300, level: 12 });
    expect(s.fog?.cleared).toBe(1);
    expect(s.fog?.best[0].won).toBe(true);
    // Beating a cleared zone again doesn't skip the next one.
    expect(recordRun(s, { zone: 0, won: true, seconds: 260, kills: 310, level: 13 }).fog?.cleared).toBe(1);
  });
});
