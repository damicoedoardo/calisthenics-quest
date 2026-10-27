import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Smoker, a dungeon monster: a lavender puff of smoke with a cheeky grin, holding a bomb over
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
const SMOKE = { a: '#5b3f8c', b: '#9d84d6', c: '#cdbdf2' };
const BOMB = { k: '#1c1a2b', K: '#3a3656', w: '#8f8ab0', u: '#a16207' };
const FACE = '#24163f';
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
    [ex, ex + 12].forEach((x) => {
      u.r(x, ey, 4, 4, '#ffffff');
      u.r(x + (hit ? 0 : 1), ey + 1, 2, 3, FACE);
      u.row(ey - 2, x - 1, x + 3, FACE);
    });
  if (wind) {
    u.r(ex + 5, ey + 7, 6, 2, FACE);
    // swoosh lines where the bomb swung back
    u.line(44 + dx, 2, 50 + dx, 0, SMOKE.c);
    u.line(42 + dx, 7, 47 + dx, 5, SMOKE.c);
  } else if (hit) u.r(ex + 6, ey + 7, 4, 4, FACE);
  else {
    u.row(ey + 8, ex + 3, ex + 11, FACE);
    u.p(ex + 2, ey + 7, FACE);
    u.p(ex + 12, ey + 7, FACE);
    u.r(ex + 6, ey + 9, 3, 1, '#f0abfc');
  }
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
