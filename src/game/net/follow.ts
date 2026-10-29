import { byOf, heard, stepRun, type GameEvent, type Input, type Run } from '../dungeon/engine';
import { applySnapshot, type Press } from './wire';

/* A phone's side of a live run, without the drawing (the scene in src/game/dungeon/scene.ts draws
   it): the server's runs put in as they come, your own steps played ahead of them so your hero
   answers at once, and everyone else drawn a little in the past, between two runs the server sent,
   so they glide instead of jumping 20 times a second. Pure, so a test can play it with a slow,
   uneven line (follow.test.ts). */

/** How the phone follows the server (ms, steps, px). */
export const FOLLOW = {
  /** The others are drawn this far in the past: two of the server's runs, so one that comes late
      still has a pair to glide between. */
  behindMs: 110,
  /** Your steps go to the server this often. */
  sendMs: 50,
  /** At most this many of your steps wait for the server; older ones are given up. */
  pending: 40,
  /** A correction to your own hero smaller than this glides away; a bigger one jumps (a door, a dash). */
  glidePx: 60,
  /** Share of a gliding correction left after each 1/60 s. */
  glideKeep: 0.82,
};

/** Where each moving thing was in one run from the server, and when (the run's own clock, ms). */
interface Frame {
  at: number;
  /** By kind and id: 'h' heroes, 'f' monsters, 's' shots. */
  where: Map<string, [number, number]>;
}

const still: Input = { x: 0, y: 0, ability: false };

export class Follower {
  readonly run: Run;
  readonly me: number;
  private seq = 0;
  private pending: Press[] = [];
  private outbox: Press[] = [];
  private sentAt = -1e9;
  private frames: Frame[] = [];
  /** This phone's clock less the server run's clock, as fast as a run has come: runs that come late
      are still placed when they happened, so the others glide evenly over an uneven line. */
  private lag: number | null = null;
  /** How far your hero is drawn from where the rules have it, while a correction glides away. */
  readonly off = { x: 0, y: 0 };
  private offAt = 0;
  /** When each step still waiting was pressed (ms), to time the line. */
  private pressedAt = new Map<number, number>();
  /** From pressing to the server playing it, smoothed (ms), or null before the first answer. */
  ping: number | null = null;

  constructor(run: Run, me: number) {
    this.run = run;
    this.me = me;
  }

  /** Put in the runs the server sent (oldest first), at `now` (ms). Returns their events to play. */
  take(texts: string[], now: number): GameEvent[] {
    if (!texts.length) return [];
    const run = this.run,
      was = { x: run.hero.x, y: run.hero.y, room: roomOf(run) },
      events: GameEvent[] = [];
    let ack = 0;
    for (const t of texts) {
      const got = applySnapshot(run, t, this.me);
      // Your own moves were played when you pressed them (`press`): not again. A friend's own
      // news (their item, their chest) is theirs.
      events.push(...got.events.filter((e) => byOf(e) !== this.me && heard(e, this.me)));
      ack = got.ack[this.me] ?? 0;
    }
    const at = this.pressedAt.get(ack);
    if (at !== undefined) this.ping = this.ping === null ? now - at : this.ping + (now - at - this.ping) * 0.2;
    for (const k of this.pressedAt.keys()) if (k <= ack) this.pressedAt.delete(k);
    this.remember(now);
    // Your steps the server hasn't played yet, again, on top of what it sent.
    this.pending = this.pending.filter((p) => p.seq > ack);
    for (const p of this.pending) this.step(p);
    // The rules moved you a little: draw you where you were and let it glide. A big move (a new
    // room, a dash the server saw first) is drawn as it is.
    const dx = was.x - run.hero.x,
      dy = was.y - run.hero.y;
    if (was.room === roomOf(run) && Math.hypot(this.off.x + dx, this.off.y + dy) < FOLLOW.glidePx) {
      this.off.x += dx;
      this.off.y += dy;
    } else this.off.x = this.off.y = 0;
    return events;
  }

  /** One of your steps, pressed at `now` (ms): played here at once, and queued for the server.
      Returns your own moves it made (a swing, an ability, a dodge) to show now, not a line later. */
  press(input: Input, now = 0): GameEvent[] {
    const p: Press = { seq: ++this.seq, ...input };
    this.pending.push(p);
    this.outbox.push(p);
    this.pressedAt.set(p.seq, now);
    if (this.pending.length > FOLLOW.pending) this.pressedAt.delete(this.pending.shift()!.seq);
    return this.step(p).filter((e) => byOf(e) === this.me);
  }

