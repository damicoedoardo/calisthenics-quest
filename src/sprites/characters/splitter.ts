import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Splitter, a dungeon monster: a big green slime with three lobes, and in each lobe a dark
   core with its own eye. That's the warning: hit it and it splits into three Splitlings, one per
   core. It wobbles as it breathes; its attack is a squash and a lunge. 32x32 rows, doubled. */

const BIG = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................b...............',
  '.............bbbbbbb............',
  '............cccbbbbbb...........',
  '...........bbbbbbbbbbb..........',
  '...........bbbbbdbbbbb..........',
  '..........bbbbdddddbbbb.........',
  '..........bbbdddddddbbb.........',
  '......bbbbbbbdddddddccbbbbb.....',
  '.....ccbbbbbbdddddddccbbbbbb....',
  '....bbbbbbbbbbdddddbbbbbbbbbb...',
  '....bbbddddbbbbbdbbbbbddddbbb...',
  '...bbbddddddbbbbbbbbbddddddbbb..',
  '...bbbddddddbbbbbbbbbddddddbbb..',
  '...bbbddddddbbbbbbbbbddddddbbb..',
  '....bbddddddbbbbbbbbbddddddbb...',
  '....bbbddddbbbbbbbbbbbddddbbb...',
  '....bbbbbbbbbbbbbbbbbbbbbbbbb...',
  '...bbbbbbbbbbbbbbbbbbbbbbbbbbb..',
  '...bbbbbbbbbbbbbbbbbbbbbbbbbbb..',
  '...bbbbbbbbbbbbbbbbbbbbbbbbbbb..',
  '...bbbbbbbbbbbbbbbbbbbbbbbbbbb..',
  '...bbbbbbbbbbbbbbbbbbbbbbbbbbb..',
  '...aaaaaaaaaaaaaaaaaaaaaaaaaaa..',
  '..aaaaaaaaaaaaaaaaaaaaaaaaaaaa..',
  '.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.',
  '................................',
  '................................',
];
/** A Splitling: one lobe on its own, with its one core. */
const SMALL = [
  '..................',
  '..................',
  '..................',
  '......bbbbbb......',
  '....ccbbbbbbbb....',
  '...bccbbbbbbbbb...',
  '...bbbbddddbbbb...',
  '..bbbbddddddbbbb..',
  '..bbbbddddddbbbb..',
  '..bbbbddddddbbbb..',
  '..bbbbbddddbbbbb..',
  '..bbbbbbbbbbbbbb..',
  '..bbbbbbbbbbbbbb..',
  '.aaaaaaaaaaaaaaaa.',
  '......aaaaaa......',
  '..................',
];
const GOO = { a: '#14532d', b: '#22a35a', c: '#86efac', d: '#166534' };
const EYE = '#ecfccb';
const PUPIL = '#052e16';
const MOUTH = '#0b2a17';

/** One eye looking at you (left), half-shut on the blink frame, wide on the hit. */
function eye(u: ReturnType<typeof painter>, x: number, y: number, shut: boolean, wide: boolean) {
  if (shut) return u.row(y + 2, x - 2, x + 2, PUPIL);
  u.ellipse(x, y + 1, wide ? 3 : 2.6, wide ? 3 : 2.4, EYE);
  u.r(x - 2, y, 2, wide ? 3 : 2, PUPIL);
  u.p(x - 2, y, '#ffffff');
}

/** A slime's body breathing: squashed wider and lower on the breath and the wind-up. */
function squash(src: Grid, sq: number): Grid {
  if (!sq) return src;
  const n = src.length,
    out = grid(n);
  // rows are pulled down toward the floor, columns pushed out from the middle
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const sy = Math.round(n - 4 - (n - 4 - y) * (1 + sq * 0.08)),
        sx = Math.round(n / 2 + (x - n / 2) / (1 + sq * 0.05));
      if (sy >= 0 && sy < n && sx >= 0 && sx < n) out[y][x] = src[sy][sx];
    }
  return out;
}

export function drawSplitter(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    sq = wind ? 2 : frame.bob ?? 0,
    k = f % 8,
    g = grid(32);
  paintRows(painter(g), BIG, GOO);
  const pic = shifted(squash(outline(autoshade(scale2x(g))), sq), hit ? -7 : 0, 0),
    u = painter(pic),
    dx = hit ? -7 : 0,
    dy = sq * 2;
  // seams between the lobes
  u.line(22 + dx, 22 + dy, 25 + dx, 30 + dy, GOO.a);
  u.line(41 + dx, 22 + dy, 38 + dx, 30 + dy, GOO.a);
  // three eyes, one per core, blinking out of step
  [[16, 33], [31, 22], [46, 33]].forEach(([x, y], i) => eye(u, x + dx, y + dy, !hit && (k + i * 3) % 8 === 7, hit));
  // a wide, wobbly mouth
  if (hit) u.r(25 + dx, 46, 14, 5, MOUTH);
  else {
    // a grumpy frown
    u.row(47 + sq, 27 + dx, 36 + dx, MOUTH);
    u.p(26 + dx, 48 + sq, MOUTH);
    u.p(37 + dx, 48 + sq, MOUTH);
  }
  // drips along the base
  [12, 28, 47].forEach((x, i) => {
    const d = (k + i * 2) % 4;
    if (d) u.r(x + dx, 60, 2, d, GOO.b);
  });
  return pic;
}

export function drawSplitling(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    sq = wind ? 2 : frame.bob ?? 0,
    k = f % 8,
    g = grid(32);
  // centered low in the frame, so it sits on the same floor line as everything else
  paintRows(painter(g), SMALL, GOO, 7, 14);
  const pic = shifted(squash(outline(autoshade(scale2x(g))), sq), hit ? -8 : 0, 0),
    u = painter(pic),
    dx = hit ? -8 : 0;
  eye(u, 30 + dx, 42 + sq * 2, !hit && k === 5, hit);
  u.row(52 + sq, 28 + dx, 33 + dx, MOUTH);
  // a little hop of goo off the top as it bounces
  if (!hit && k >= 2 && k <= 4) u.r(36, 36 - k * 2, 2, 2, GOO.c);
  return pic;
}
