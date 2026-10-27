import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Drowned Lantern, the Mirror Lake's mid-boss: an old iron lantern that sank in the lake and
   came back up still burning. Green rust on its cage, weed hanging off its cap, water running off
   its base, and inside the glass a cold blue flame with a face. Its light is the brightest thing
   in its own dark: a white core, a ring of pale light round the glass. Its attack: the flame
   shrinks down and sucks in, then flares up out of the cap in a burst of light and spray.
   32x32 rows, doubled. */

const ROWS = [
  '................................',
  '...............kk...............',
  '.............kk..kk.............',
  '.............k....k.............',
  '..............kkkk..............',
  '..............kiik..............',
  '............kkhhiikk............',
  '..........kkhhhiiiiikk..........',
  '........kkhhhiiiiiiiiikk........',
  '.......kiiiiiiiiiiiiiiiik.......',
  '.......kkkkkkkkkkkkkkkkkk.......',
  '......s.higgggggggggggik........',
  '......s.higGGGGGGGGGGgik........',
  '......s.higGGGGGGGGGGgik.s......',
  '.....s..higGGGGGGGGGGgik.s......',
  '.....s..higGGGGGGGGGGgik.s......',
  '.....s..higGGGGGGGGGGgik..s.....',
  '......s.higGGGGGGGGGGgik..s.....',
  '......s.higGGGGGGGGGGgik........',
  '.......shigGGGGGGGGGGgik........',
  '.......shigGGGGGGGGGGgik........',
  '........higGGGGGGGGGGgik........',
  '........higggggggggggggk........',
  '........kkkkkkkkkkkkkkkk........',
  '.......hhiiiiiiiiiiiiiiik.......',
  '.......kkkkkkkkkkkkkkkkkk.......',
  '.........kiiiiiiiiiiiik.........',
  '..........kkkkkkkkkkkk..........',
  '................................',
  '................................',
  '................................',
  '................................',
];
/* The weed draped over the cap: a few strands that hang lower than the drawing above. */
const WEED = [
  '.SSs.......',
  'Ss.sS......',
  's...s......',
];
const IRON = { k: '#13232a', i: '#2c4d50', h: '#5b8c80' };
const GLASS = { g: '#164454', G: '#23708a' };
const WEED_C = { s: '#245a3a', S: '#3f8f50' };
/* The flame, flickering through three shapes; f the blue, F the pale, w the white core. */
const FLAME = [
  [
    '.....f......',
    '.....ff.....',
    '....fFf.....',
    '....fFFf....',
    '...fFFFf....',
    '...fFwFFf...',
    '..fFwwwFf...',
    '..fFwwwwFf..',
    '.ffFwwwwFff.',
    '.fFFwwwwFFf.',
    '.fFFFwwFFFf.',
    '..ffFFFFff..',
  ],
  [
    '......f.....',
    '.....ff.....',
    '.....fFf....',
    '....fFFf....',
    '....fFFFf...',
    '...fFwwFf...',
    '..fFwwwFFf..',
    '..fFwwwwFf..',
    '.ffFwwwwFff.',
    '.fFFwwwwFFf.',
    '.fFFFwwFFFf.',
    '..ffFFFFff..',
  ],
  [
    '............',
    '....f.......',
    '....ff......',
    '...fFff.....',
    '...fFFFf....',
    '...fFwFFf...',
    '..fFwwwFFf..',
    '..fFwwwwFf..',
    '.ffFwwwwFff.',
    '.fFFwwwwFFf.',
    '.fFFFwwFFFf.',
    '..ffFFFFff..',
  ],
];
/* Drawn in: low and small, the white gone to pale. */
const SHRUNK = [
  '....f.......',
  '...fFf......',
  '..fFFFf.....',
  '..fFwFFf....',
  '.fFFwFFFf...',
  '.ffFFFFff...',
];
/* The flare: a tall plume of white fire filling the glass. */
const FLARE = [
  '...wFFFFw...',
  '..wFwwwwFw..',
  '..FwwwwwwF..',
  '.FwwwwwwwwF.',
  '.Fwwwwwwwwf.',
  'fFwwwwwwwwFf',
  'fFwwwwwwwwFf',
  'fFwwwwwwwwFf',
  'fFFwwwwwwFFf',
  '.fFFwwwwFFf.',
  '.ffFFFFFFff.',
  '..ffffffff..',
];
const FIRE = { f: '#38bdf8', F: '#b4ecff', w: '#ffffff' };
const DIM = { f: '#1e7fae', F: '#5cc8e8', w: '#b4ecff' };
const EYE = '#0b3344';
const LIGHT = ['#7dd3fc', '#b4ecff', '#e0f8ff'];
const DRIP = '#7dd3fc';

