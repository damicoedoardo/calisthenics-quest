import { botInput } from '../dungeon/bot';
import { createRun, dropFromBag, extraTurn, leaveRun, pick, pickRelic, stepRun, takeOff, takeStairs, wear, type Hero, type HeroSetup, type Input, type Run } from '../dungeon/engine';
import { BOT_PICKS } from '../rules';
import { zoneByCode } from '@/lib/fog';
import { snapshot, type Press, type Start, type Up } from './wire';

/* One party's live run on the game server: who's in, what each has pressed, and the one real run.
   The server (play/server.ts) only moves messages; every rule is here, and tested without sockets.
   A hero whose phone drops (locked, a bad line) is played by the bot for a little while; if it
   isn't back by then, or its player leaves the run, the run ends for the whole party. */

interface Seat {
  user: string;
  hero: HeroSetup;
  /** The phone is connected. */
  online: boolean;
  /** Steps pressed and not yet played. */
  queue: Press[];
  /** The last of their steps the run has played. */
  ack: number;
  /** Since when their pick has waited (real seconds), or null. */
  askedAt: number | null;
  /** Since when the phone has been gone in a run (real seconds), or null. */
  offSince: number | null;
}

/** Buttons pressed in a step that's dropped (a phone far ahead) go with the next one. */
function carry(into: Press, g: Press) {
  into.ability ||= g.ability;
  into.skill ||= g.skill;
  into.final ||= g.final;
  into.dodge ||= g.dodge;
  if (g.lock !== undefined && into.lock === undefined) into.lock = g.lock;
}

/** A hero whose next step hasn't come: no turn this step. */
const WAIT: Input = { x: 0, y: 0, ability: false, wait: true };

/** How the live run waits on people (real seconds), and how far ahead a phone may run (steps). */
export const NET = {
  /** After the first phone walks in, how long the rest have to join before the run starts without them. */
  waitSeconds: 15,
  /** A pick or the stairs hold the run for everyone; past this, the bot picks (deeper, for the stairs). */
  pickSeconds: 15,
  /** Steps kept from a phone that's ahead of the server (1 s); past it the oldest go, buttons kept. */
  maxQueue: 60,
  /** Steps that may wait before the hero gets an extra turn to catch up. */
  steady: 3,
  /** A phone gone this long in a run (real seconds) ends it for everyone: they aren't coming back. */
  goneSeconds: 20,
};

/** What the others are told when someone leaves. */
const LEFT = 'A friend left the run, so it ends here for everyone. You keep what you carry.';

export class Room {
  readonly users: string[];
  readonly zone: number;
  readonly seed: number;
  private seats = new Map<string, Seat>();
  private firstAt: number | null = null;
  private order: string[] = [];
  run: Run | null = null;
  /** How the run began, for a phone that comes back to it. */
  started: Start | null = null;
  private stairsAt: number | null = null;

  /** `users`: the party's members when the leader started, in the party's order. */
  constructor(users: string[], zone: number, seed: number) {
    this.users = users;
    this.zone = zone;
    this.seed = seed;
  }

  /** A phone says hello. Before the start anyone in the party sits down; after it, only a hero
      already in the run comes back. */
  join(user: string, hero: HeroSetup, now: number): boolean {
    if (!this.users.includes(user)) return false;
    const seat = this.seats.get(user);
    if (this.run && !seat) return false;
    if (seat) {
      seat.online = true;
      seat.offSince = null;
      seat.queue = [];
      // A phone that starts the run again numbers its steps from 1 again.
      seat.ack = 0;
      if (!this.run) seat.hero = hero;
    } else this.seats.set(user, { user, hero, online: true, queue: [], ack: 0, askedAt: null, offSince: null });
    this.firstAt ??= now;
    return true;
  }

  /** A phone's line closed, at `now` (real seconds). In a run the bot plays them until they're back. */
  leave(user: string, now = 0) {
    const seat = this.seats.get(user);
    if (!seat) return;
    if (this.run) {
      seat.online = false;
      seat.offSince ??= now;
    } else this.seats.delete(user);
  }

  get here(): string[] {
    return this.users.filter((u) => this.seats.get(u)?.online);
  }

  /** Everyone is here, or the wait is over and at least one is: time to begin. */
  due(now: number): boolean {
    if (this.run || this.firstAt === null || this.here.length === 0) return false;
    return this.here.length === this.users.length || now - this.firstAt >= NET.waitSeconds;
  }

  /** Begin the run with whoever is here, in the party's order. */
  begin(): Start {
    this.order = this.users.filter((u) => this.seats.has(u));
    const heroes = this.order.map((u) => this.seats.get(u)!.hero),
      zone = zoneByCode(this.zone);
    if (!zone) throw new Error(`No zone ${this.zone}`);
    this.run = createRun({ ...heroes[0], zone, seed: this.seed, friends: heroes.slice(1) });
    this.started = { zone: this.zone, seed: this.seed, heroes, users: this.order };
    return this.started;
  }

