import { describe, expect, it } from 'vitest';
import { powerOf, ZONES } from '@/lib/fog';
import { initialState } from '@/lib/game';
import { botInput, playRun } from './bot';
import { createRun, isBossRoom, skipToBoss, stepRun } from './engine';

describe('dungeon', () => {
  const power = powerOf(initialState(), new Date());
  const setup = { zone: ZONES[0], power, classId: undefined, seed: 3 };

  it('plays the same run for the same seed', () => {
    const a = playRun({ ...setup, layout: { floors: 2, rooms: 2 } });
    expect(playRun({ ...setup, layout: { floors: 2, rooms: 2 } })).toEqual(a);
    expect(a.seconds).toBeGreaterThan(10);
  });

  it('holds still while a skill pick waits', () => {
    const run = createRun({ ...setup, power: { ...power, fresh: true } });
    for (let i = 0; i < 60; i++) stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.offer?.free).toBe('fresh');
    const t = run.t;
    stepRun(run, { x: 1, y: 0, ability: false });
    expect(run.t).toBe(t);
  });

  it('keeps the boss room shut until the boss falls', () => {
    const run = createRun(setup);
    skipToBoss(run);
    expect(isBossRoom(run)).toBe(true);
    for (let i = 0; i < 120; i++) stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.boss).not.toBeNull();
    expect(run.doorOpen).toBe(false);
  });

  it('a far stronger fog ends the run on the first floor', () => {
    const r = playRun({ ...setup, zone: { ...ZONES[0], hp: 30, dmg: 30 } });
    expect(r).toMatchObject({ won: false, floor: 1, why: 'hp' });
  });

  it('opens two different doors after a room, and a chest room leaves a chest that offers items', () => {
    const run = createRun({ ...setup, power: { ...power, armor: 0.9 }, autoPick: true, seed: 11 });
    const doors: string[][] = [];
    let chests = 0;
    while (!run.over && run.floor < 3) {
      const wasCleared = run.cleared;
      stepRun(run, botInput(run));
      if (!wasCleared && run.cleared && run.doors.length > 1) doors.push(run.doors.map((d) => d.kind));
      if (run.events.some((e) => e.type === 'chest')) chests++;
      run.events.length = 0;
    }
    expect(doors.length).toBeGreaterThan(3);
    for (const [a, b] of doors) expect(a).not.toBe(b);
    expect(chests).toBeGreaterThan(0);
    expect(Object.values(run.relics).reduce((n, k) => n + (k ?? 0), 0)).toBe(chests);
  });
});
