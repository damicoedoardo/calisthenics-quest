import { describe, expect, it } from 'vitest';
import { initialState } from '@/lib/game';
import { powerOf, ZONES, zoneByCode } from '@/lib/fog';
import { createRun, heard, stepRun, type HeroSetup } from '../dungeon/engine';
import { botInput } from '../dungeon/bot';
import { NET, Room } from './room';
import { applySnapshot, type Press } from './wire';

const power = powerOf(initialState(), new Date());
const hero = (classId: HeroSetup['classId']): HeroSetup => ({ power: { ...power, health: 5000 }, classId });

/** A two-hero room, begun. */
function twoRoom() {
  const room = new Room(['ana', 'ben'], 0, 11);
  room.join('ana', hero('warrior'), 0);
  room.join('ben', hero('archer'), 1);
  const start = room.begin();
  return { room, start };
}

/** A phone's own copy of the run, as it builds one from the start message. */
const phoneRun = (start: ReturnType<Room['begin']>) => createRun({ ...start.heroes[0], zone: zoneByCode(start.zone)!, seed: start.seed, friends: start.heroes.slice(1) });

describe('a live party run', () => {
  it('waits for the party, or not for long', () => {
    const room = new Room(['ana', 'ben', 'cy'], 0, 1);
    expect(room.join('zed', hero('mage'), 0)).toBe(false);
    room.join('ana', hero('warrior'), 0);
    expect(room.due(5)).toBe(false);
    room.join('ben', hero('archer'), 6);
    expect(room.due(NET.waitSeconds - 1)).toBe(false);
    expect(room.due(NET.waitSeconds)).toBe(true);
    const start = room.begin();
    expect(start.users).toEqual(['ana', 'ben']);
    expect(start.heroes.map((h) => h.classId)).toEqual(['warrior', 'archer']);
    // Too late: the run began without them.
    expect(room.join('cy', hero('monk'), 20)).toBe(false);
  });

  it("plays each hero's own steps, and says which it has played", () => {
    const { room, start } = twoRoom();
    const run = room.run!,
      [a, b] = run.party,
      ax = a.x,
      bx = b.x;
    const steps: Press[] = Array.from({ length: 30 }, (_, i) => ({ seq: i + 1, x: 1, y: 0, ability: false }));
    room.take('ana', { t: 'in', steps: steps.slice(0, NET.steady) });
    for (let i = 0; i < NET.steady; i++) room.tick(i / 60);
    expect(a.x).toBeGreaterThan(ax);
    expect(b.x).toBe(bx);
    const phone = phoneRun(start);
    const { ack } = applySnapshot(phone, room.snapshot(), 1);
    expect(ack).toEqual([NET.steady, 0]);
  });

  it("gives every phone the same run, with you first and everything in its place", () => {
    const { room, start } = twoRoom();
    const run = room.run!;
    for (let i = 0; i < 60 * 30; i++) {
      room.take('ana', { t: 'in', steps: [{ seq: i + 1, ...botInput(run, run.party[0]) }] });
      room.take('ben', { t: 'in', steps: [{ seq: i + 1, ...botInput(run, run.party[1]) }] });
      room.tick(i / 60);
    }
    const text = room.snapshot();
    // Small enough to send 20 times a second (it's compressed on the way, too).
    expect(text.length).toBeLessThan(40_000);
    const phone = phoneRun(start);
    const { events } = applySnapshot(phone, text, 1);
    expect(events.length).toBeGreaterThan(0);
    // Ben's phone: Ben first, the camera on him.
    expect(phone.hero.id).toBe(1);
    expect(phone.party.map((h) => h.id)).toEqual([1, 0]);
    expect(phone.hero.x).toBeCloseTo(run.party[1].x, 2);
    expect(phone.foes.map((f) => f.id)).toEqual(run.foes.map((f) => f.id));
    if (run.boss) expect(phone.foes).toContain(phone.boss);
    for (const s of phone.shots) expect(phone.party).toContain(s.by);
    // And it can look ahead on its own until the next one comes.
    for (let i = 0; i < 6; i++) stepRun(phone, phone.party.map(() => ({ x: 0, y: 0, ability: false })));
  });

  it("counts a step played before it came, and passes it over when it comes", () => {
    const { room } = twoRoom();
    const a = room.run!.party[0];
    room.take('ana', { t: 'in', steps: [{ seq: 1, x: 1, y: 0, ability: false }] });
    room.tick(0);
    const x1 = a.x;
    // Step 2 is late: played with the stick as held, and counted.
    room.tick(1 / 60);
    expect(a.x).toBeGreaterThan(x1);
    // It comes, with step 3 and a button: 2 is passed over, its button goes with 3.
    room.take('ana', { t: 'in', steps: [{ seq: 2, x: 1, y: 0, ability: true }, { seq: 3, x: 1, y: 0, ability: false }] });
    room.tick(2 / 60);
    expect(room.run!.party[0].x).toBeGreaterThan(x1);
    const phone = phoneRun(room.started!);
    expect(applySnapshot(phone, room.snapshot(), 0).ack[0]).toBe(3);
  });

  it('plays a phone that went away with the bot for a while, so the run goes on', () => {
    const { room } = twoRoom();
    room.leave('ben', 0);
    const b = room.run!.party[1],
      from = { x: b.x, y: b.y };
    for (let i = 0; i < 60 * (NET.goneSeconds - 1); i++) room.tick(i / 60);
    expect(Math.hypot(b.x - from.x, b.y - from.y)).toBeGreaterThan(20);
    expect(room.here).toEqual(['ana']);
    // Back again: the same hero, and the run goes on past the wait.
    expect(room.join('ben', hero('archer'), NET.goneSeconds - 1)).toBe(true);
    expect(room.placeOf('ben')).toBe(1);
    room.tick(NET.goneSeconds + 5);
    expect(room.run!.over).toBeNull();
  });

  it('ends the run for everyone when a phone stays gone', () => {
    const { room } = twoRoom();
    room.leave('ben', 0);
    room.tick(NET.goneSeconds - 0.1);
    expect(room.run!.over).toBeNull();
    room.tick(NET.goneSeconds);
    expect(room.run!.over?.why).toBe('left');
    expect(room.done).toBe(true);
  });

  it('tells only the hero waiting on the stairs that everyone has to be there, once a run', () => {
    const { room } = twoRoom();
    const run = room.run!,
      [ana, ben] = run.party;
    ben.x += 200;
    const told = () => run.events.filter((e) => e.type === 'say' && e.text.startsWith('Waiting for your party'));
    run.stairs = { x: ana.x, y: ana.y };
    room.tick(0);
    expect(told()).toHaveLength(1);
    expect(heard(told()[0], 0)).toBe(true);
    expect(heard(told()[0], 1)).toBe(false);
    // Off the stairs and back on: not again.
    run.events = [];
    run.stairs = { x: ana.x + 300, y: ana.y };
    room.tick(0.1);
    run.stairs = { x: ana.x, y: ana.y };
    room.tick(0.2);
    expect(told()).toHaveLength(0);
  });

  it('ends the run for everyone when someone leaves it', () => {
    const { room } = twoRoom();
    room.tick(0);
    room.take('ben', { t: 'quit' });
    expect(room.run!.over?.why).toBe('left');
    expect(room.run!.events.some((e) => e.type === 'say')).toBe(true);
  });

  it("doesn't hold the run forever on a pick", () => {
    const { room } = twoRoom();
    const run = room.run!,
      h = run.party[0];
    h.offer = { choices: ['power', 'haste', 'multi'] } as never;
    room.tick(0);
    expect(h.offer).not.toBeNull();
    room.tick(NET.pickSeconds + 0.1);
    expect(h.offer).toBeNull();
  });

  it('builds the same run from the start message as the server did', () => {
    const { room, start } = twoRoom();
    const phone = phoneRun(start);
    expect(phone.map).toEqual(room.run!.map);
    expect(ZONES[0].id).toBe(start.zone);
  });
});
