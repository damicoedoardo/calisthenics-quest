import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid, type Painter } from '../engine/grid';
import { SHADOW } from '../palette';
import { paintRows, shifted } from './pixel';

/* The Hollow as the dungeon's boss: not a monster. A tall, quiet shape in a long hood, head bowed,
   holding a small circle of soft light against its chest like something it's afraid to lose. Its
   eyes are two pale lines, looking down. Its attack: it holds the light out and it flares into a
   ring. When it's beaten it doesn't burst: it thins into motes from the hem up, and the light
   floats free. 32x32 rows, doubled. */

const ROWS = [
  '................................',
  '.............bbbbb..............',
  '............bbbbbbb.............',
  '...........bbbbbbbbb............',
  '...........bbbbbbbbb............',
  '..........bbffffbbbbb...........',
  '..........bffffffbbbb...........',
  '...........ffffffbbb............',
  '...........ffffffbbb............',
  '...........ffffffbbbb...........',
  '.........a.bffffbbbbba..........',
  '.........aabbbbbbbbbbaa.........',
  '.........aabbbbbbbbbaaa.........',
  '.........aabbbbbbbbbaa..........',
  '.........bababbbbabbaaa.........',
  '.........bababbbbabbaaa.........',
  '.........bababbbbabbaaa.........',
  '.........bbbabbbbabbbaa.........',
  '........cbbbabbbbabbbaaa........',
  '........cbbbabbbbabbbaaa........',
  '........cbbbabbbbabbbaaa........',
  '........cbbbabbbbabbbaaa........',
  '.......ccbbbabbbbabbbaaaa.......',
  '.......ccbbbabbbbabbbaaaa.......',
  '.......ccbbbabbbbabbbaaaa.......',
  '.......ccbbbabbbbabbbaaaa.......',
  '.......ccbbbabbbbabbbaaaa.......',
  '......cccbbbabbbbabbbaaaaa......',
  '......cccbbbabbbbabbbaaaaa......',
  '......cccbbbabbbbabbbaaaaa.a....',
  '......ccc.bba.bbb.bbb.aaa.aaa...',
  '.......c...b...b...b...a...a....',
];
const PAL = { a: SHADOW[1], b: SHADOW[2], c: SHADOW[3], f: SHADOW[0] };
const RIM = '#5b5280';
const EYES = '#c7d2fe';
const LIGHT = ['#a16207', '#fcd34d', '#fef3c7', '#ffffff'];

/** The figure, the bob applied (it sways rather than bobs: it's tired). */
function figure(frame: ClipFrame, f: number): Grid {
  const g = grid(32);
  paintRows(painter(g), ROWS, PAL);
  let pic = outline(autoshade(scale2x(g)));
  // a cold rim of light along its left side, from the light it holds
  pic = pic.map((row, y) => row.map((c, x) => (c && !row[x - 1] && y > 8 && y < 58 ? RIM : c)));
  const sway = frame.right === 'up' ? 2 : [0, 0, 1, 1, 1, 1, 0, 0][f % 8];
  return shifted(pic, 0, sway);
}

/** The light it holds: a soft disc with a dithered halo; r grows when it flares. */
function light(u: Painter, x: number, y: number, r: number, f: number) {
  for (let j = -r - 3; j <= r + 3; j++)
    for (let i = -r - 3; i <= r + 3; i++) {
      const d = Math.hypot(i, j);
      if (d <= r - 2) u.p(x + i, y + j, d < r / 3 ? LIGHT[3] : LIGHT[2]);
      else if (d <= r) u.p(x + i, y + j, LIGHT[1]);
      else if (d <= r + 3 && (i + j + f) % 2 === 0) u.p(x + i, y + j, LIGHT[d < r + 1.5 ? 1 : 0]);
    }
}

export function drawHollowBoss(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    pic = figure(frame, f),
    sway = wind ? 2 : [0, 0, 1, 1, 1, 1, 0, 0][f % 8],
    u = painter(pic, sway);
  // eyes: two pale lines, looking down
  u.row(16, 22, 24, EYES);
  u.row(16, 28, 30, EYES);
  u.p(22, 15, PAL.a);
  u.p(30, 15, PAL.a);
  // the light against its chest, cupped in its hands; dimmer as it gathers itself, then flaring
  const pulse = f % 8 < 4 ? 0 : 1;
  light(u, 30, 30, wind ? 3 : hit ? 6 : 4 + pulse, f);
  u.r(24, 34, 4, 3, PAL.c);
  u.r(33, 34, 4, 3, PAL.c);
  if (hit) {
    // the flare: a ring of light pushed out from the circle
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2;
      u.p(30 + Math.cos(t) * 16, 30 + Math.sin(t) * 13, a % 2 ? LIGHT[2] : LIGHT[1]);
    }
  }
  return pic;
}

/** Fading, played once: it thins from the hem up into motes, and the light rises free. */
export function drawHollowFade(_o: unknown, _frame: ClipFrame, f: number): Grid {
  const pic = figure({}, 0),
    cut = 64 - (f + 1) * 16;
  // below the line it's gone; just above it, it breaks into scattered motes that drift up
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      if (!pic[y][x]) continue;
      if (y > cut + 8) pic[y][x] = null;
      else if (y > cut - 4 && (x * 7 + y * 3) % 5) pic[y][x] = null;
    }
  const u = painter(pic);
  for (let i = 0; i < 10; i++) u.p(16 + ((i * 13) % 34), cut - (i % 4) * 5 - f * 2, i % 3 ? SHADOW[3] : LIGHT[2]);
  light(u, 30, 30 - f * 8, 4 + (f > 1 ? 1 : 0), f);
  return pic;
}
