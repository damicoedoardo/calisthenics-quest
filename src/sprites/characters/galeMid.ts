import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Gale, the Summit's mid-boss: a pale wind spirit, a cloud of a head with its tail streaming
   back off it in tufts. Its cheeks are puffed full and its lips pursed, and wind streaks off it
   all the time. Its attack: it fills its cheeks fit to burst, eyes squeezed shut, then lets go,
   mouth wide, in a blast of streaks. 32x32 rows, doubled. */

const ROWS = [
  '................................',
  '................................',
  '................................',
  '..............wwww..............',
  '.........www.wwwwww.www.........',
  '........wwwwwwwwwwwwwwwww.......',
  '.......wwwwwwccccccccwwwwc...cc.',
  '......wwwwccccccccccccccccccbcwc',
  '.....wwwcccccccccccccccccccccbbc',
  '....wwcccccccccccccccccccccccbbb',
  '....wcccccccccccccccccccccccbb..',
  '...wccccccccccccccccccccccccb...',
  '...wcccccccccccccccccccccccbbcc.',
  '..wcccccccccccccccccccccccccbbbc',
  '..wcccccccccccccccccccccccccbbb.',
  '..wcccccccccccccccccccccccccb...',
  '..ccccccccccccccccccccccccccb...',
  '...ccccccccccccccccccccccccbbcc.',
  '...ccccccccccccccccccccccccbbbbb',
  '....cccccccccccccccccccccccbbb..',
  '.....ccccccccccccccccccccccbb...',
  '......bbcccccccccccccccccbb.....',
  '........bbbccbbbcccbbbccbb......',
  '...........bb...bbb...bb........',
];
/* The puffed cheek, bulging out of its face. */
const CHEEK = [
  '..wwww..',
  '.wwcccc.',
  'wwcccccb',
  'wcccccbb',
  'ccccccbb',
  '.cccbbb.',
  '..bbbb..',
];
const CLOUD = { w: '#ffffff', c: '#e2e8f0', b: '#b6c2d2' };
const SHADE = ['#94a3b8', '#cbd5e1'];
const INK = '#334155';
const LIP = '#64748b';
const STREAK = ['#ffffff', '#bae6fd'];

export function drawGaleMid(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  paintRows(p, ROWS, CLOUD, 1, 4);
  // The cheek: full, fuller as it gathers its breath, flat once it lets go.
  if (wind) paintRows(p, CHEEK, CLOUD, 0, 16);
  else if (!hit) paintRows(p, CHEEK.slice(1, 6).map((r) => r.slice(1)), CLOUD, 2, 18);
  // The tufts of its tail stream and flick.
  if (f % 4 < 2) p.p(31, 11 + (f % 2), CLOUD.b);
  const dx = hit ? -3 : wind ? 2 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, bob),
    u = painter(pic, bob);

  // Eyes: set hard under heavy brows, squeezed shut while it fills up, wide as it blasts.
  if (wind) {
    [[18, 31], [33, 31]].forEach(([x, y]) => {
      u.thick(x + dx, y - 1, x + 5 + dx, y + 1, 2, INK);
      u.line(x + dx, y + 3, x + 5 + dx, y + 1, INK);
    });
  } else {
    const h = hit ? 7 : 6;
    [18, 33].forEach((x, i) => {
      u.r(x + dx, 29, 5, h, INK);
      u.r(x + 1 + dx, 30, 2, 2, '#ffffff');
      if (i === 0) u.thick(x - 2 + dx, 25, x + 5 + dx, 27, 2, INK);
      else u.thick(x + dx, 27, x + 7 + dx, 25, 2, INK);
    });
  }
  // The cheek, round as a ball round its pursed lips; the far cheek's shade.
  if (!hit) {
    const cx = (wind ? 9 : 11) + dx,
      cy = 42,
      r = wind ? 9 : 8;
    for (let i = -12; i <= 28; i++) {
      const a = (i / 32) * Math.PI;
      u.p(cx + Math.cos(a) * r, cy + Math.sin(a) * r, SHADE[0]);
    }
    u.p(cx - 2, cy - 5, '#ffffff');
    u.p(cx - 1, cy - 5, '#ffffff');
    u.r(41 + dx, 39, 5, 2, SHADE[1]);
  }
  // The mouth: lips pursed tight at the front of the cheek, or blown wide open.
  if (hit) {
    u.r(5 + dx, 37, 9, 9, LIP);
    u.r(6 + dx, 38, 7, 7, '#1e293b');
  } else {
    const mx = (wind ? 1 : 3) + dx;
    u.r(mx, 40, 5, 5, LIP);
    u.r(mx + 1, 41, 3, 3, INK);
  }

  // Wind streaks: running back past it all the time, each ending in a curl.
  const v = painter(pic);
  [
    [10, 14],
    [58, 10],
  ].forEach(([y, len], i) => {
    const x = 60 - ((f * 8 + i * 29) % 64);
    v.row(y + bob, x, x + len, STREAK[i]);
    v.p(x + len + 1, y - 1 + bob, STREAK[i]);
    v.p(x + len + 2, y - 2 + bob, STREAK[i]);
    v.p(x + len + 1, y - 3 + bob, STREAK[i]);
  });
  if (hit)
    [
      [0, 34, 12],
      [0, 41, 16],
      [0, 48, 11],
      [2, 30, 6],
      [1, 53, 7],
    ].forEach(([x, y, len], i) => v.row(y, x, x + len, STREAK[i % 2]));
  else if (!wind) {
    const k = f % 4;
    v.row(42 + bob, Math.max(0, 1 - k), Math.max(0, 1 - k) + 1, STREAK[1]);
  }
  return pic;
}
