import { describe, expect, it } from 'vitest';
import { powerOf, ZONES } from '@/lib/fog';
import { initialState } from '@/lib/game';
import { botInput, playRun } from './bot';
import { ACROSS, CREW, createRun, DIM, DODGE, hardened, isBossRoom, isWardenRoom, LAYOUT, LIGHT, makeFloor, MIDS, mine, pickRelic, SAND, skipToBoss, skipToWarden, SPLIT, stepRun, takeEvents, wardenFloor, type Side } from './engine';

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
    ZONES.forEach((_, i) => expect(midRun(i).warden?.kind).toBe(MIDS[i].kind));
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
    const strong = { ...power, damage: 6, armor: 0.95, health: 2000 };
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
    expect(run.hero.offer?.free).toBe('fresh');
    const t = run.t;
    stepRun(run, { x: 1, y: 0, ability: false });
    expect(run.t).toBe(t);
  });

  it('aims at the monster you tapped while it is in reach, and lets go when asked', () => {
    const run = createRun({ ...setup, classId: 'archer', autoPick: true });
    for (let i = 0; i < 60 * 6 && run.foes.filter((f) => f.alive && run.t >= f.bornUntil).length < 2; i++) stepRun(run, { x: 0, y: 0, ability: false });
    const [near, far] = run.foes.filter((f) => f.alive && run.t >= f.bornUntil);
    const h = run.hero;
    Object.assign(near, { x: h.x + 60, y: h.y, vx: 0, vy: 0 });
    Object.assign(far, { x: h.x, y: h.y - 150, vx: 0, vy: 0 });
    stepRun(run, { x: 0, y: 0, ability: false, lock: far.id });
    expect(run.hero.lock).toBe(far.id);
    takeEvents(run);
    let angle: number | null = null;
    for (let i = 0; i < 120 && angle === null; i++) {
      Object.assign(near, { x: h.x + 60, y: h.y });
      Object.assign(far, { x: h.x, y: h.y - 150 });
      stepRun(run, { x: 0, y: 0, ability: false });
      const at = takeEvents(run).find((e) => e.type === 'attack');
      if (at && at.type === 'attack') angle = at.angle;
    }
    expect(angle).not.toBeNull();
    expect(Math.abs(angle! - -Math.PI / 2)).toBeLessThan(0.2);
    stepRun(run, { x: 0, y: 0, ability: false, lock: null });
    expect(run.hero.lock).toBeNull();
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

  it('makes each floor a map: a way east to the last room, rooms off to the side, all joined', () => {
    for (let floor = 0; floor < LAYOUT.floors; floor++)
      for (const seed of [1, 2, 3, 4, 5]) {
        const { cells } = makeFloor(LAYOUT, floor, seed * 101 + floor);
        expect(cells.length).toBeGreaterThanOrEqual(LAYOUT.rooms + 1);
        const ends = cells.filter((c) => c.kind === 'stairs' || c.kind === 'warden' || c.kind === 'boss');
        expect(ends).toHaveLength(1);
        expect(ends[0].kind).toBe(floor === LAYOUT.floors - 1 ? 'boss' : floor === wardenFloor(LAYOUT) ? 'warden' : 'stairs');
        // The last room has one door, the way in from the west.
        expect(Object.keys(ends[0].links)).toEqual(['w']);
        // Every room can be walked to, and each door has one on the other side.
        expect(cells.every((c) => c.id === 0 || c.dist > 0)).toBe(true);
        for (const c of cells) for (const [s, to] of Object.entries(c.links)) expect(cells[to!].links[ACROSS[s as Side]]).toBe(c.id);
        if (floor === 0) expect(cells.some((c) => c.kind === 'elite')).toBe(false);
        expect(cells.filter((c) => c.kind === 'rest').length).toBeLessThanOrEqual(1);
      }
  });

  it('walks back into a cleared room as it was: doors open, nothing to fight', () => {
    const run = createRun({ ...setup, power: { ...power, armor: 0.9 }, autoPick: true, seed: 11 });
    while (!run.cleared && !run.over) stepRun(run, botInput(run));
    const first = run.map.at,
      terrain = run.terrain,
      door = run.doors[0];
    expect(door).toBeDefined();
    run.hero.x = door.x + (door.side === 'n' ? 2 : door.side === 's' ? -2 : 0);
    run.hero.y = door.y + (door.side === 'e' ? 2 : door.side === 'w' ? -2 : 0);
    stepRun(run, { x: door.side === 'n' ? -1 : door.side === 's' ? 1 : 0, y: door.side === 'e' ? -1 : door.side === 'w' ? 1 : 0, ability: false });
    expect(run.map.at).toBe(door.to);
    expect(run.room).toBe(1);
    const back = run.map.cells[door.to].links[ACROSS[door.side]];
    expect(back).toBe(first);
    run.foes = [];
    run.waves = [];
    for (let i = 0; i < 120 && !run.cleared; i++) stepRun(run, { x: 0, y: 0, ability: false });
    const home = run.doors.find((d) => d.to === first)!;
    expect(home.been).toBe(true);
    run.hero.x = home.x;
    run.hero.y = home.y;
    stepRun(run, { x: home.side === 'n' ? -1 : home.side === 's' ? 1 : 0, y: home.side === 'e' ? -1 : home.side === 'w' ? 1 : 0, ability: false });
    expect(run.map.at).toBe(first);
    expect(run.terrain).toBe(terrain);
    expect(run.doorOpen).toBe(true);
    expect(run.foes).toHaveLength(0);
    expect(run.room).toBe(1);
  });

  it('the bot explores each floor and takes the stairs, and chests offer items', () => {
    const run = createRun({ ...setup, power: { ...power, armor: 0.9, health: 400 }, autoPick: true, seed: 11 });
    let chests = 0,
      floors = 0;
    while (!run.over && run.floor < 3) {
      stepRun(run, botInput(run));
      if (run.events.some((e) => e.type === 'chest')) chests++;
      if (run.events.some((e) => e.type === 'floor')) floors++;
      run.events.length = 0;
    }
    expect(floors).toBe(3);
    expect(chests).toBeGreaterThan(0);
    expect(Object.values(run.hero.relics).reduce((n, k) => n + (k ?? 0), 0)).toBe(chests);
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
    // Down: the room opens its one door (back the way you came), the stairs down appear, and it
    // leaves a chest that offers items.
    w.hp = 1;
    run.hero.x = w.x;
    run.hero.y = w.y + 40;
    for (let i = 0; i < 600 && !run.cleared; i++) stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.cleared).toBe(true);
    expect(run.doors).toHaveLength(1);
    expect(run.stairs).not.toBeNull();
    expect(run.chest).not.toBeNull();
    run.hero.x = run.chest!.x;
    run.hero.y = run.chest!.y;
    stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.hero.relicOffer).toHaveLength(3);
    pickRelic(run, run.hero.relicOffer![0]);
    expect(Object.keys(run.hero.relics)).toHaveLength(1);
  });

  it('dodges: a short dash that shots pass through, then a wait before the next', () => {
    const run = createRun({ ...setup, seed: 9 });
    for (let i = 0; i < 30; i++) stepRun(run, { x: 0, y: 0, ability: false });
    const x0 = run.hero.x,
      hp = run.hero.hp;
    stepRun(run, { x: 1, y: 0, ability: false, dodge: true });
    expect(takeEvents(run).some((e) => e.type === 'dodge')).toBe(true);
    // A shot dead on you while you're in the dodge does nothing.
    const h = run.hero;
    run.bullets.push({ id: 9999, x: h.x + 4, y: h.y, vx: 0, vy: 0, r: 6, dmg: 50, born: run.t, boss: false, style: 'plain', ang: 0, spd: 0, bounce: 0 });
    for (let i = 0; i < 8; i++) stepRun(run, { x: 0, y: 0, ability: false });
    expect(run.hero.hp).toBe(hp);
    expect(run.hero.x - x0).toBeGreaterThan(DODGE.speed * DODGE.secs * 0.8);
    // Pressing again right away does nothing until the dodge has recharged.
    takeEvents(run);
    run.bullets = [];
    stepRun(run, { x: -1, y: 0, ability: false, dodge: true });
    expect(takeEvents(run).some((e) => e.type === 'dodge')).toBe(false);
    while (run.t < run.hero.dodgeAt) stepRun(run, { x: 0, y: 0, ability: false });
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
  const tough = { ...power, armor: 0.95, damage: 20 };

  it('the Mirror splits into images that never shoot; hitting one hurts you and shatters it', () => {
    const run = createRun({ ...setup, zone: ZONES[1], power: { ...power, armor: 0.95 }, seed: 4 });
    skipToBoss(run);
    while (run.t < 1.3 + SPLIT.first + 0.1) stepRun(run, still);
    const images = run.foes.filter((f) => f.alive && f.kind === 'image');
    expect(images).toHaveLength(2);
    expect(images.every((f) => f.def.shoots.length === 0)).toBe(true);
    // Stand right on an image: the attack aims at it, and it costs you.
    const hp = run.hero.hp,
      im = images[0];
    run.hero.x = im.x;
    run.hero.y = im.y + 30;
    for (let i = 0; i < 90 && im.alive; i++) stepRun(run, still);
    expect(im.alive).toBe(false);
    expect(takeEvents(run).some((e) => e.type === 'hurt' && e.by === 'image')).toBe(true);
    expect(run.hero.hp).toBeLessThan(hp);
  });

  it("the Hollow can't be hurt; standing in its open light long enough takes its hand", () => {
    const run = createRun({ ...setup, zone: ZONES[4], power: tough, seed: 2 });
    skipToBoss(run);
    // Standing still the whole fight: this is about the light, not about surviving it.
    run.hero.hp = run.hero.maxHp = 100000;
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
    run.hero.hp = run.hero.maxHp = 100000;
    while (!run.over && (run.climb ?? 0) < 2) {
      stepRun(run, botInput(run));
      run.events.length = 0;
    }
    expect(run.climb).toBe(2);
    run.hero.hp = 0.1;
    run.hero.hurtUntil = 0;
    run.hero.ghostUntil = 0;
    run.hero.relics = {};
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
      if (z !== 1) run.hero.hp = run.hero.maxHp = 100000;
      while (!run.over) {
        stepRun(run, botInput(run));
        run.events.length = 0;
      }
      expect(run.over, ZONES[z].boss).toMatchObject({ won: true, why: 'boss' });
    }
  });
});

