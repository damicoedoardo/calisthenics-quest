import { attackOf, clamp, RANGE } from '../rules';
import { createRun, ROOM, stepRun, TOMORROW_REACH, type Input, type Run, type RunEnd, type RunSetup } from './engine';

/* The bot: a steady, careful player, not a great one. It sidesteps shots on course to hit it,
   keeps its class's distance from monsters (a sword goes close, the rest stay back), plays each
   boss by its rule, walks out through the door when a room is clear, and uses the ability when it
   helps. It plays the same engine as a person: the same input, the same steps. */

const SEE = 0.7;
/** A person needs this long (s) to notice a new shot; the bot doesn't see it before. */
export const REACTION = 0.25;
/** Share of shots a person keeps track of in a busy room; the rest the bot doesn't see coming. */
export const ATTENTION = { share: 0.75 };

/** Whether this shot is one the bot watches: fixed per shot, so it doesn't flicker. */
const noticed = (id: number) => ((Math.imul(id, 2654435761) >>> 0) % 1000) / 1000 < ATTENTION.share;

export function botInput(run: Run): Input {
  const h = run.hero,
    melee = attackOf(run.setup.classId) === 'slash',
    now = run.t;
  let x = 0,
    y = 0,
    danger = 0;

  // Shots on course to hit within SEE seconds: step off their line.
  for (const b of run.bullets) {
    if (now - b.born < REACTION || !noticed(b.id)) continue;
    const rx = h.x - b.x,
      ry = h.y - b.y,
      v2 = b.vx * b.vx + b.vy * b.vy;
    if (rx * rx + ry * ry > 220 * 220 || !v2) continue;
    const tc = (rx * b.vx + ry * b.vy) / v2;
    if (tc < 0 || tc > SEE) continue;
    const cx = b.x + b.vx * tc - h.x,
      cy = b.y + b.vy * tc - h.y,
      miss = Math.hypot(cx, cy),
      room = b.r + 10 + 12;
    if (miss > room) continue;
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
    const touch = f.def.r + 10 + (melee && f.kind !== 'reflection' ? 6 : 40);
    if (d < touch + 40) {
      const w = ((f.kind === 'reflection' ? 3 : 1.5) * (touch + 40 - d)) / 40;
      x += (dx / d) * w;
      y += (dy / d) * w;
    }
  }
  const b = run.boss?.alive ? run.boss : null;
  const goal = b ?? (near && !run.cleared ? near : null);
  if (goal) {
    const rule = run.setup.zone.boss,
      want = b
        ? melee || attackOf(run.setup.classId) === 'wave'
          ? 60
          : rule === 'tomorrow'
            ? TOMORROW_REACH - 60
            : rule === 'knight'
              ? 110
              : rule === 'mirror'
                ? 120
                : 170
        : melee
          ? 40
          : attackOf(run.setup.classId) === 'wave'
            ? 80
            : RANGE * 0.7,
      dx = goal.x - h.x,
      dy = goal.y - h.y,
      d = Math.hypot(dx, dy) || 1,
      pull = clamp((d - want) / 80, -1, 1) * (danger > 1 ? 0.3 : 1);
    // Close in or back off, and circle a little so shots aimed at you miss.
    x += (dx / d) * pull - (dy / d) * 0.35;
    y += (dy / d) * pull + (dx / d) * 0.35;
  } else if (run.cleared) {
    // Gems come on their own: walk to the door.
    const dx = ROOM.w / 2 - h.x,
      dy = -20 - h.y,
      d = Math.hypot(dx, dy) || 1;
    x += (dx / d) * 1.5;
    y += (dy / d) * 1.5;
  }

  // Off the walls, where you get pinned (but not on the way out).
  const m = 60;
  if (h.x < m) x += (m - h.x) / m;
  if (h.x > ROOM.w - m) x -= (h.x - (ROOM.w - m)) / m;
  if (!run.cleared && h.y < m) y += (m - h.y) / m;
  if (h.y > ROOM.h - m) y -= (h.y - (ROOM.h - m)) / m;

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
      case 'dash':
        ability = danger > 2.5 || (low && danger > 1);
        break;
      case 'still':
        ability = low || danger > 3;
        break;
    }
  }
  return { x: mx, y: my, ability };
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
