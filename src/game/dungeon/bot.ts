import { attackOf, clamp, RANGE } from '../rules';
import { BARREL, CHARGE, createRun, GALE, LIGHT, ROOM, zoneDungeon, inRect, spikeState, stepRun, TOMORROW_REACH, type CellKind, type Door, type Input, type Rect, type Run, type RunEnd, type RunSetup } from './engine';

/* The bot: a steady, careful player, not a great one. It sidesteps shots on course to hit it,
   keeps its class's distance from monsters (a sword goes close, the rest stay back), plays each
   boss by its rule, explores the floor's map room by room once a room is clear (then takes the
   stairs), and uses the ability when it
   helps. It reads the ground too: around pillars, out of water and rising spikes, away from
   barrels, bombs and a ram's line, to the shrine when hurt. When a shot it sees is about to land
   anyway, it dodges through it. It plays the same engine as a person: the same input, the same
   steps. */

/** The way out of a rectangle, from a point in it: toward its nearest edge. */
function outOf(q: Rect, x: number, y: number): [number, number] {
  const l = x - q.x,
    r = q.x + q.w - x,
    t = y - q.y,
    b = q.y + q.h - y,
    m = Math.min(l, r, t, b);
  return m === l ? [-1, 0] : m === r ? [1, 0] : m === t ? [0, -1] : [0, 1];
}

const SEE = 0.7;
/** The bot dodges a shot it sees will land within this long (s). */
const DODGE_SEE = 0.18;
/** A person needs this long (s) to notice a new shot; the bot doesn't see it before. */
export const REACTION = 0.25;
/** Share of shots a person keeps track of in a busy room; the rest the bot doesn't see coming. */
export const ATTENTION = { share: 0.75 };

/** Whether this shot is one the bot watches: fixed per shot, so it doesn't flicker. */
const noticed = (id: number) => ((Math.imul(id, 2654435761) >>> 0) % 1000) / 1000 < ATTENTION.share;

/** Where the bot goes when a room is clear: the nearest room it hasn't been in (a shrine when
    hurt, an elite room when healthy, a chest before a plain fight), or the stairs once it has seen
    most of the floor (or is badly hurt). The door on the way there, or null for the stairs in this room. */
function route(run: Run): Door | null {
  const { cells, at } = run.map,
    hp = run.hp / run.maxHp,
    isEnd = (k: CellKind) => k === 'stairs' || k === 'warden' || k === 'boss',
    rank = (k: CellKind) => (k === 'rest' ? (hp < 0.5 ? 3 : -1) : k === 'elite' ? (hp > 0.75 ? 1 : -2) : k === 'treasure' ? 1.5 : 0);
  // Doors from here to every room it knows, walking only through rooms it has been in.
  const first = new Map<number, Door>(),
    far = new Map<number, number>([[at, 0]]),
    todo = [at];
  while (todo.length) {
    const id = todo.shift()!;
    if (id !== at && !cells[id].visited) continue;
    for (const [side, to] of Object.entries(cells[id].links)) {
      if (to === undefined || far.has(to)) continue;
      far.set(to, far.get(id)! + 1);
      first.set(to, id === at ? run.doors.find((d) => d.side === side)! : first.get(id)!);
      todo.push(to);
    }
  }
  const end = cells.find((c) => isEnd(c.kind) && c.seen),
    seen = cells.filter((c) => c.visited).length / cells.length,
    open = cells.filter((c) => c.seen && !c.visited && !isEnd(c.kind) && far.has(c.id)).sort((a, b) => far.get(a.id)! - rank(a.kind) - (far.get(b.id)! - rank(b.kind))),
    // Badly hurt, it looks for a shrine first, then makes for the stairs.
    next = hp < 0.4 ? (open.find((c) => c.kind === 'rest') ?? (end ? undefined : open[0])) : open[0];
  if (end && (seen >= 0.6 || !next)) return end.id === at ? null : (first.get(end.id) ?? null);
  return next ? first.get(next.id)! : (run.doors[0] ?? null);
}

