import { describe, expect, it } from 'vitest';
import { initialState } from '@/lib/game';
import { powerOf } from '@/lib/fog';
import { seeded } from '@/lib/random';
import { overFor, winNow, type HeroSetup, type Input } from '../dungeon/engine';
import { Room } from './room';
import { runFromStart } from './wire';
import { Follower } from './follow';

const power = { ...powerOf(initialState(), new Date()), health: 50000 };
const hero = (classId: HeroSetup['classId']): HeroSetup => ({ power, classId });

/** A line between a phone and the server: each message takes `ms` give or take `jitter`, in order. */
class Line<T> {
  private q: { at: number; m: T }[] = [];
  private last = 0;
  constructor(
    private ms: number,
    private jitter: number,
    private rnd: () => number,
  ) {}
  send(now: number, m: T) {
    this.last = Math.max(this.last, now + this.ms + (this.rnd() * 2 - 1) * this.jitter);
    this.q.push({ at: this.last, m });
  }
  take(now: number): T[] {
    const out: T[] = [];
    while (this.q.length && this.q[0].at <= now) out.push(this.q.shift()!.m);
    return out;
  }
}

const CLASSES: HeroSetup['classId'][] = ['warrior', 'archer', 'mage'];

/** Phones (two, or `n`) and the server for `seconds`, on a slow uneven line. Each walks a square,
    one after the other. */
function play(seconds: number, ms: number, jitter: number, fast = 1.004, n = 2) {
  const rnd = seeded(5);
  const users = ['ana', 'ben', 'cy'].slice(0, n);
  const room = new Room(users, 0, 3);
  users.forEach((u, i) => room.join(u, hero(CLASSES[i]), 0));
  const start = room.begin();
  const phones = users.map((_, me) => ({ f: new Follower(runFromStart(start, me), me), up: new Line<Input[] & { seq: number }[]>(ms, jitter, rnd), down: new Line<string>(ms, jitter, rnd), acc: 0 }));
  const stick = (t: number): Input => {
    const leg = Math.floor(t / 900) % 5;
    return [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 0 }][leg] as Input;
  };
  const out = { fix: [] as number[], glide: [] as number[], seen: [] as number[], moved: [] as number[] };
  let serverAcc = 0,
    steps = 0,
    lastSeen: { x: number; y: number } | null = null;
  const frame = 1000 / 60;
  for (let now = 0; now < seconds * 1000; now += frame) {
    // The server: steps on its own clock, sends a run every 3 steps.
    serverAcc += frame;
    while (serverAcc >= frame * fast) {
      serverAcc -= frame * fast;
      for (const [i, p] of phones.entries()) for (const m of p.up.take(now)) room.take(users[i], { t: 'in', steps: m as never });
      const ana = room.run!.party[0],
        was = { x: ana.x, y: ana.y, room: room.run!.room };
      room.tick(now / 1000);
      // How far Ana really moves in a step (a cleared room lets everyone walk faster).
      if (room.run!.room === was.room) out.moved.push(Math.hypot(ana.x - was.x, ana.y - was.y));
      if (++steps % 3 === 0) {
        const s = room.snapshot();
        for (const p of phones) p.down.send(now, s);
      }
    }
    // Each phone: a frame.
    for (const [i, p] of phones.entries()) {
      const was = { x: p.f.run.hero.x, y: p.f.run.hero.y };
      const texts = p.down.take(now);
      p.f.take(texts, now);
      if (texts.length) out.fix.push(Math.hypot(p.f.run.hero.x - was.x, p.f.run.hero.y - was.y));
      p.acc += frame;
      while (p.acc >= frame) {
        p.acc -= frame;
        // The others walk the square too, a little later.
        p.f.press({ ...stick(now + 450 * i), ability: false });
      }
      const sent = p.f.outgoing(now);
      if (sent) p.up.send(now, sent as never);
      p.f.place(now);
      out.glide.push(Math.hypot(p.f.off.x, p.f.off.y));
      // Ben's phone: how far Ana is drawn to move from one frame to the next.
      if (i === 1) {
        const a = p.f.run.party.find((h) => h.id === 0)!;
        if (lastSeen) out.seen.push(Math.hypot(a.x - lastSeen.x, a.y - lastSeen.y));
        lastSeen = { x: a.x, y: a.y };
      }
    }
  }
  return { out, room, phones };
}

const pct = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * q)];

