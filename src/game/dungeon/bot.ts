import { attackOf, clamp, RANGE } from '../rules';
import { BARREL, CHARGE, createRun, inRect, spikeState, stepRun, TOMORROW_REACH, type Input, type Rect, type Run, type RunEnd, type RunSetup } from './engine';

/* The bot: a steady, careful player, not a great one. It sidesteps shots on course to hit it,
   keeps its class's distance from monsters (a sword goes close, the rest stay back), plays each
   boss by its rule, walks out through the door when a room is clear, and uses the ability when it
   helps. It reads the ground too: around pillars, out of water and rising spikes, away from
   barrels, bombs and a ram's line, to the shrine when hurt. It plays the same engine as a person:
   the same input, the same steps. */

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

  // The ground.
  const T = run.terrain;
  for (const p of T.pillars) {
    const dx = h.x - p.x,
      dy = h.y - p.y,
      d = Math.hypot(dx, dy) || 1,
      reach = p.r + 10 + 26;
    if (d > reach) continue;
    const w = (reach - d) / 26;
    // Off it, and around it, so it never pins you.
    x += (dx / d - (dy / d) * 0.6) * w;
    y += (dy / d + (dx / d) * 0.6) * w;
  }
  for (const q of T.water)
    if (inRect(q, h.x, h.y, 6)) {
      const [ox, oy] = outOf(q, h.x, h.y);
      x += ox * 0.7;
      y += oy * 0.7;
    }
  for (const q of T.spikes) {
    if (!inRect(q, h.x, h.y, 18)) continue;
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
    const touch = f.def.r + 10 + (melee && f.kind !== 'reflection' ? 6 : 40);
    if (d < touch + 40) {
      const w = ((f.kind === 'reflection' ? 3 : 1.5) * (touch + 40 - d)) / 40;
      x += (dx / d) * w;
      y += (dy / d) * w;
    }
  }
  const b = run.boss?.alive ? run.boss : null;
  const goal = b ?? (near && !run.cleared ? near : null);
  const shrine = T.shrine && !T.shrine.used && run.hp < run.maxHp * 0.6 ? T.shrine : null;
  if (shrine) {
    const dx = shrine.x - h.x,
      dy = shrine.y - h.y,
      d = Math.hypot(dx, dy) || 1;
    x += (dx / d) * 1.4;
    y += (dy / d) * 1.4;
  } else if (goal) {
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
    const dx = run.area.w / 2 - h.x,
      dy = -20 - h.y,
      d = Math.hypot(dx, dy) || 1;
    x += (dx / d) * 1.5;
    y += (dy / d) * 1.5;
  }

  // Off the walls, where you get pinned (but not on the way out).
  const m = 60;
  if (h.x < m) x += (m - h.x) / m;
  if (h.x > run.area.w - m) x -= (h.x - (run.area.w - m)) / m;
  if (!run.cleared && h.y < m) y += (m - h.y) / m;
  if (h.y > run.area.h - m) y -= (h.y - (run.area.h - m)) / m;

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
