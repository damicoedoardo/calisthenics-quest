import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type Session } from './game';
import { EDGE, NO_EDGE, UPGRADES, ZONES, edgeFor, powerOf, recordRun, recordsBroken, rollUpgrades, xpToNext, zoneStatus } from './fog';

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
  }));

describe('the Fog', () => {
  it('has a zone for every chapter, opening with it once the boss before falls', () => {
    expect(ZONES.map((z) => z.boss)).toEqual(['tomorrow', 'mirror', 'knight', 'plateau', 'hollow', 'summit']);
    const s = initialState();
    expect(zoneStatus(s, ZONES[0]).state).toBe('open');
    expect(zoneStatus(s, ZONES[1])).toEqual({ state: 'locked', why: 'Beat the boss of The Ashen Edge first' });
    const cleared: GameState = { ...s, fog: { cleared: 1, runs: 3, best: {} } };
    expect(zoneStatus(cleared, ZONES[0]).state).toBe('cleared');
    expect(zoneStatus(cleared, ZONES[1])).toEqual({ state: 'locked', why: 'Opens with chapter 2: 12 workouts to go' });
    expect(zoneStatus({ ...cleared, sessions: sessions(12) }, ZONES[1]).state).toBe('open');
    const two: GameState = { ...s, sessions: sessions(23), fog: { cleared: 2, runs: 5, best: {} } };
    expect(zoneStatus(two, ZONES[2])).toEqual({ state: 'locked', why: 'Opens with chapter 3: 1 workout to go' });
  });

  it("weakens a boss once its chapter's hearts are gone, and adds a free skill per workout after", () => {
    const s = initialState();
    // Chapter 1 asks for 12 workouts.
    expect(edgeFor({ ...s, sessions: sessions(11) }, ZONES[0])).toEqual(NO_EDGE);
    expect(edgeFor({ ...s, sessions: sessions(12) }, ZONES[0])).toEqual({ bossHp: EDGE.bossHp, picks: 0 });
    expect(edgeFor({ ...s, sessions: sessions(15) }, ZONES[0])).toEqual({ bossHp: EDGE.bossHp, picks: 3 });
    expect(edgeFor({ ...s, sessions: sessions(40) }, ZONES[0]).picks).toBe(EDGE.picks);
    // Chapter 2 runs from workout 12 to 24.
    expect(edgeFor({ ...s, sessions: sessions(23) }, ZONES[1])).toEqual(NO_EDGE);
    expect(edgeFor({ ...s, sessions: sessions(25) }, ZONES[1]).picks).toBe(1);
  });

  it('turns stat points and workouts into power, and only training raises it', () => {
    const fresh = powerOf(initialState(), day(26));
    expect(fresh).toMatchObject({ damage: 0.12, speed: 0.08, reach: 0.15, move: 0, crit: 0.05, health: 0, armor: 0, flames: 0, fresh: false, fireballs: false, fairy: false, flameName: '' });
    const trained = powerOf({ ...initialState(), build: { damage: 10, health: 10, armor: 10 }, sessions: sessions(6) }, day(26));
    expect(trained.damage).toBeCloseTo(0.204, 3);
    expect(trained.health).toBeCloseTo(12.87, 1);
    expect(trained.armor).toBeCloseTo(0.035, 3);
    expect(trained.speed).toBe(0.08);
    expect(trained.flames).toBe(2);
    expect(trained.fresh).toBe(true);
    expect(powerOf({ ...initialState(), sessions: sessions(1, 20) }, day(26)).fresh).toBe(false);
    expect(powerOf({ ...initialState(), sessions: sessions(50) }, day(26))).toMatchObject({ flames: 4, fireballs: true, fairy: true });
  });

  it('starts runs Rested after a full day off, or after a minute by the fire', () => {
    const yesterday = { ...initialState(), sessions: sessions(3, 25) };
    expect(powerOf(yesterday, day(25)).rested).toBe(false);
    expect(powerOf(yesterday, day(26)).rested).toBe(false);
    expect(powerOf(yesterday, day(27)).rested).toBe(true);
    const fire = { ...yesterday, days: [{ day: '2026-10-26', line: '', quote: { text: '', by: '' }, fire: true }] };
    expect(powerOf(fire, day(26)).rested).toBe(true);
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
    expect(s.fog).toMatchObject({ cleared: 0, runs: 1, best: { 0: { won: false, seconds: 130, kills: 80, level: 6 } } });
    s = recordRun(s, { zone: 0, won: false, seconds: 90, kills: 40, level: 4 });
    expect(s.fog?.best[0].seconds).toBe(130);
    s = recordRun(s, { zone: 0, won: true, seconds: 270, kills: 300, level: 12 });
    expect(s.fog?.cleared).toBe(1);
    expect(s.fog?.best[0].won).toBe(true);
    // Beating a cleared zone again doesn't skip the next one.
    expect(recordRun(s, { zone: 0, won: true, seconds: 260, kills: 310, level: 13 }).fog?.cleared).toBe(1);
  });

  it('keeps a dungeon zone\'s records apart, and says which ones a run beats', () => {
    let s = recordRun(initialState(), { zone: 0, won: false, seconds: 300, kills: 60, level: 5, floor: 3, room: 2 });
    expect(s.fog?.records?.[0]).toEqual({ depth: 32, kills: 60, fastest: null });
    const next = { zone: 0, won: false, seconds: 200, kills: 70, level: 5, floor: 2, room: 5 };
    expect(recordsBroken(s.fog?.records?.[0], next)).toEqual({ depth: false, kills: true, fastest: false });
    expect(recordsBroken(undefined, next)).toEqual({ depth: false, kills: false, fastest: false });
    s = recordRun(s, next);
    expect(s.fog?.records?.[0]).toEqual({ depth: 32, kills: 70, fastest: null });
    const win = { zone: 0, won: true, seconds: 800, kills: 50, level: 9, floor: 10, room: 5 };
    expect(recordsBroken(s.fog?.records?.[0], win)).toEqual({ depth: true, kills: false, fastest: true });
    expect(recordRun(s, win).fog?.records?.[0]).toEqual({ depth: 1000, kills: 70, fastest: 800 });
  });
});
