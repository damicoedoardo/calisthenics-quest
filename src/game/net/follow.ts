import { byOf, heard, stepOwn, type GameEvent, type Input, type Run } from '../dungeon/engine';
import { applySnapshot, type Press } from './wire';

/* A phone's side of a live run, without the drawing (the scene in src/game/dungeon/scene.ts draws
   it): the server's runs put in as they come, your own steps played ahead of them so your hero
   answers at once, and everyone else drawn a little in the past, between two runs the server sent,
   so they glide instead of jumping 20 times a second. Pure, so a test can play it with a slow,
   uneven line (follow.test.ts). */

/** How the phone follows the server (ms, steps, px). */
export const FOLLOW = {
  /** The others are drawn far enough in the past that this share of the server's runs have come
      by then: the line's own unevenness, measured, so a good line waits less and a bumpy one more. */
  cover: 0.9,
  /** How many of the latest runs that share is taken over (20 a second: about 3 s). */
  window: 60,
  /** And this much more, for a phone's frame. */
  marginMs: 12,
  /** A run that's later than that still: the others go on the way they were going for at most
      this long, instead of standing still and then jumping. */
  aheadMs: 120,
  /** How quickly that wait grows when the line gets worse (ms per ms: the others go this much
      slower for a moment), and shrinks when it gets better. */
  growRate: 0.3,
  shrinkRate: 0.05,
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

export class Follower {
  readonly run: Run;
  readonly me: number;
  private seq = 0;
  private pending: Press[] = [];
  private outbox: Press[] = [];
  private sentAt = -1e9;
  private frames: Frame[] = [];
  /** For each of the latest runs, this phone's clock when it came less the server's clock when it
      was played: how late runs come, fast ones and slow ones. */
  private late: number[] = [];
  /** How far behind this phone's clock the others are drawn (ms), on the server's clock: eased
      toward what the line needs (`aim`), never jumped, so they never skip. Null before a run came. */
  private behind: number | null = null;
  private behindAt = 0;
  /** Where each monster was drawn last frame. */
  private shown = new Map<number, [number, number]>();
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
      events.push(...got.events.filter((e) => byOf(e) !== this.me && heard(e, this.me)).map(this.onShown));
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
    return this.step(p)
      .filter((e) => byOf(e) === this.me)
      .map(this.onShown);
  }

  /** A blow lands where the monster is drawn (a moment in the past), not where the rules have it
      now, so the spark and the number sit on it. */
  private onShown = (e: GameEvent): GameEvent => {
    if (e.type !== 'hit' && e.type !== 'kill' && e.type !== 'block' && e.type !== 'pile') return e;
    const at = this.shown.get(e.id);
    return at ? { ...e, x: at[0], y: at[1] } : e;
  };

  /** Your steps to send now, if it's time. */
  outgoing(now: number): Press[] | null {
    if (!this.outbox.length || now - this.sentAt < FOLLOW.sendMs) return null;
    this.sentAt = now;
    return this.outbox.splice(0);
  }

  /** Before drawing, at `now` (ms): the others where they were a moment ago on the server's clock,
      between two of its runs, and your correction glided a little further away. */
  place(now: number) {
    const k = Math.pow(FOLLOW.glideKeep, Math.min(6, (now - this.offAt) / (1000 / 60)));
    this.offAt = now;
    this.off.x *= k;
    this.off.y *= k;
    if (Math.abs(this.off.x) < 0.05) this.off.x = 0;
    if (Math.abs(this.off.y) < 0.05) this.off.y = 0;
    const fs = this.frames;
    if (fs.length < 2 || !this.late.length) return;
    // Ease the wait toward what the line needs now: the others go a touch slower or quicker for a
    // moment, which nobody sees, instead of standing still or skipping.
    const aim = this.aim(),
      dt = Math.min(100, Math.max(0, now - this.behindAt));
    this.behindAt = now;
    if (this.behind === null) this.behind = aim;
    else if (aim > this.behind) this.behind = Math.min(aim, this.behind + dt * FOLLOW.growRate);
    else this.behind = Math.max(aim, this.behind - dt * FOLLOW.shrinkRate);
    const t = now - this.behind;
    let i = fs.length - 2;
    while (i > 0 && fs[i].at > t) i--;
    const a = fs[i],
      b = fs[i + 1],
      gap = Math.max(1, b.at - a.at),
      // Past the newest run (a late one): on the way they were going, for a short while.
      u = Math.max(0, Math.min((t - a.at) / gap, 1 + FOLLOW.aheadMs / gap));
    const put = (key: string, o: { x: number; y: number; vx: number; vy: number }, moving = true) => {
      const p = a.where.get(key),
        q = b.where.get(key);
      if (!p || !q) return;
      o.x = p[0] + (q[0] - p[0]) * u;
      o.y = p[1] + (q[1] - p[1]) * u;
      // How fast they're drawn moving, so a friend walks (and faces) the way they go: this
      // phone's own steps stand them still between the server's runs.
      if (moving) {
        o.vx = (q[0] - p[0]) / (gap / 1000);
        o.vy = (q[1] - p[1]) / (gap / 1000);
      }
    };
    const r = this.run;
    for (const h of r.party) if (h !== r.hero) put(`h${h.id}`, h);
    this.shown.clear();
    for (const f of r.foes) {
      put(`f${f.id}`, f);
      this.shown.set(f.id, [f.x, f.y]);
    }
    for (const s of r.shots) put(`s${s.id}`, s, false);
  }

  /** How far behind the others should be drawn on this line (ms): late enough that most runs
      (`FOLLOW.cover`) have come, plus the gap to the next run and a frame. */
  private aim(): number {
    const sorted = [...this.late].sort((x, y) => x - y),
      slow = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * FOLLOW.cover))],
      fs = this.frames,
      gap = fs.length > 1 ? (fs[fs.length - 1].at - fs[0].at) / (fs.length - 1) : 50;
    return slow + gap + FOLLOW.marginMs;
  }

  /** How much longer than the quickest run ever took the others are drawn behind (ms): the wait
      this phone adds for an uneven line, for developer mode. */
  get behindMs(): number | null {
    return this.behind === null ? null : this.behind - Math.min(...this.late);
  }

  /** One step: only you, as pressed (`stepOwn`). Everyone else stands where the server last had
      them (`place` moves them between its runs), so nothing they do here is a guess that has to be
      taken back, and a replay of many steps stays cheap. */
  private step(p: Press): GameEvent[] {
    const run = this.run;
    // Cards come only from the server: a level, a chest or the stairs guessed here would roll
    // other choices than the server's, and a pick from them would be turned down and asked again.
    const asks = run.party.map((h) => [h.offer, h.relicOffer] as const),
      stairs = run.stairsAsk;
    stepOwn(run, run.hero, p);
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
    const at = r.t * 1000;
    // A run that held still (everyone waits on a card) says nothing new about the line.
    if (this.frames.length && at <= this.frames[this.frames.length - 1].at) {
      this.held = true;
      return;
    }
    // Going again after a hold: the server's clock stood still while this one didn't. Move what was
    // measured by as much, so the hold doesn't read as a slow line.
    if (this.held && this.late.length) {
      const was = [...this.late].sort((x, y) => x - y)[this.late.length >> 1],
        shift = Math.max(0, now - at - was);
      this.late = this.late.map((l) => l + shift);
      if (this.behind !== null) this.behind += shift;
    }
    this.held = false;
    this.late.push(now - at);
    if (this.late.length > FOLLOW.window) this.late.shift();
    this.frames.push({ at, where });
    if (this.frames.length > 16) this.frames.shift();
  }
  private roomAt = '';
  private held = false;
}

/** Which room the run is in (a new one each time you walk through a door). */
const roomOf = (r: Run) => `${r.floor}:${r.room}`;