  /** Your steps to send now, if it's time. */
  outgoing(now: number): Press[] | null {
    if (!this.outbox.length || now - this.sentAt < FOLLOW.sendMs) return null;
    this.sentAt = now;
    return this.outbox.splice(0);
  }

  /** Before drawing, at `now` (ms): the others where they were `behindMs` ago, between two of the
      server's runs, and your correction glided a little further away. */
  place(now: number) {
    const k = Math.pow(FOLLOW.glideKeep, Math.min(6, (now - this.offAt) / (1000 / 60)));
    this.offAt = now;
    this.off.x *= k;
    this.off.y *= k;
    if (Math.abs(this.off.x) < 0.05) this.off.x = 0;
    if (Math.abs(this.off.y) < 0.05) this.off.y = 0;
    if (this.lag === null) return;
    const t = now - this.lag - FOLLOW.behindMs,
      fs = this.frames;
    if (fs.length < 2) return;
    let i = fs.length - 2;
    while (i > 0 && fs[i].at > t) i--;
    const a = fs[i],
      b = fs[i + 1],
      u = Math.max(0, Math.min(1, (t - a.at) / Math.max(1, b.at - a.at)));
    const dt = Math.max(1, b.at - a.at) / 1000;
    const put = (key: string, o: { x: number; y: number; vx: number; vy: number }, moving = true) => {
      const p = a.where.get(key),
        q = b.where.get(key);
      if (!p || !q) return;
      o.x = p[0] + (q[0] - p[0]) * u;
      o.y = p[1] + (q[1] - p[1]) * u;
      // How fast they're drawn moving, so a friend walks (and faces) the way they go: this
      // phone's own steps stand them still between the server's runs.
      if (moving) {
        o.vx = (q[0] - p[0]) / dt;
        o.vy = (q[1] - p[1]) / dt;
      }
    };
    const r = this.run;
    for (const h of r.party) if (h !== r.hero) put(`h${h.id}`, h);
    for (const f of r.foes) put(`f${f.id}`, f);
    for (const s of r.shots) put(`s${s.id}`, s, false);
  }

  /** One step: you as pressed; the others stand where the server last had them (`place` moves
      them between its runs), so nothing they do here is a guess that has to be taken back. */
  private step(p: Press): GameEvent[] {
    const run = this.run,
      // The engine reads each hero's input by its id (its place in the server's run), not by
      // where it stands in this phone's party (you're first here).
      inputs = run.party.map(() => still);
    inputs[this.me] = p;
    // Cards come only from the server: a level, a chest or the stairs guessed here would roll
    // other choices than the server's, and a pick from them would be turned down and asked again.
    const asks = run.party.map((h) => [h.offer, h.relicOffer] as const),
      stairs = run.stairsAsk;
    stepRun(run, inputs);
    run.party.forEach((h, i) => ([h.offer, h.relicOffer] = asks[i]));
    run.stairsAsk = stairs;
    return run.events.splice(0);
  }

  /** Where everything that moves was in the run just put in. A new room starts the memory over. */
  private remember(now: number) {
    const r = this.run,
      where = new Map<string, [number, number]>();
    for (const h of r.party) where.set(`h${h.id}`, [h.x, h.y]);
    for (const f of r.foes) where.set(`f${f.id}`, [f.x, f.y]);
    for (const s of r.shots) where.set(`s${s.id}`, [s.x, s.y]);
    if (this.roomAt !== roomOf(r)) this.frames = [];
    this.roomAt = roomOf(r);
    const at = r.t * 1000,
      lag = now - at;
    // The quickest a run has come sets the clock; it drifts up slowly, so a run that held still
    // (a pick) or a line that got slower is followed again.
    this.lag = this.lag === null || lag < this.lag ? lag : this.lag + (lag - this.lag) * 0.02;
    if (this.frames.length && at <= this.frames[this.frames.length - 1].at) return;
    this.frames.push({ at, where });
    if (this.frames.length > 8) this.frames.shift();
  }
  private roomAt = '';
}

/** Which room the run is in (a new one each time you walk through a door). */
const roomOf = (r: Run) => `${r.floor}:${r.room}`;
