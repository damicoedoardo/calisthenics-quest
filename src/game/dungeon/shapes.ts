import { ROOM_SHAPES } from '@/balance';

/* Walls inside a room, and the ways around them. Pure: no Phaser, no clock. A room is still a box
   (run.area, its walls ROOM.wall thick); a shape fills parts of it with solid wall (`blocks`), so a
   floor reads as a dungeon: corners, a block in the middle, halls, side lanes. The engine treats a
   block like a pillar (it stops bodies and every shot); monsters and the bot find their way round
   with `wayTo`, a walk over a grid of the room. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ShapeId = keyof typeof ROOM_SHAPES.weights;

/** Grid step (px) for finding a way round, and how far from a wall a body's middle stays. */
const CELL = 20;
const PAD = 16;
/** Thinnest wall a shape builds: thick enough that nothing fast steps through it in one 1/60 s. */
const THICK = 44;

/** Whether a body of radius r at x, y touches a block. */
export function inBlock(blocks: readonly Box[], x: number, y: number, r: number): boolean {
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) {
      const cx = x < b.x ? b.x : x > b.x + b.w ? b.x + b.w : x,
        cy = y < b.y ? b.y : y > b.y + b.h ? b.y + b.h : y;
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
    }
  }
  return false;
}

/** Pushes a body out of any block it walked into, by the shortest way, so it slides along. The
    room is w x h with walls m thick: a body deep in a block leaves by a face that opens on the
    room, never one against the room's own wall. */
export function outOfBlocks(blocks: readonly Box[], o: { x: number; y: number }, r: number, w: number, h: number, m: number) {
  for (const b of blocks) {
    if (o.x <= b.x - r || o.x >= b.x + b.w + r || o.y <= b.y - r || o.y >= b.y + b.h + r) continue;
    const inside = o.x >= b.x && o.x <= b.x + b.w && o.y >= b.y && o.y <= b.y + b.h;
    if (inside) {
      // Deep in: out by the nearest face with room on its far side.
      const faces: [number, number, number][] = [
        [o.x - b.x, b.x - r, -1],
        [b.x + b.w - o.x, b.x + b.w + r, -2],
        [o.y - b.y, b.y - r, -3],
        [b.y + b.h - o.y, b.y + b.h + r, -4],
      ];
      let best: [number, number, number] | null = null;
      for (const f of faces) {
        const along = f[2] >= -2 ? 'x' : 'y',
          ok = along === 'x' ? f[1] >= m + r && f[1] <= w - m - r : f[1] >= m + r && f[1] <= h - m - r;
        if (ok && (!best || f[0] < best[0])) best = f;
      }
      if (best) {
        if (best[2] >= -2) o.x = best[1];
        else o.y = best[1];
      }
      continue;
    }
    const cx = Math.max(b.x, Math.min(o.x, b.x + b.w)),
      cy = Math.max(b.y, Math.min(o.y, b.y + b.h)),
      dx = o.x - cx,
      dy = o.y - cy,
      d = Math.hypot(dx, dy);
    if (d >= r || d === 0) continue;
    o.x = cx + (dx / d) * r;
    o.y = cy + (dy / d) * r;
  }
}

/** Whether the line from (x1, y1) to (x2, y2), `pad` wide either side, misses every block. */
export function clearLine(blocks: readonly Box[], x1: number, y1: number, x2: number, y2: number, pad = 0): boolean {
  const dx = x2 - x1,
    dy = y2 - y1;
  for (const b of blocks) {
    // Where the line enters and leaves the block grown by pad (the slab test).
    let t0 = 0,
      t1 = 1;
    const sides: [number, number][] = [
      [-dx, x1 - (b.x - pad)],
      [dx, b.x + b.w + pad - x1],
      [-dy, y1 - (b.y - pad)],
      [dy, b.y + b.h + pad - y1],
    ];
    let miss = false;
    for (const [p, q] of sides) {
      if (p === 0) {
        if (q < 0) {
          miss = true;
          break;
        }
        continue;
      }
      const t = q / p;
      if (p < 0) {
        if (t > t1) {
          miss = true;
          break;
        }
        if (t > t0) t0 = t;
      } else {
        if (t < t0) {
          miss = true;
          break;
        }
        if (t < t1) t1 = t;
      }
    }
    if (!miss) return false;
  }
  return true;
}

// ---------- shapes ----------

/** A room's inside walls, by shape. `rnd` is the run's dice; the room is w x h with walls m thick.
    Every shape keeps the lanes in from the four doors and the stairs' spots (middle, 110 px in
    from each end) open. */