  /** Your place in the run (its order), or -1. */
  placeOf(user: string): number {
    return this.order.indexOf(user);
  }

  /** What a phone sent, besides hello. */
  take(user: string, m: Exclude<Up, { t: 'hello' }>) {
    const seat = this.seats.get(user),
      run = this.run,
      h = run?.party[this.placeOf(user)];
    if (!seat || !run || !h) return;
    switch (m.t) {
      case 'in':
        for (const p of m.steps.slice(-NET.maxQueue)) {
          if (p.seq > seat.ack && !seat.queue.some((q) => q.seq === p.seq)) seat.queue.push(p);
        }
        // A phone far ahead of the server: keep the newest steps, and any button pressed in the rest.
        if (seat.queue.length > NET.maxQueue) {
          const gone = seat.queue.splice(0, seat.queue.length - NET.maxQueue);
          for (const g of gone) carry(seat.queue[0], g);
        }
        break;
      case 'pick':
        if (h.offer?.choices.includes(m.id)) pick(run, m.id, h);
        break;
      case 'relic':
        if (h.relicOffer?.includes(m.id)) pickRelic(run, m.id, h);
        break;
      case 'stairs':
        this.stairs(m.choice);
        break;
      case 'wear':
        wear(run, m.id, h);
        break;
      case 'takeOff':
        takeOff(run, m.slot, h);
        break;
      case 'drop':
        dropFromBag(run, m.id, h);
        break;
      case 'quit':
        leaveRun(run, LEFT);
        break;
    }
  }

  private stairs(choice: 'deeper' | 'leave' | 'stay') {
    if (!this.run) return;
    this.stairsAt = null;
    takeStairs(this.run, choice);
  }

  /** One engine step for everyone, at `now` (real seconds). */
  tick(now: number) {
    const run = this.run;
    if (!run || run.over) return;
    for (const s of this.seats.values())
      if (s.offSince !== null && now - s.offSince >= NET.goneSeconds) return leaveRun(run, LEFT);
    const inputs = run.party.map((h, i) => this.inputFor(this.seats.get(this.order[i])!, h));
    stepRun(run, inputs);
    // A phone a little ahead (its steps came in a bunch, or its clock runs fast): one more turn of
    // its own, so its steps don't wait long.
    run.party.forEach((h, i) => {
      const seat = this.seats.get(this.order[i])!;
      if (!seat.online || seat.queue.length <= NET.steady) return;
      const p = seat.queue.shift()!;
      seat.ack = p.seq;
      const { seq: _, ...input } = p;
      extraTurn(run, h, input);
    });
    this.waitOnPicks(now);
  }

  /** The next of this hero's steps, in order, or standing still when it hasn't come yet. A step
      is never guessed and never passed over: the server plays exactly what the phone played, so the
      phone (which already moved you) never has to take a move back. A step that comes late is
      played late, and a phone a little ahead gets an extra turn (`tick`). */
  private inputFor(seat: Seat, h: Hero): Input {
    if (!seat.online) return botInput(this.run!, h);
    const p = seat.queue.shift();
    if (!p) return WAIT;
    seat.ack = p.seq;
    const { seq: _, ...input } = p;
    return input;
  }

  /** A pick holds the run for everyone, so it can't wait long: a phone that's gone, or slow, gets
      the bot's pick. The stairs likewise go deeper. (The run's own clock stands still meanwhile.) */
  private waitOnPicks(t: number) {
    const run = this.run!;
    run.party.forEach((h, i) => {
      const seat = this.seats.get(this.order[i])!;
      if (!h.offer && !h.relicOffer) {
        seat.askedAt = null;
        return;
      }
      seat.askedAt ??= t;
      if (seat.online && t - seat.askedAt < NET.pickSeconds) return;
      if (h.offer) pick(run, BOT_PICKS.find((id) => h.offer!.choices.includes(id)) ?? h.offer.choices[0], h);
      if (h.relicOffer) pickRelic(run, h.relicOffer[0], h);
      seat.askedAt = null;
    });
    if (run.stairsAsk) {
      this.stairsAt ??= t;
      if (this.here.length === 0 || t - this.stairsAt >= NET.pickSeconds) this.stairs('deeper');
    }
  }

  /** The run now, for every phone; the events go out with it once. */
  snapshot(): string {
    const run = this.run!,
      text = snapshot(
        run,
        run.party.map((_, i) => this.seats.get(this.order[i])!.ack),
      );
    run.events = [];
    return text;
  }

  /** The run is over and everyone has been told, or nobody is left. */
  get done(): boolean {
    return !!this.run?.over || (!!this.run && this.here.length === 0);
  }
}
