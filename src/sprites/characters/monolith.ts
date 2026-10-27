import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid, type Painter } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Plateau as the dungeon's boss: a huge standing stone, flat on top with grass growing on
   it, layered like a cliff, with a face that sleeps. Two boulders float at its sides for hands. It
   barely moves. It cracks in three stages (stage 0, 1, 2), and at the last one light shows through
   the cracks: it breaks all at once, after breaking for weeks. Its attack: it rises, its eyes open,
   and it slams down. 32x32 rows, doubled. */

const ROWS = [
  '................................',
  '.......g..gg...g...g..g.g.......',
  '......gggggggggggggggggggg......',
  '......gGGgGGgGGgGGgGGgGGgG......',
  '......ccbbbbbbbbbbbbbbbaaa......',
  '......ccbbbbbbbbbbbbbbbaaa......',
  '.....ccbbbbbbbbbbbbbbbbaaa......',
  '.....ccbbbbbbbbbbbbbbbbaaa......',
  '......ccbbbbbbbbbbbbbbbaaa......',
  '......cddddddddddddddddeea......',
  '......ccbbbbbbbbbbbbbbbaaa......',
  '......ccbbbbbbbbbbbbbbbbaaa.....',
  '......ccbbbbbbbbbbbbbbbbaaa.....',
  '......ccbbbbbbbbbbbbbbbbaaa.....',
  '......ccbbbbbbbbbbbbbbbaaa......',
  '......ccbbbbbbbbbbbbbbbaaa......',
  '......ccbbbbbbbbbbbbbbbaaa......',
  '......cddddddddddddddddeea......',
  '.....ccbbbbbbbbbbbbbbbbaaa......',
  '.....ccbbbbbbbbbbbbbbbbaaa......',
  '.....ccbbbbbbbbbbbbbbbbaaa......',
  '......ccbbbbbbbbbbbbbbbbaaa.....',
  '......ccbbbbbbbbbbbbbbbbaaa.....',
  '......cddddddddddddddddeea......',
  '.....ccbbbbbbbbbbbbbbbbaaa......',
  '.....ccbbbbbbbbbbbbbbbbbaaa.....',
  '.....ccbbbbbbbbbbbbbbbbbaaa.....',
  '.....ccbbbbbbbbbbbbbbbbbaaa.....',
  '...abaaabaaabaaabaaabaaabaaab...',
  '....eaeeeeaeeeeaeeeeaeeeeaee....',
  '................................',
  '................................',
];
const STONE = { a: '#5e4830', b: '#8f6b3d', c: '#c4a06a', d: '#71532f', e: '#4a3825', g: '#4d7c0f', G: '#84cc16' };
const DARK = '#24180c';
const LIGHT = ['#f59e0b', '#fde68a', '#fffbeb'];
const EYE = ['#b45309', '#f59e0b', '#fde68a'];

export interface PlateauBossOpts {
  /** How cracked it is: 0, 1 or 2. */
  stage: 0 | 1 | 2;
}

/** A crack: a dark zigzag through points, doubled at stage 2 with light inside it. */
function crack(u: Painter, pts: number[][], open: boolean) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1],
      [x1, y1] = pts[i];
    if (open) {
      u.line(x0 - 1, y0, x1 - 1, y1, DARK);
      u.line(x0 + 1, y0, x1 + 1, y1, DARK);
      u.line(x0, y0, x1, y1, LIGHT[1]);
    } else u.line(x0, y0, x1, y1, DARK);
  }
}

export function drawPlateauBoss({ stage }: PlateauBossOpts, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    g = grid(32),
    p = painter(g),
    k = f % 8,
    sway = [0, 0, 1, 1, 1, 0, 0, 0][k];
  paintRows(p, ROWS, STONE);
  // the boulders it uses for hands: floating at its sides, lifted overhead, or slammed down
  const hands = wind
    ? [[3, 4], [28, 3]]
    : hit
      ? [[2, 26], [8, 27]]
      : [[2, 16 + sway], [29, 14 - sway]];
  hands.forEach(([x, y]) => {
    p.ellipse(x, y, 2.6, 2.2, STONE.b);
    p.p(x - 1, y - 1, STONE.c);
  });
  // at stage 2 a corner has broken off
  if (stage === 2) for (let y = 2; y < 8; y++) for (let x = 22 + (y >> 1); x < 32; x++) if (g[y][x] && g[y][x] !== STONE.b) g[y][x] = null; else if (x > 22 + y) g[y][x] = null;
  const lift = wind ? -4 : hit ? 1 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), 0, lift),
    u = painter(pic, lift);
  // the face: a heavy brow over eyes that stay shut, until it attacks
  u.row(24, 18, 30, STONE.a);
  u.row(24, 34, 46, STONE.a);
  if (wind || hit) {
    u.r(20, 27, 9, 3, EYE[1]);
    u.r(36, 27, 9, 3, EYE[1]);
    u.row(28, 22, 26, EYE[2]);
    u.row(28, 38, 42, EYE[2]);
  } else {
    u.row(28, 20, 28, DARK);
    u.row(28, 36, 44, DARK);
    u.p(19, 27, DARK);
    u.p(45, 27, DARK);
  }
  u.row(40, 26, 38, DARK);
  if (hit) u.r(28, 39, 8, 3, DARK);
  // the cracks, worse at each stage
  crack(u, [[44, 10], [46, 15], [44, 19]], false);
  if (stage >= 1) {
    crack(u, [[30, 6], [33, 12], [29, 18], [32, 22]], stage === 2);
    crack(u, [[29, 18], [23, 21]], stage === 2);
    crack(u, [[46, 34], [49, 40], [46, 46], [48, 52]], stage === 2);
    crack(u, [[16, 44], [20, 50]], false);
  }
  if (stage === 2) {
    crack(u, [[32, 44], [28, 50], [31, 56]], true);
    // light spilling out, and chips drifting off
    [[34, 11, 0], [24, 21, 3], [50, 44, 5]].forEach(([x, y, ph]) => {
      const q = (f + ph) % 8;
      if (q < 4) u.p(x + q, y - q, LIGHT[q % 3]);
    });
  }
  // the slam: dust and chips
  if (hit) {
    const v = painter(pic);
    [[2, 60, 3], [10, 58, 2], [56, 59, 3], [48, 61, 2], [20, 61, 2]].forEach(([x, y, s], i) => v.r(x, y, s, s, i % 2 ? STONE.c : STONE.a));
  }
  return pic;
}