export function buildShape(id: ShapeId, w: number, h: number, m: number, rnd: () => number): Box[] {
  const between = (a: number, b: number) => a + rnd() * (b - a),
    // Round to 4 px, so the bricks sit well.
    q = (n: number) => Math.round(n / 4) * 4;
  // How far a corner can reach and still leave the doors' lanes (84 wide, plus room to walk) open.
  const reachX = w / 2 - 74 - m,
    reachY = h / 2 - 80 - m;
  const corner = (cx: 0 | 1, cy: 0 | 1, kw: number, kh: number): Box => {
    const bw = q(reachX * kw),
      bh = q(reachY * kh);
    return { x: cx ? w - m - bw : m, y: cy ? h - m - bh : m, w: bw, h: bh };
  };
  switch (id) {
    case 'corners': {
      // All four corners cut: a room shaped like a plus.
      const kw = between(0.7, 1),
        kh = between(0.55, 0.9);
      return [corner(0, 0, kw, kh), corner(1, 0, kw, kh), corner(0, 1, kw, kh), corner(1, 1, kw, kh)];
    }
    case 'notch': {
      // One or two big corners gone, on the same side or across: an L or a Z.
      const a = rnd() < 0.5 ? 0 : 1,
        b = rnd() < 0.5 ? 0 : 1,
        out = [corner(a as 0 | 1, b as 0 | 1, between(0.85, 1), between(0.8, 1))];
      if (rnd() < 0.6) out.push(corner((1 - a) as 0 | 1, (rnd() < 0.5 ? b : 1 - b) as 0 | 1, between(0.85, 1), between(0.8, 1)));
      return out;
    }
    case 'block': {
      // A block in the middle to fight round, two monsters always on its far side.
      const bw = q(Math.min(w * between(0.3, 0.42), w - 2 * m - 2 * 96)),
        bh = q(h * between(0.2, 0.3));
      return [{ x: q((w - bw) / 2), y: q((h - bh) / 2), w: bw, h: bh }];
    }
    case 'halls': {
      // Two walls from either side, staggered: the room becomes a winding hall.
      const len = q((w - 2 * m) * between(0.58, 0.68)),
        t = THICK + 4 * Math.round(rnd() * 3),
        left = rnd() < 0.5,
        y1 = q(h * between(0.3, 0.36)),
        y2 = q(h * between(0.64, 0.7) - t);
      return [
        { x: left ? m : w - m - len, y: y1, w: len, h: t },
        { x: left ? w - m - len : m, y: y2, w: len, h: t },
      ];
    }
    case 'lanes': {
      // Two long walls down the room: three lanes, joined at the ends.
      const t = THICK - 8,
        gap = between(0.27, 0.32),
        top = q(h * between(0.25, 0.3)),
        bot = q(h * between(0.7, 0.75));
      return [
        { x: q(w * gap - t / 2), y: top, w: t, h: bot - top },
        { x: q(w * (1 - gap) - t / 2), y: top, w: t, h: bot - top },
      ];
    }
  }
}

/** Which shape a room gets, or null for a plain box: ROOM_SHAPES. */
export function pickShape(floor: number, rnd: () => number): ShapeId | null {
  if (floor < ROOM_SHAPES.from || rnd() >= ROOM_SHAPES.chance) return null;
  const all = Object.entries(ROOM_SHAPES.weights) as [ShapeId, number][],
    total = all.reduce((n, [, k]) => n + k, 0);
  let r = rnd() * total;
  for (const [id, k] of all) if ((r -= k) < 0) return id;
  return all[0][0];
}

// ---------- finding a way round ----------

interface Grid {
  cols: number;
  rows: number;
  /** 1 where a body's middle can stand. */
  open: Uint8Array;
  /** Steps to each target cell, kept for a few targets (a monster hunting you asks every step). */
  ways: Map<number, Int32Array>;
}

const grids = new WeakMap<readonly Box[], Grid>();

function gridOf(blocks: readonly Box[], w: number, h: number, m: number): Grid {
  let g = grids.get(blocks);
  if (g) return g;
  const cols = Math.ceil(w / CELL),
    rows = Math.ceil(h / CELL),
    open = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) * CELL,
        y = (j + 0.5) * CELL;
      open[j * cols + i] = x > m + 6 && x < w - m - 6 && y > m + 6 && y < h - m - 6 && !inBlock(blocks, x, y, PAD) ? 1 : 0;
    }
  g = { cols, rows, open, ways: new Map() };
  grids.set(blocks, g);
  return g;
}