/** Just past a door, so walking there takes you through it. */
function beyond(run: Run, d: Door): [number, number] {
  return d.side === 'e' ? [d.x, -20] : d.side === 'w' ? [d.x, run.area.h + 20] : d.side === 'n' ? [-20, d.y] : [run.area.w + 20, d.y];
}

/** After this long (s) in a room without hurting anything, the bot walks right up to the monsters:
    keeping its distance can leave it shooting into a pillar forever while a monster hides behind. */
const STALL = 20;
const progress = new WeakMap<Run, { room: string; hp: number; at: number }>();

/** Seconds in this room since anything got hurt (or since the room cleared). */
function idle(run: Run): number {
  const room = `${run.floor}.${run.map.at}.${run.climb}`,
    hp = run.foes.reduce((n, f) => n + (f.alive ? f.hp : 0), 0) + run.kills * 1e4,
    p = progress.get(run);
  if (!p || p.room !== room || p.hp !== hp) {
    progress.set(run, { room, hp, at: run.t });
    return 0;
  }
  return run.t - p.at;
}

export function botInput(run: Run): Input {
  const h = run.hero,
    melee = attackOf(run.setup.classId) === 'slash',
    still = idle(run) > STALL,
    stuck = still && !run.cleared,
    // Lingering in a cleared room: stop waiting for spikes to drop and just walk through, as a
    // person would (two patches out of step can keep a careful walker waiting forever).
    linger = still && run.cleared,
    now = run.t;
  let x = 0,
    y = 0,
    danger = 0,
    // Something about to land that a step won't beat: worth the dodge.
    imminent = false;

  // Shots on course to hit within SEE seconds: step off their line. In the fog, only the ones
  // close enough to see.
  const see = Math.min(220, zoneDungeon(run.setup.zone).sight ?? run.dim ?? 220);
  for (const b of run.bullets) {
    if (now - b.born < REACTION || !noticed(b.id)) continue;
    const rx = h.x - b.x,
      ry = h.y - b.y,
      v2 = b.vx * b.vx + b.vy * b.vy;
    if (rx * rx + ry * ry > see * see || !v2) continue;
    const tc = (rx * b.vx + ry * b.vy) / v2;
    if (tc < 0 || tc > SEE) continue;
    const cx = b.x + b.vx * tc - h.x,
      cy = b.y + b.vy * tc - h.y,
      miss = Math.hypot(cx, cy),
      room = b.r + 10 + 12;
    if (miss > room) continue;
    if (tc < DODGE_SEE && miss < b.r + 10) imminent = true;
    const w = (1 - tc / SEE) * 3 * (1 - miss / room + 0.3);
    // Away from where it passes; if dead on, sideways to its path.
    let ax = -cx,
      ay = -cy;
    if (miss < 1) [ax, ay] = [-b.vy, b.vx];
    const d = Math.hypot(ax, ay) || 1;
    x += (ax / d) * w;
    y += (ay / d) * w;
    danger += w;
  }

  // The ground.
  const T = run.terrain,
    target = stuck ? run.foes.reduce<Run['foes'][number] | null>((m, f) => (f.alive && (!m || Math.hypot(f.x - h.x, f.y - h.y) < Math.hypot(m.x - h.x, m.y - h.y)) ? f : m), null) : null;
  for (const p of T.pillars) {
    const dx = h.x - p.x,
      dy = h.y - p.y,
      d = Math.hypot(dx, dy) || 1,
      reach = p.r + 10 + 26;
    if (d > reach) continue;
    const w = (reach - d) / 26;
    // Off it, and around it, so it never pins you. Once the room has stalled, around it on the side
    // of the monster it hides, so the pull toward that monster can't cancel out against the push.
    let round = 0.6;
    if (stuck && target) round = 1.4 * (-(dy / d) * (target.x - h.x) + (dx / d) * (target.y - h.y) >= 0 ? 1 : -1);
    x += ((dx / d) * (stuck ? 0.5 : 1) - (dy / d) * round) * w;
    y += ((dy / d) * (stuck ? 0.5 : 1) + (dx / d) * round) * w;
  }
  for (const q of T.water)
    if (inRect(q, h.x, h.y, 6)) {
      const [ox, oy] = outOf(q, h.x, h.y);
      x += ox * 0.7;
      y += oy * 0.7;
    }
  for (const q of T.spikes) {
    if (linger || !inRect(q, h.x, h.y, 18)) continue;
    const soon = spikeState(q, now + 0.5) !== 'down' || spikeState(q, now) !== 'down';
    if (!soon) continue;
    const [ox, oy] = outOf(q, h.x, h.y);
    x += ox * 3;
    y += oy * 3;
    danger += 1;
  }
  for (const br of T.barrels) {
    if (!br.alive) continue;
    const dx = h.x - br.x,
      dy = h.y - br.y,
      d = Math.hypot(dx, dy) || 1,
      keep = BARREL.blast + 10;
    if (d < keep) {
      x += (dx / d) * ((keep - d) / keep) * 1.5;
      y += (dy / d) * ((keep - d) / keep) * 1.5;
    }
  }
  for (const mn of run.mines) {
    const dx = h.x - mn.x,
      dy = h.y - mn.y,
      d = Math.hypot(dx, dy) || 1;
    if (d > mn.r + 24) continue;
    if (d < mn.r + 8 && now > mn.at - DODGE_SEE) imminent = true;
    x += (dx / d) * 3;
    y += (dy / d) * 3;
    danger += 2;
  }

  // Monsters: keep the class's distance from the nearest, and don't touch any.
  let near: { x: number; y: number } | null = null,
    nd = Infinity,
    close = 0;
  for (const f of run.foes) {
    if (!f.alive) continue;
    const dx = h.x - f.x,
      dy = h.y - f.y,
      d = Math.hypot(dx, dy) || 1;
    if (f !== run.boss && d < nd) {
      nd = d;
      near = f;
    }
    if (d < 170) close++;
    // A ram about to charge, or charging: off its line.
    if (f.kind === 'ram' && (now < f.windUntil || now < f.dashUntil)) {
      const along = -dx * f.dashX + -dy * f.dashY,
        side = -dx * -f.dashY + -dy * f.dashX;
      if (along > -20 && along < CHARGE.speed * CHARGE.dash + 40 && Math.abs(side) < f.def.r + 34) {
        if (now >= f.windUntil && along < 90) imminent = true;
        const s = side >= 0 ? -1 : 1;
        x += -f.dashY * s * 3;
        y += f.dashX * s * 3;
        danger += 2;
      }
    }
    // A shade's mark: where it lands and fires.
    if (f.kind === 'shade' && now < f.windUntil) {
      const mx = h.x - f.dashX,
        my = h.y - f.dashY,
        md = Math.hypot(mx, my) || 1;
      if (md < 140) {
        x += (mx / md) * 1.5;
        y += (my / md) * 1.5;
      }
    }
    // Copies of you and of the Mirror: hitting one hurts you, so give them room. (The Hollow
    // doesn't hurt to touch.)
    const you = f.kind === 'reflection' || f.kind === 'image',
      touch = f.def.r + 10 + ((melee || stuck) && !you ? 6 : 40);
    if (d < touch + 40 && f.def.dmg > 0) {
      const w = ((you ? 3 : 1.5) * (touch + 40 - d)) / 40;
      x += (dx / d) * w;
      y += (dy / d) * w;
    }
  }
  const b = run.boss?.alive ? run.boss : null;
  // The Foreman and the Whisper: on them, so they're the nearest to hit (the Foreman never gets to
  // mend; the Whisper can't hide behind its wisps).
  const foreman = run.warden?.alive && (run.warden.kind === 'foreman' || run.warden.kind === 'whisper') ? run.warden : null;
  const goal = b ?? foreman ?? (near && !run.cleared ? near : null);
  // The Gale's gust: lean into it, and keep off the edge where it bites.
  if (run.wind.x || run.wind.y) {
    x -= (run.wind.x / GALE.push) * 1.6;
    y -= (run.wind.y / GALE.push) * 1.6;
    const e = GALE.edge + ROOM.wall + 30;
    if (h.x < e) x += 2;
    if (h.x > run.area.w - e) x -= 2;
    if (h.y < e) y += 2;
    if (h.y > run.area.h - e) y -= 2;
    danger += 1;
  }
  const shrine = T.shrine && !T.shrine.used && run.hp < run.maxHp * 0.6 ? T.shrine : null;
  if (shrine) {
    const dx = shrine.x - h.x,
      dy = shrine.y - h.y,
      d = Math.hypot(dx, dy) || 1;
    x += (dx / d) * 1.4;
    y += (dy / d) * 1.4;
  } else if (goal) {
    const rule = run.setup.zone.boss,
      lit = !!b && rule === 'hollow' && b.phase === 2,
      want = b
        ? rule === 'hollow'
          ? // Inside its light while it's open, near the middle; out of reach while it's dark.
            lit
            ? LIGHT.r * 0.45
            : 160
          : melee || attackOf(run.setup.classId) === 'wave'
          ? 60
          : rule === 'tomorrow'
            ? TOMORROW_REACH - 60
            : rule === 'knight'
              ? 110
              : rule === 'mirror'
                ? // Close enough that the real one, not an image, is the nearest to aim at.
                  90
                : 170
        : melee || stuck
          ? 40
          : foreman
            ? 80
          : attackOf(run.setup.classId) === 'wave'
            ? 80
            : RANGE * 0.7,
      dx = goal.x - h.x,
      dy = goal.y - h.y,
      d = Math.hypot(dx, dy) || 1,
      // The Hollow's light is the whole fight: stay in it even with shots around.
      pull = lit ? clamp((d - want) / 30, -1, 1) * 1.6 : clamp((d - want) / 80, -1, 1) * (danger > 1 ? 0.3 : 1);
    // Close in or back off, and circle a little so shots aimed at you miss.
    x += (dx / d) * pull - (dy / d) * 0.35;
    y += (dy / d) * pull + (dx / d) * 0.35;
  } else if (run.cleared) {
    // Gems come on their own: open the chest, then on to where the map says.
    const c = run.chest && !run.chest.opened ? run.chest : null,
      door = c ? null : run.climb !== null ? (run.doors[0] ?? null) : route(run),
      [gx, gy] = c ? [c.x, c.y] : door ? beyond(run, door) : run.stairs ? [run.stairs.x, run.stairs.y] : [h.x, h.y],
      dx = gx - h.x,
      dy = gy - h.y,
      d = Math.hypot(dx, dy) || 1;
    x += (dx / d) * 1.5;
    y += (dy / d) * 1.5;
  }

  // Off the walls, where you get pinned (but not on the way out).
  const m = 60;
  if (!run.cleared) {
    if (h.x < m) x += (m - h.x) / m;
    if (h.x > run.area.w - m) x -= (h.x - (run.area.w - m)) / m;
    if (h.y < m) y += (m - h.y) / m;
    if (h.y > run.area.h - m) y -= (h.y - (run.area.h - m)) / m;
  }

  const len = Math.hypot(x, y),
    [mx, my] = len < 0.05 ? [0, 0] : [x / len, y / len];

  // The ability, when it helps.
  let ability = false;
  if (now >= run.abilityAt && !run.cleared) {
    const low = run.hp < run.maxHp * 0.5;
    switch (run.ability) {
      case 'charge':
        ability = nd < 140 || (!!b && Math.hypot(b.x - h.x, b.y - h.y) < 160);
        break;
      case 'volley':
        ability = close >= 3 || !!b;
        break;
      case 'blink':
        ability = danger > 2.5 || (low && danger > 1);
        break;
      case 'shock':
        ability = close >= 3 || danger > 2.5 || (!!b && Math.hypot(b.x - h.x, b.y - h.y) < 110);
        break;
      case 'still':
        ability = low || danger > 3;
        break;
    }
  }
  // The dodge: through a shot that's about to land, along the way it was already stepping.
  const dodge = imminent && now >= run.dodgeAt && !(run.charge && now < run.charge.until);
  return { x: mx, y: my, ability, dodge };
}

/** Plays one whole run with the bot, as fast as the computer goes. */
export function playRun(setup: RunSetup): RunEnd {
  const run = createRun({ ...setup, autoPick: true });
  while (!run.over) {
    stepRun(run, botInput(run));
    run.events.length = 0;
  }
  return run.over;
}
