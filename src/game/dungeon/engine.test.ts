import { describe, expect, it } from 'vitest';
import { powerOf, ZONES } from '@/lib/fog';
import { initialState } from '@/lib/game';
import { botInput, playRun } from './bot';
import { CREW, createRun, DIM, DODGE, hardened, isBossRoom, isWardenRoom, LIGHT, MIDS, pickRelic, SAND, skipToBoss, skipToWarden, SPLIT, stepRun, takeEvents, wardenFloor } from './engine';

describe('mid-bosses', () => {
  const power = powerOf(initialState(), new Date());
  const still = { x: 0, y: 0, ability: false };
  const midRun = (z: number) => {
    const run = createRun({ zone: ZONES[z], power, classId: undefined, seed: 5 });
    skipToWarden(run);
    return run;
  };

  it('each zone has its own, and it guards the middle floor', () => {
    expect(new Set(MIDS.map((m) => m.kind)).size).toBe(ZONES.length);
    ZONES.forEach((z, i) => expect(midRun(i).warden?.kind).toBe(MIDS[i].kind));
  });

  it('the Drowned Lantern dims the room, and the dark lifts when it falls', () => {
    const run = midRun(1);
    expect(run.dim).toBe(DIM.full);
    for (let i = 0; i < 60 * 8; i++) stepRun(run, still);
    expect(run.dim).toBeLessThan(DIM.full);
  });

  it('the Foreman mends its crew unless it was just hit', () => {
    const run = midRun(2);
    for (let i = 0; i < 60 * 2; i++) stepRun(run, still);
    const crew = run.foes.filter((f) => f.alive && f !== run.warden);
    expect(crew.length).toBe(CREW.size);
    crew[0].hp = 1;
    for (let i = 0; i < 60 * (CREW.every + 0.5) && !run.over; i++) stepRun(run, still);
    expect(crew[0].hp).toBe(crew[0].maxHp);
  });

  it('the Sand Golem takes no hits while it stands as stone', () => {
    const run = midRun(3),
      g = run.warden!;
    for (let i = 0; i < 60 * (1.5 + SAND.walk + 0.3); i++) stepRun(run, still);
    expect(hardened(run, g)).toBe(true);
  });

  it('the bot beats each of them', () => {
    const strong = { ...power, strike: 6, armor: 0.95, hold: 2000 };
    MIDS.forEach((_, z) => {
      const run = createRun({ zone: ZONES[z], power: strong, classId: 'archer', seed: 9, autoPick: true });
      skipToWarden(run);
      for (let i = 0; i < 60 * 120 && run.warden?.alive && !run.over; i++) stepRun(run, botInput(run));
      expect(run.warden?.alive, MIDS[z].name).toBe(false);
    });
  });
});

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

  const still = { x: 0, y: 0, ability: false };
  const tough = { ...power, armor: 0.95, strike: 20 };

  it('the Mirror splits into images that never shoot; hitting one hurts you and shatters it', () => {
    const run = createRun({ ...setup, zone: ZONES[1], power: { ...power, armor: 0.95 }, seed: 4 });
    skipToBoss(run);
    while (run.t < 1.3 + SPLIT.first + 0.1) stepRun(run, still);
    const images = run.foes.filter((f) => f.alive && f.kind === 'image');
    expect(images).toHaveLength(2);
    expect(images.every((f) => f.def.shoots.length === 0)).toBe(true);
    // Stand right on an image: the attack aims at it, and it costs you.
    const hp = run.hp,
      im = images[0];
    run.hero.x = im.x;
    run.hero.y = im.y + 30;
    for (let i = 0; i < 90 && im.alive; i++) stepRun(run, still);
    expect(im.alive).toBe(false);
    expect(takeEvents(run).some((e) => e.type === 'hurt' && e.by === 'image')).toBe(true);
    expect(run.hp).toBeLessThan(hp);
  });

  it("the Hollow can't be hurt; standing in its open light long enough takes its hand", () => {
    const run = createRun({ ...setup, zone: ZONES[4], power: tough, seed: 2 });
    skipToBoss(run);
    // Standing still the whole fight: this is about the light, not about surviving it.
    run.hp = run.maxHp = 100000;
    while (!run.boss) stepRun(run, still);
    const b = run.boss;
    // Dark: hits do nothing to it.
    for (let i = 0; i < 120; i++) stepRun(run, still);
    expect(b.hp).toBe(b.maxHp);
    expect(b.phase).toBe(1);
    // Lit: walk in and stay.
    while (b.phase !== 2) stepRun(run, still);
    for (let i = 0; i < (LIGHT.hold + 0.5) * 60 && !run.over; i++) {
      run.hero.x = b.x;
      run.hero.y = b.y + 20;
      stepRun(run, still);
    }
    expect(run.over).toMatchObject({ won: true, why: 'boss' });
  });

  it('the Summit is a climb with no boss: a ledge climbed is a win, scored by height', () => {
    const run = createRun({ ...setup, zone: ZONES[5], power: tough, seed: 6, autoPick: true });
    skipToBoss(run);
    expect(run.climb).toBe(0);
    expect(run.boss).toBeNull();
    expect(run.allies.map((a) => a.kind)).toEqual(['wanderer', 'mira', 'vela']);
    run.hp = run.maxHp = 100000;
    while (!run.over && (run.climb ?? 0) < 2) {
      stepRun(run, botInput(run));
      run.events.length = 0;
    }
    expect(run.climb).toBe(2);
    run.hp = 0.1;
    run.hurtUntil = 0;
    run.ghostUntil = 0;
    run.relics = {};
    while (!run.over) {
      stepRun(run, still);
      run.events.length = 0;
    }
    expect(run.over).toMatchObject({ won: true, height: 2 });
  });

  it('the bot plays every boss', () => {
    for (const z of [1, 2, 3, 4]) {
      const run = createRun({ ...setup, zone: ZONES[z], classId: 'archer', power: tough, seed: 8, autoPick: true });
      skipToBoss(run);
      // Plenty of HP (but not on the lake, where hitting a copy costs a share of it).
      if (z !== 1) run.hp = run.maxHp = 100000;
      while (!run.over) {
        stepRun(run, botInput(run));
        run.events.length = 0;
      }
      expect(run.over, ZONES[z].boss).toMatchObject({ won: true, why: 'boss' });
    }
  });
});