/** The open cell nearest to (x, y). */
function cellAt(g: Grid, x: number, y: number): number {
  const i = Math.max(0, Math.min(g.cols - 1, Math.floor(x / CELL))),
    j = Math.max(0, Math.min(g.rows - 1, Math.floor(y / CELL))),
    at = j * g.cols + i;
  if (g.open[at]) return at;
  // In a wall's skin (pushed against it): the nearest open cell around.
  for (let r = 1; r < 6; r++)
    for (let dj = -r; dj <= r; dj++)
      for (let di = -r; di <= r; di++) {
        const ii = i + di,
          jj = j + dj;
        if (ii >= 0 && jj >= 0 && ii < g.cols && jj < g.rows && g.open[jj * g.cols + ii]) return jj * g.cols + ii;
      }
  return at;
}

const NEXT = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
] as const;

/** Steps from every cell to `goal` (a walk over the open cells, corners not cut). */
function stepsTo(g: Grid, goal: number): Int32Array {
  let d = g.ways.get(goal);
  if (d) return d;
  d = new Int32Array(g.cols * g.rows).fill(-1);
  const todo = new Int32Array(g.cols * g.rows);
  let head = 0,
    tail = 0;
  d[goal] = 0;
  todo[tail++] = goal;
  while (head < tail) {
    const at = todo[head++],
      i = at % g.cols,
      j = (at - i) / g.cols;
    for (let k = 0; k < 4; k++) {
      const ii = i + NEXT[k][0],
        jj = j + NEXT[k][1];
      if (ii < 0 || jj < 0 || ii >= g.cols || jj >= g.rows) continue;
      const n = jj * g.cols + ii;
      if (!g.open[n] || d[n] >= 0) continue;
      d[n] = d[at] + 1;
      todo[tail++] = n;
    }
  }
  if (g.ways.size > 12) g.ways.clear();
  g.ways.set(goal, d);
  return d;
}

/** Which way to walk from (x, y) to reach (tx, ty) round the room's blocks: a unit step, or null
    when the way is straight (nothing in between) or there is none. */
export function wayTo(blocks: readonly Box[], w: number, h: number, m: number, x: number, y: number, tx: number, ty: number, r = PAD): [number, number] | null {
  if (!blocks.length || clearLine(blocks, x, y, tx, ty, r)) return null;
  const g = gridOf(blocks, w, h, m),
    goal = cellAt(g, tx, ty),
    from = cellAt(g, x, y),
    d = stepsTo(g, goal);
  if (d[from] <= 0) return null;
  // Toward the furthest cell down the way that's in plain sight: a smooth line, not grid steps.
  let at = from;
  for (let n = 0; n < 8; n++) {
    const i = at % g.cols,
      j = (at - i) / g.cols;
    let best = -1;
    for (const [di, dj] of NEXT) {
      const ii = i + di,
        jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= g.cols || jj >= g.rows) continue;
      const c = jj * g.cols + ii;
      // A diagonal only where both cells beside it are open (no cutting a corner).
      if (di && dj && (!g.open[j * g.cols + ii] || !g.open[jj * g.cols + i])) continue;
      if (d[c] >= 0 && d[c] < d[at] && (best < 0 || d[c] < d[best])) best = c;
    }
    if (best < 0) break;
    const bi = best % g.cols,
      bj = (best - bi) / g.cols;
    if (n > 0 && !clearLine(blocks, x, y, (bi + 0.5) * CELL, (bj + 0.5) * CELL, r * 0.6)) break;
    at = best;
    if (d[at] === 0) break;
  }
  const ai = at % g.cols,
    aj = (at - ai) / g.cols,
    dx = (ai + 0.5) * CELL - x,
    dy = (aj + 0.5) * CELL - y,
    len = Math.hypot(dx, dy);
  return len < 1 ? null : [dx / len, dy / len];
}

/** Whether every open spot of the room can be walked to from (x, y): a shape must never shut off
    a pocket a monster could stand in. */
export function allJoined(blocks: readonly Box[], w: number, h: number, m: number, x: number, y: number): boolean {
  if (!blocks.length) return true;
  const g = gridOf(blocks, w, h, m),
    d = stepsTo(g, cellAt(g, x, y));
  for (let k = 0; k < d.length; k++) if (g.open[k] && d[k] < 0) return false;
  return true;
}
