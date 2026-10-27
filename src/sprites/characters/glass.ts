import type { ClipFrame } from '../clips';
import { grid, painter, tint, type Grid } from '../engine/grid';
import { drawHero, type HeroOpts } from './hero';

/* The Mirror as the dungeon's boss: you, in glass. The player's own figure, recolored as cold
   glass, a crack running through it and a shine sweeping across it. It copies your attack. When it
   breaks, it shatters into shards that fall and lie on the floor. */

const GLASS = ['#0e3a4a', '#2a7a96', '#7fd0e6', '#c9f1fa', '#ffffff'];
const CRACK = '#ffffff';
const DEEP = '#0b2a36';

/** The hero in glass, with its crack and the shine for frame f. */
function glassHero(o: HeroOpts, frame: ClipFrame, f: number): Grid {
  const g = tint(drawHero({ ...o, variant: 'normal' }, frame, f), GLASS),
    has = (x: number, y: number) => !!g[y]?.[x];
  // the shine: a bright diagonal band crossing the figure every few frames
  const band = (f % 8) * 12 - 20;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      if (!has(x, y)) continue;
      const d = x + y * 0.6 - band;
      if (d >= 0 && d < 3) g[y][x] = GLASS[4];
      else if (d >= 3 && d < 5) g[y][x] = GLASS[3];
    }
  // the crack: from the shoulder down across the chest, with a branch, only where there's glass
  const u = painter(g),
    crack = (x0: number, y0: number, x1: number, y1: number) => {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + ((x1 - x0) * i) / n),
          y = Math.round(y0 + ((y1 - y0) * i) / n);
        if (has(x, y)) u.p(x, y, i % 3 ? CRACK : DEEP);
      }
    };
  crack(38, 28, 33, 36);
  crack(33, 36, 36, 44);
  crack(33, 36, 27, 40);
  crack(29, 12, 32, 18);
  return g;
}

export function drawGlassHero(o: HeroOpts, frame: ClipFrame, f: number): Grid {
  const g = glassHero(o, frame, f),
    u = painter(g);
  // glints that wink on and off around it
  [
    [10, 20, 0],
    [54, 14, 3],
    [50, 44, 5],
    [12, 46, 6],
  ].forEach(([x, y, ph]) => {
    const k = (f + ph) % 8;
    if (k < 2) {
      u.p(x, y, GLASS[4]);
      if (!k) [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => u.p(x + dx, y + dy, GLASS[3]));
    }
  });
  return g;
}

/** Shattering, played once: a white flash, the shards flying apart, falling, then lying still. */
export function drawGlassShatter(o: HeroOpts, _frame: ClipFrame, f: number): Grid {
  const src = glassHero(o, {}, 0);
  if (f === 0) return tint(src, [GLASS[3], GLASS[4], GLASS[4]]);
  const out = grid(64),
    // the shards: a coarse grid of cells, each cut in two on a diagonal, each moving as one piece
    shard = (x: number, y: number) => {
      const cx = Math.floor(x / 10),
        cy = Math.floor(y / 10);
      return cy * 14 + cx * 2 + ((x % 10) > (y % 10) ? 1 : 0);
    };
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const c = src[y][x];
      if (!c) continue;
      const k = shard(x, y),
        cx = Math.floor(x / 10) * 10 + 5,
        spread = ((k * 37) % 7) - 3 + (cx - 32) / 8,
        // f 1: flying apart; f 2: falling; f 3: lying on the floor
        dx = Math.round(spread * f * 1.2),
        dy = f === 3 ? 0 : Math.round(f * f * 3 - f * 2 + (k % 3) * f);
      let nx = x + dx,
        ny = y + dy;
      if (f === 3) {
        // scattered flat along the floor, a thin layer of glass
        nx = Math.round(32 + (x - 32) * 1.3 + spread * 3);
        ny = 55 + ((y + k * 3) % 8);
        if ((x + y) % 3) continue;
      }
      if (nx >= 0 && nx < 64 && ny >= 0 && ny < 64) out[ny][nx] = c;
    }
  return out;
}
