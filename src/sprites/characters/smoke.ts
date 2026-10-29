import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Smoker, a dungeon monster: a puff of soot from the Ashlands' chimneys, embers for eyes and a
   sharp-toothed grin, holding a bomb over
   its head with the fuse already lit. Its tail curls away like a trail of smoke. Its attack: it
   cocks the bomb back, then throws it (and it's gone from its hand). 32x32 rows, doubled. */

const ROWS = [
  '..........................u.....',
  '.........................uu.....',
  '........................kk......',
  '......................kkkkkk....',
  '.....................kwKkkkkk...',
  '.....................kKkkkkkk...',
  '.....................kkkkkkkk...',
  '......................kkkkkk....',
  '.................ccc...kkkk.....',
  '...............ccccccc.bcb......',
  '..............cbbccbbbcbbb......',
  '.............cbbbbbbbbbbbb......',
  '............cbbbbbbbbbbbbb......',
  '...........cbbbbbbbbbbbbbbc.....',
  '.....cc...cbbbbbbbbbbbbbbbbc....',
  '....cbbc.cbbbbbbbbbbbbbbbbbbc...',
  '....bbbbcbbbbbbbbbbbbbbbbbbbbb..',
  '....abbbbbbbbbbbbbbbbbbbbbbbbb..',
  '.....abbbbbbbbbbbbbbbbbbbbbbbb..',
  '......bbbbbbbbbbbbbbbbbbbbbbba..',
  '......abbbbbbbbbbbbbbbbbbbbbba..',
  '.......abbbbbbbbbbbbbbbbbbbba...',
  '........aabbbbbbbbbbbbbbbaaa....',
  '..........aaabbbbbbbbbaaa.......',
  '.............abbbbbbbaa.........',
  '..............abbbbba...........',
  '...............abbbbb...........',
  '................aabbbb..........',
  '..................abbbc.........',
  '...................aabb.c.......',
  '.....................aa.........',
  '................................',
];
const SMOKE = { a: '#3b3350', b: '#6a5d86', c: '#a597c4' };
const BOMB = { k: '#15131f', K: '#33304a', w: '#c7c2e0', u: '#a16207' };
const FACE = '#120e1a';
const EYE = ['#f59e0b', '#fde68a'];
const GLOW = '#a78bfa';
const SPARK = ['#f97316', '#fde047', '#ffffff'];

export function drawSmoke(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // the body sways as it floats; the bomb rides a little behind its hand. Winding up, it cocks the
  // bomb right back over its shoulder, its arm stretched out behind it.
  paintRows(p, ROWS, SMOKE);
  if (wind) p.r(24, 9, 4, 3, SMOKE.b);
  if (!hit) paintRows(p, ROWS, BOMB, wind ? 3 : 0, wind ? 5 : bob ? 1 : 0);
  const dx = hit ? -4 : wind ? 2 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, bob),
    u = painter(pic, bob);
  // seams between the puffs
  u.line(12 + dx, 40, 22 + dx, 44, SMOKE.a);
  u.line(38 + dx, 44, 50 + dx, 40, SMOKE.a);
  u.line(26 + dx, 52, 36 + dx, 54, SMOKE.a);
  // face: wide crescent eyes and a grin, a gasp of effort as it throws
  const ex = 20 + dx,
    ey = 32;
  if (wind)
    // squeezed shut with effort: > <
    [ex, ex + 12].forEach((x, i) => {
      u.line(x, ey + (i ? 3 : 0), x + 3, ey + 1.5, FACE);
      u.line(x, ey + (i ? 0 : 3), x + 3, ey + 1.5, FACE);
    });
  else
    // ember eyes, slanted, with a thin dark slit
    [ex, ex + 12].forEach((x, i) => {
      u.r(x, ey, 5, 4, EYE[0]);
      u.r(x + (i ? 0 : 3), ey, 2, 1, EYE[1]);
      u.col(x + (hit ? 1 : 2), ey + 1, ey + 3, FACE);
      // a cross brow, slanting down to the middle
      u.line(x - 1, ey - (i ? 1 : 3), x + 5, ey - (i ? 3 : 1), FACE);
    });
  if (wind) {
    u.r(ex + 5, ey + 7, 6, 2, FACE);
    // swoosh lines where the bomb swung back
    u.line(44 + dx, 2, 50 + dx, 0, SMOKE.c);
    u.line(42 + dx, 7, 47 + dx, 5, SMOKE.c);
  } else if (hit) u.r(ex + 6, ey + 7, 4, 4, FACE);
  else {
    // a wide grin full of little teeth
    u.row(ey + 7, ex + 1, ex + 15, FACE);
    u.r(ex + 3, ey + 8, 11, 2, FACE);
    for (let x = ex + 3; x <= ex + 13; x += 2) u.p(x, ey + 8, '#e7e5e4');
    u.p(ex, ey + 6, FACE);
    u.p(ex + 16, ey + 6, FACE);
  }
  // violet light glowing through the soot, and wisps curling up off its head
  u.p(16 + dx, 46, GLOW);
  u.p(44 + dx, 48, GLOW);
  [[26, 18, 0], [36, 16, 4]].forEach(([x, y, ph]) => {
    const k = (f + ph) % 8;
    if (k < 6) u.p(x + dx + (k % 3) - 1, y - k * 2, k < 3 ? SMOKE.c : SMOKE.b);
  });
  // the fuse spark sputters
  if (!hit) {
    const sx = 54 - dx + (wind ? 6 : 0),
      sy = wind ? 10 : bob ? 2 : 0,
      k = f % 3;
    u.p(sx, sy, SPARK[k]);
    u.p(sx + 1 - k, sy + 1, SPARK[(k + 1) % 3]);
    u.p(sx + 2, sy - (k === 1 ? 1 : 0), SPARK[0]);
    // it fizzes harder just before the throw
    if (wind) [[-2, -2], [3, -3], [-3, 2]].forEach(([x, y], i) => u.p(sx + x, sy + y, SPARK[i % 2]));
  }
  // after the throw: a puff where the bomb was, flying off to the left
  if (hit)
    [[40, 8, 3], [33, 6, 2], [6, 10, 6]].forEach(([x, y, s], i) => {
      if (i < 2) u.r(x, y, s, s, SMOKE.c);
      else {
        u.ellipse(x, y, s, s, BOMB.k);
        u.p(x - 2, y - 2, BOMB.w);
      }
    });
  return pic;
}
