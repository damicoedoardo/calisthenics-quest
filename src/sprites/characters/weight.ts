import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';

/* The Weight of Starting, the very first guardian: an old iron kettlebell, too heavy to lift and
   too tired to move. "Too heavy. Too late." It sighs as it breathes; its attack is a hop and a
   slam that shakes dust off the ground. */

const IRON = ['#292524', '#57534e', '#8a847e'];
const HANDLE = ['#1c1917', '#44403c', '#6b645e'];
const RUST = '#9a3412';
const EYE = '#e7e5e4';
const INK = '#0c0a09';
const DUST = '#a8a29e';

export function drawWeight(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    hit = frame.fx === 'impact',
    hop = frame.right === 'up' ? -5 : 0,
    p = painter(g, hop + (frame.bob ?? 0)),
    rx = hit ? 24 : 21,
    top = hit ? 28 : 24;

  // handle: an arch, hollow in the middle
  p.ellipse(32, top, 13, 10, HANDLE[1]);
  for (let y = top - 6; y <= top + 6; y++)
    for (let x = 25; x <= 39; x++) if (((x - 32) / 7) ** 2 + ((y - top) / 5) ** 2 <= 1) p.erase(x, y);
  // the bell, flat where it sits on the ground
  p.ellipse(32, 41 + (hit ? 1 : 0), rx, 16, IRON[1]);
  for (let x = 0; x < SIZE; x++) for (let y = 56; y < SIZE; y++) p.erase(x, y);

  const out = outline(autoshade(g)),
    u = painter(out, hop + (frame.bob ?? 0));
  // rust and a crack
  u.r(15, 44, 3, 2, RUST);
  u.p(46, 38, RUST);
  u.r(44, 48, 2, 2, RUST);
  u.line(40, 30, 37, 35, IRON[0]);
  u.line(37, 35, 39, 38, IRON[0]);
  // heavy-lidded, tired eyes
  const shut = f % 8 === 5;
  [23, 36].forEach((x) => {
    u.r(x, 39, 6, 3, shut ? IRON[0] : EYE);
    u.row(38, x - 1, x + 6, INK);
    if (!shut) u.r(x + 2, 40, 2, 2, INK);
  });
  // drooping brows and a long frown
  u.line(21, 35, 27, 37, INK);
  u.line(43, 35, 37, 37, INK);
  u.line(28, 49, 36, 49, INK);
  u.p(27, 50, INK);
  u.p(37, 50, INK);
  // the slam kicks up dust
  if (hit)
    [
      [5, 54],
      [9, 51],
      [55, 53],
      [58, 50],
      [12, 57],
      [51, 57],
    ].forEach(([x, y]) => u.r(x, y, 2, 2, DUST));
  return out;
}
