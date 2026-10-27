import type { ClipFrame } from '../clips';
import { grid, outline, painter, scale2x, tint, type Grid } from '../engine/grid';
import { paintRows } from './pixel';
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

/** Hand-drawn shards of glass: k the dark edge, c the glass, l the light, w the glint. */
const SHARDS = [
  ['..w..', '.wlc.', 'wlcck', '.cck.', '..k..'],
  ['w....', 'lw...', '.lc..', '..cc.', '...ck', '....k'],
  ['wlllw', '.lcc.', '.cck.', '..k..'],
  ['....w', '...wl', '..wlc', '.wlcc', 'wlcck', '.cck.', '..k..'],
  ['wl', 'ck'],
  ['.wl.', 'wlcc', '.cck'],
];
const SHARD_PAL = { k: GLASS[1], c: GLASS[2], l: GLASS[3], w: GLASS[4] };
/** Where each shard is in the burst (frame 2) and on the floor (frame 3): [shard, x, y]. */
const BURST: number[][] = [
  [3, 8, 10], [0, 26, 2], [2, 44, 6], [1, 54, 18], [5, 4, 28], [3, 50, 32],
  [0, 16, 40], [2, 36, 44], [4, 28, 24], [1, 12, 52], [5, 46, 50], [4, 58, 42], [0, 34, 14],
];
const FLOOR: number[][] = [
  [2, 6, 57], [4, 14, 60], [1, 19, 56], [5, 27, 58], [0, 34, 57], [4, 40, 61], [2, 45, 58], [3, 52, 55], [4, 59, 60],
];

function shardsAt(g: Grid, list: number[][]) {
  const u = painter(g);
  list.forEach(([i, x, y]) => paintRows(u, SHARDS[i], SHARD_PAL, x, y));
}

/** Shattering, played once: a white flash, cracks running through it, the shards bursting out,
    then lying on the floor with a glint. */
export function drawGlassShatter(o: HeroOpts, _frame: ClipFrame, f: number): Grid {
  const src = glassHero(o, {}, 0);
  if (f === 0) return tint(src, [GLASS[3], GLASS[4], GLASS[4]]);
  if (f === 1) {
    // cracks running out from the chest in every direction, the first shards popping loose
    const u = painter(src),
      has = (x: number, y: number) => !!src[y]?.[x];
    for (let a = 0; a < 10; a++) {
      const t = (a / 10) * Math.PI * 2 + 0.3;
      for (let r = 2; r < 26; r++) {
        const x = Math.round(32 + Math.cos(t) * r + Math.sin(r * 0.7 + a) * 1.5),
          y = Math.round(34 + Math.sin(t) * r);
        if (has(x, y)) u.p(x, y, r % 4 ? GLASS[4] : GLASS[0]);
      }
    }
    shardsAt(src, [[4, 10, 18], [0, 50, 22], [4, 46, 44]]);
    return src;
  }
  // the shards are drawn at half size and doubled, so each one reads as a chunk of glass
  const half = grid(32);
  shardsAt(half, (f === 2 ? BURST : FLOOR).map(([i, x, y]) => [i, x >> 1, Math.min(y >> 1, 32 - SHARDS[i].length)]));
  const out = outline(scale2x(half)),
    u = painter(out);
  // glints: a sparkle burst in the air, then one or two on the floor
  (f === 2 ? [[20, 20], [42, 26], [30, 36], [14, 34]] : [[22, 54], [48, 53]]).forEach(([x, y]) => {
    u.p(x, y, GLASS[4]);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => u.p(x + dx, y + dy, GLASS[3]));
  });
  return out;
}