describe('following a live run', () => {
  it('keeps your hero where you put it, on a slow uneven line', () => {
    const { out } = play(20, 70, 30);
    // What a run from the server moves your hero by: almost always nothing to see.
    expect(pct(out.fix, 0.9)).toBeLessThan(1);
    // What's drawn off where the rules have you, while that glides away.
    expect(pct(out.glide, 0.99)).toBeLessThan(10);
  });

  it("draws a friend gliding, not jumping 20 times a second", () => {
    const { out } = play(20, 70, 30);
    const speed = Math.max(...out.seen.slice(200, 260));
    // Each frame Ana moves about the same small way, never a big jump (a room change aside).
    expect(pct(out.seen, 0.98)).toBeLessThan(speed * 1.2);
  });

  it('moves your own hero at once, whichever place you have in the run', () => {
    const room = new Room(['ana', 'ben'], 0, 3);
    room.join('ana', hero('warrior'), 0);
    room.join('ben', hero('archer'), 0);
    const f = new Follower(runFromStart(room.begin(), 1), 1),
      ana = f.run.party.find((h) => h.id === 0)!,
      from = { me: f.run.hero.x, ana: ana.x };
    for (let i = 0; i < 10; i++) f.press({ x: 1, y: 0, ability: false });
    expect(f.run.hero.id).toBe(1);
    expect(f.run.hero.x).toBeGreaterThan(from.me + 10);
    expect(ana.x).toBe(from.ana);
  });

  it('shows your own moves when you press, not again when the server sends them', () => {
    const room = new Room(['ana', 'ben'], 0, 3);
    room.join('ana', hero('warrior'), 0);
    room.join('ben', hero('archer'), 0);
    const f = new Follower(runFromStart(room.begin(), 0), 0);
    const now = f.press({ x: 0, y: 1, ability: true }, 0);
    expect(now.some((e) => e.type === 'ability')).toBe(true);
    room.take('ana', { t: 'in', steps: f.outgoing(0)! });
    room.tick(0);
    const later = f.take([room.snapshot()], 120);
    expect(later.some((e) => e.type === 'ability')).toBe(false);
    // And it timed the line: pressed at 0, played by the server by 120.
    expect(f.ping).toBe(120);
  });

  it('stays smooth with three phones', () => {
    const { out } = play(20, 70, 30, 1.004, 3);
    expect(pct(out.fix, 0.9)).toBeLessThan(1);
    expect(pct(out.glide, 0.99)).toBeLessThan(10);
    // A friend is drawn moving no faster than the rules ever move them in a step.
    expect(pct(out.seen, 0.98)).toBeLessThan(Math.max(...out.moved) * 1.2);
  });

  it('gives each phone its own end of the run, not the leader\'s', () => {
    const room = new Room(['ana', 'ben'], 0, 3);
    room.join('ana', hero('warrior'), 0);
    room.join('ben', hero('archer'), 0);
    const f = new Follower(runFromStart(room.begin(), 1), 1),
      server = room.run!;
    server.party[0].kills = 7;
    server.party[0].mats = { thread: 3 };
    server.party[1].kills = 2;
    server.party[1].gear.bag.push({ ...server.party[0].gear.worn.weapon!, id: 'bens', starter: false });
    winNow(server);
    f.take([room.snapshot()], 0);
    const mine = overFor(f.run, f.run.hero);
    expect(f.run.over!.kills).toBe(7);
    expect(mine.won).toBe(true);
    expect(mine.kills).toBe(2);
    expect(mine.mats).toBeUndefined();
    expect(mine.gear.bag.map((it) => it.id)).toEqual(['bens']);
  });

  it('asks you to pick only what the server asks, and keeps a friend\'s chest theirs', () => {
    const room = new Room(['ana', 'ben'], 0, 3);
    room.join('ana', hero('warrior'), 0);
    room.join('ben', hero('archer'), 0);
    const start = room.begin(),
      ana = new Follower(runFromStart(start, 0), 0),
      ben = new Follower(runFromStart(start, 1), 1),
      server = room.run!;
    // Ana's phone walks onto a chest the server doesn't have yet: no card of its own making.
    ana.run.chest = { x: ana.run.hero.x, y: ana.run.hero.y, opened: false };
    ana.press({ x: 0, y: 0, ability: false });
    expect(ana.run.hero.relicOffer).toBeNull();
    // The server opens it for Ana: her phone gets the server's card, Ben's hears nothing of it.
    server.party[1].x += 200;
    server.chest = { x: server.party[0].x, y: server.party[0].y, opened: false };
    room.tick(0);
    const s = room.snapshot(),
      forAna = ana.take([s], 50),
      forBen = ben.take([s], 50);
    expect(ana.run.hero.relicOffer).toEqual(server.party[0].relicOffer);
    expect(ana.run.hero.relicOffer).not.toBeNull();
    expect(forAna.some((e) => e.type === 'chest')).toBe(true);
    expect(forBen.some((e) => e.type === 'chest')).toBe(false);
    expect(ben.run.hero.relicOffer).toBeNull();
  });

  it('draws a friend walking, not floating', () => {
    const { phones } = play(0.7, 70, 30);
    // Ana is on the first leg of her square: on Ben's phone she's drawn walking.
    const ana = phones[1].f.run.party.find((h) => h.id === 0)!;
    expect(Math.hypot(ana.vx, ana.vy)).toBeGreaterThan(100);
  });

  it('ends up where the server has you', () => {
    const { room, phones } = play(8.8, 70, 30);
    const server = room.run!.party[0],
      mine = phones[0].f.run.hero;
    // Ana stands still for the last part of the square: same place on both.
    expect(Math.hypot(server.x - mine.x, server.y - mine.y)).toBeLessThan(2);
  });
});
