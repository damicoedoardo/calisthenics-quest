import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';

/* The Plateau, the Chapter 3 enemy: a stone golem whose head is a flat mesa with grass on top.
   It stops you by standing still. It breathes slowly, its eyes smolder, and it slams. */

const STONE = ['#44403c', '#78716c', '#a8a29e'];
const DARK = '#292524';
const MOSS = ['#365314', '#4d7c0f', '#84cc16'];
const EYE = ['#b45309', '#f59e0b', '#fde68a'];

export function drawPlateau(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    u = painter(g, frame.bob ?? 0),
    l = painter(g, 0),
    hit = frame.fx === 'impact',
    raise = frame.right === 'up';

  // legs
  l.r(20, 50, 9, 9, STONE[1]);
  l.r(35, 50, 9, 9, STONE[1]);
  l.r(18, 57, 12, 3, STONE[0]);
  l.r(34, 57, 12, 3, STONE[0]);
  // torso
  u.poly([[15, 27], [49, 27], [47, 51], [17, 51]], STONE[1]);
  // head: a flat-topped mesa
  u.poly([[21, 13], [43, 13], [46, 27], [18, 27]], STONE[1]);
  u.row(12, 22, 42, MOSS[1]);
  u.row(11, 23, 41, MOSS[1]);
  // arms: boulders, the right one raised to slam or crashing down
  if (raise) {
    u.ellipse(9, 22, 6, 7, STONE[1]);
    u.ellipse(9, 13, 6, 5, STONE[1]);
  } else if (hit) {
    u.ellipse(10, 38, 6, 8, STONE[1]);
    u.ellipse(6, 52, 7, 6, STONE[1]);
  } else {
    u.ellipse(10, 36, 6, 9, STONE[1]);
    u.ellipse(9, 47, 6, 5, STONE[1]);
  }
  u.ellipse(54, 36, 6, 9, STONE[1]);
  u.ellipse(55, 47, 6, 5, STONE[1]);

  const out = outline(autoshade(g)),
    v = painter(out, frame.bob ?? 0);
  // cracks and chisel lines
  v.line(24, 31, 29, 38, DARK);
  v.line(29, 38, 27, 45, DARK);
  v.line(40, 33, 37, 41, DARK);
  v.line(26, 17, 24, 22, DARK);
  v.row(27, 19, 45, DARK);
  // moss on the mesa and a shoulder, tufts on top
  [23, 27, 31, 36, 40].forEach((x, i) => v.p(x, 10 - (i % 2), MOSS[2]));
  v.row(12, 22, 42, MOSS[1]);
  v.r(15, 27, 6, 2, MOSS[1]);
  v.p(16, 27, MOSS[2]);
  v.r(45, 28, 4, 2, MOSS[0]);
  // smoldering eyes
  const e = hit ? EYE[2] : f % 4 === 3 ? EYE[0] : EYE[1];
  v.r(25, 19, 5, 2, e);
  v.r(35, 19, 5, 2, e);
  if (!hit) {
    v.p(26, 19, EYE[2]);
    v.p(36, 19, EYE[2]);
  }
  // the slam shakes loose some rubble
  if (hit)
    [
      [2, 58],
      [12, 59],
      [5, 55],
      [15, 56],
    ].forEach(([x, y]) => v.r(x, y, 2, 2, STONE[2]));
  return out;
}
