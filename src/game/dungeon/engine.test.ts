import { describe, expect, it } from 'vitest';
import { powerOf, ZONES } from '@/lib/fog';
import { initialState } from '@/lib/game';
import { botInput, playRun } from './bot';
import { createRun, DODGE, isBossRoom, isWardenRoom, pickRelic, skipToBoss, skipToWarden, stepRun, takeEvents, wardenFloor } from './engine';

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

  it('holds the Warden of the Ashes in the last room of floor 5, in two phases, and it leaves a chest', () => {
    expect(wardenFloor({ floors: 10, rooms: 5 })).toBe(4);
    expect(wardenFloor({ floors: 2, rooms: 2 })).toBe(-1);
    const run = createRun({ ...setup, power: { ...power, armor: 0.95 }, seed: 5 });
    skipToWarden(run);
    expect(run.floor).toBe(4);
    expect(isWardenRoom(run)).toBe(true);
    const w = run.warden!;
    expect(w.kind).toBe('warden');
    expect(run.foes.filter((f) => f.alive)).toEqual([w]);
    // Phase one: the turning cross. Shots fly while you stand still, and the room stays shut.
    for (let i = 0; i < 240; i++) stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.bullets.length).toBeGreaterThan(4);
    expect(run.doorOpen).toBe(false);
    takeEvents(run);
    // Past half its HP: phase two, announced once.
    w.hp = w.maxHp * 0.45;
    stepRun(run, { x: 0, y: 0, ability: false });
    expect(w.phase).toBe(2);
    expect(takeEvents(run).filter((e) => e.type === 'phase')).toHaveLength(1);
    // Down: the room opens one door (to the stairs) and leaves a chest that offers items.
    w.hp = 1;
    run.hero.x = w.x;
    run.hero.y = w.y + 40;
    for (let i = 0; i < 600 && !run.cleared; i++) stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.cleared).toBe(true);
    expect(run.doors).toHaveLength(1);
    expect(run.chest).not.toBeNull();
    run.hero.x = run.chest!.x;
    run.hero.y = run.chest!.y;
    stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.relicOffer).toHaveLength(3);
    pickRelic(run, run.relicOffer![0]);
    expect(Object.keys(run.relics)).toHaveLength(1);
  });

  it('dodges: a short dash that shots pass through, then a wait before the next', () => {
    const run = createRun({ ...setup, seed: 9 });
    for (let i = 0; i < 30; i++) stepRun(run, { x: 0, y: 0, ability: false });
    const x0 = run.hero.x,
      hp = run.hp;
    stepRun(run, { x: 1, y: 0, ability: false, dodge: true });
    expect(takeEvents(run).some((e) => e.type === 'dodge')).toBe(true);
    // A shot dead on you while you're in the dodge does nothing.
    const h = run.hero;
    run.bullets.push({ id: 9999, x: h.x + 4, y: h.y, vx: 0, vy: 0, r: 6, dmg: 50, born: run.t, boss: false, style: 'plain', ang: 0, spd: 0, bounce: 0 });
    for (let i = 0; i < 8; i++) stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.hp).toBe(hp);
    expect(run.hero.x - x0).toBeGreaterThan(DODGE.speed * DODGE.secs * 0.8);
    // Pressing again right away does nothing until the dodge has recharged.
    takeEvents(run);
    run.bullets = [];
    stepRun(run, { x: -1, y: 0, ability: false, dodge: true });
    expect(takeEvents(run).some((e) => e.type === 'dodge')).toBe(false);
    while (run.t < run.dodgeAt) stepRun(run, { x: 0, y: 0, ability: false });
    stepRun(run, { x: -1, y: 0, ability: false, dodge: true });
    expect(takeEvents(run).some((e) => e.type === 'dodge')).toBe(true);
  });

  it('the bot dodges when a shot it sees is about to land', () => {
    const run = createRun({ ...setup, seed: 9 });
    for (let i = 0; i < 30; i++) stepRun(run, { x: 0, y: 0, ability: false });
    const h = run.hero;
    // A shot fired a moment ago (the bot has had time to see it), a few steps away and coming.
    const id = [...Array(50).keys()].map((k) => 20000 + k).find((k) => ((Math.imul(k, 2654435761) >>> 0) % 1000) / 1000 < 0.5)!;
    run.bullets = [{ id, x: h.x - 30, y: h.y, vx: 240, vy: 0, r: 5, dmg: 10, born: run.t - 0.5, boss: false, style: 'plain', ang: 0, spd: 240, bounce: 0 }];
    expect(botInput(run).dodge).toBe(true);
  });

  it('the bot walks up to a monster it can\'t hit from afar, so a room never holds it forever', () => {
    const run = createRun({ ...setup, classId: 'archer', power: { ...power, armor: 0.95 }, seed: 4 });
    while (!run.foes.some((f) => f.alive && run.t >= f.bornUntil)) stepRun(run, { x: 0, y: 0, ability: false });
    // One harmless monster that never moves.
    const f = run.foes.find((o) => o.alive)!;
    run.foes = [f];
    run.waves = [];
    run.timers = [];
    f.def = { ...f.def, move: 'still', shoots: [], dmg: 0 };
    f.hp = f.maxHp = 400;
    // Tucked in a corner, a pillar in front of it.
    f.x = 50;
    f.y = 50;
    run.terrain = { ...run.terrain, pillars: [{ x: 92, y: 92, r: 30 }], water: [], spikes: [], barrels: [] };
    for (let i = 0; i < 60 * 120 && !run.cleared; i++) {
      stepRun(run, botInput(run));
      run.events.length = 0;
    }
    expect(run.cleared).toBe(true);
  });
});