export function drawLanternMid(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  paintRows(p, ROWS, { ...IRON, ...GLASS, ...WEED_C });
  paintRows(p, WEED, WEED_C, 6, 8);
  // The weed sways a pixel with the bob.
  if (bob) p.p(5, 17, WEED_C.s);
  if (wind) paintRows(p, SHRUNK, DIM, 10, 17);
  else if (hit) paintRows(p, FLARE, FIRE, 10, 11);
  else paintRows(p, FLAME[f % 3], FIRE, 10, 11);
  // The flare bursts up through the cap's vent.
  if (hit) paintRows(p, ['..w..', '.wFw.', '.FwF.', 'fFwFf'], FIRE, 13, 3);
  const dx = hit ? -3 : wind ? 2 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, bob),
    u = painter(pic, bob);

  // Its face in the flame: two hollow eyes looking left, and a small round mouth.
  if (wind) {
    // squeezed shut while it draws in
    u.row(42, 24 + dx, 26 + dx, EYE);
    u.row(42, 30 + dx, 32 + dx, EYE);
  } else if (hit) {
    u.r(23 + dx, 33, 3, 4, EYE);
    u.r(31 + dx, 33, 3, 4, EYE);
    u.r(27 + dx, 39, 3, 4, EYE);
  } else {
    u.r(25 + dx, 34, 2, 3, EYE);
    u.r(31 + dx, 34, 2, 3, EYE);
    u.p(28 + dx, 39, EYE);
    u.p(29 + dx, 39, EYE);
  }
  // Rivets down the posts, a glint on the glass.
  [26, 34, 42].forEach((y) => u.p(17 + dx, y, IRON.h));
  if (!hit) u.col(43 + dx, 25, 28, '#5cc8e8');

  // Its light: a broken ring of pale pixels round the glass, turning slowly; full in the flare.
  const ring = (n: number, rx: number, ry: number, c: string, step: number) => {
    for (let i = 0; i < n; i++) {
      if ((i + f) % step) continue;
      const a = (i / n) * Math.PI * 2;
      u.p(32 + dx + Math.cos(a) * rx, 34 + Math.sin(a) * ry, c);
    }
  };
  if (hit) {
    ring(40, 29, 27, LIGHT[2], 1);
    ring(28, 31, 30, LIGHT[0], 2);
  } else if (!wind) ring(36, 25, 24, LIGHT[(f >> 1) % 2], 3);

  // Lake water running off its base and dripping away.
  [
    [22, 0],
    [30, 3],
    [40, 5],
  ].forEach(([x, ph]) => {
    const k = (f + ph) % 8;
    if (k < 6) u.p(x + dx, 56 + k, DRIP);
    if (k < 2) u.p(x + dx, 55, DRIP);
  });
  // The flare throws spray off it.
  if (hit) {
    const v = painter(pic);
    [[6, 30], [10, 22], [4, 40], [12, 46], [56, 24], [58, 38], [8, 52]].forEach(([x, y], i) => v.r(x, y, 1 + (i % 2), 1 + (i % 2), i % 3 ? DRIP : LIGHT[2]));
  }
  return pic;
}