describe('replays', () => {
  // A whole bot run in every zone, fingerprinted. A cleanup that changes nothing keeps these as
  // they are; a balance change moves them on purpose (refresh with `pnpm test -u`).
  const power = { ...powerOf(initialState(), new Date()), damage: 1.2, speed: 0.4, reach: 0.15, armor: 0.25, health: 180 };
  const classes = ['warrior', 'archer', 'mage', 'monk'] as const;
  it('every zone plays the same run as before', () => {
    const ends = ZONES.map((zone, i) => playRun({ zone, power, classId: classes[i % classes.length], seed: 11 + i }));
    expect(ends).toMatchSnapshot();
  });
});

describe('a party (co-op)', () => {
  const power = { ...powerOf(initialState(), new Date()), damage: 1.2, speed: 0.4, reach: 0.15, armor: 0.25, health: 180 };
  const party = (seed: number) => {
    const run = createRun({ zone: ZONES[0], power, classId: 'warrior', seed, autoPick: true, friends: [{ power, classId: 'archer' }] });
    let steps = 0;
    while (!run.over && steps++ < 60 * 60 * 30) {
      stepRun(run, run.party.map((h) => botInput(run, h)));
      run.events.length = 0;
    }
    return run;
  };

  it('walks in together, each with their own class and gear', () => {
    const run = createRun({ zone: ZONES[0], power, classId: 'warrior', seed: 3, friends: [{ power, classId: 'mage' }] });
    const [me, friend] = run.party;
    expect(run.hero).toBe(me);
    expect(friend.classId).toBe('mage');
    expect(friend.gear.worn.weapon?.id).not.toBe(me.gear.worn.weapon?.id);
    expect(Math.hypot(me.x - friend.x, me.y - friend.y)).toBeGreaterThan(20);
  });

  it('two bots play a whole run, both fighting, the same way every time', () => {
    const run = party(21);
    const [me, friend] = run.party;
    expect(run.over).not.toBeNull();
    expect(me.kills).toBeGreaterThan(0);
    expect(friend.kills).toBeGreaterThan(0);
    const again = party(21);
    expect(again.over).toEqual(run.over);
    expect(again.party.map((h) => [h.kills, h.level, h.xp])).toEqual(run.party.map((h) => [h.kills, h.level, h.xp]));
  });

  it('shares XP: every standing hero gets every bit of light', () => {
    const [me, friend] = party(21).party;
    expect(friend.level).toBe(me.level);
  });

  it('drops are personal: each hero gets their own item and takes only theirs', () => {
    const run = createRun({ zone: ZONES[0], power, classId: 'warrior', seed: 21, autoPick: true, friends: [{ power, classId: 'archer' }] });
    const [me, friend] = run.party;
    for (let i = 0; i < 60 * 60 * 30 && !run.over; i++) {
      stepRun(run, run.party.map((h) => botInput(run, h)));
      run.events.length = 0;
      if (run.loot.some((l) => l.for === me.id) && run.loot.some((l) => l.for === friend.id)) break;
    }
    const theirs = run.loot.find((l) => l.for === friend.id)!;
    expect(mine(theirs, me)).toBe(false);
    expect(mine(theirs, friend)).toBe(true);
  });

  it('drops co-op materials for the forge, each hero their own, and a solo run none', () => {
    const run = party(25);
    const [me, friend] = run.party;
    expect(me.mats.thread ?? 0).toBeGreaterThan(0);
    expect(friend.mats.thread ?? 0).toBeGreaterThan(0);
    expect(run.over!.mats).toEqual(me.mats);
    const solo = createRun({ zone: ZONES[0], power, classId: 'warrior', seed: 21, autoPick: true });
    for (let i = 0; i < 60 * 60 * 30 && !solo.over; i++) {
      stepRun(solo, botInput(solo, solo.hero));
      solo.events.length = 0;
    }
    expect(solo.hero.mats).toEqual({});
    expect(solo.over!.mats).toBeUndefined();
  });

  it('a fallen hero is down, and the run goes on while a friend stands', () => {
    const run = createRun({ zone: ZONES[0], power, classId: 'warrior', seed: 4, friends: [{ power, classId: 'archer' }] });
    run.party[1].hp = 1;
    run.party[1].hurtUntil = run.party[1].ghostUntil = 0;
    // Monsters only go for the friend: stand them on top of it until it falls.
    for (let i = 0; i < 60 * 30 && run.party[1].hp > 0; i++) {
      for (const f of run.foes) if (f.alive) [f.x, f.y] = [run.party[1].x, run.party[1].y];
      stepRun(run, [{ x: 0, y: 0, ability: false }]);
    }
    expect(run.party[1].hp).toBe(0);
    expect(run.over).toBeNull();
  });
});
