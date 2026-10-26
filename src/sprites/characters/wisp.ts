import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';

/* Ash Wisp, the road's common enemy: a puff of grey ash that never quite went out. It floats, its
   tail sways, flakes of ash drift off it. Its attack: a lunge left with its eyes flaring. */

const ASH = ['#3f444e', '#6b7280', '#a3a9b4'];
const EYE = ['#c2410c', '#f97316', '#fde68a'];
const MOUTH = '#1f2228';
const SWAY = [0, 1, 2, 1, 0, -1, -2, -1];

export function drawWisp(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g, frame.bob ?? 0),
    hit = frame.fx === 'impact',
    wind = frame.right === 'up',
    cx = 32 + (hit ? -8 : wind ? 2 : 0),
    s = SWAY[f % 8];

  // head and the tufts that flicker on top
  p.ellipse(cx, 31, 14, 13, ASH[1]);
  p.poly([[cx - 10, 24], [cx - 7, 12 + (f % 2)], [cx - 2, 21]], ASH[1]);
  p.poly([[cx - 3, 20], [cx + 3, 8 - (f % 2)], [cx + 7, 20]], ASH[1]);
  p.poly([[cx + 5, 22], [cx + 11, 15], [cx + 12, 26]], ASH[1]);
  // the tail, curling and swaying under it
  p.poly([[cx - 13, 33], [cx + 13, 33], [cx + 8 + s, 46], [cx + 2 + s * 2, 53], [cx - 4 + s, 47]], ASH[1]);
  p.poly([[cx + 2 + s * 2, 53], [cx + 8 + s * 2, 56], [cx + 4 + s * 2, 50]], ASH[1]);

  const out = outline(autoshade(g)),
    u = painter(out, frame.bob ?? 0),
    e = hit ? EYE[2] : EYE[1];
  // a pale glow where it's still warm
  u.ellipse(cx - 5, 26, 4, 3, ASH[2]);
  u.p(cx - 8, 30, ASH[2]);
  // angry slanted eyes
  u.r(cx - 8, 31, 4, 4, e);
  u.r(cx + 3, 31, 4, 4, e);
  u.row(30, cx - 9, cx - 6, MOUTH);
  u.row(30, cx + 5, cx + 8, MOUTH);
  u.p(cx - 5, 31, MOUTH);
  u.p(cx + 3, 31, MOUTH);
  if (!hit) {
    u.p(cx - 7, 32, EYE[2]);
    u.p(cx + 4, 32, EYE[2]);
    u.r(cx - 8, 34, 4, 1, EYE[0]);
    u.r(cx + 3, 34, 4, 1, EYE[0]);
  }
  // mouth: a jagged grin, wide open when it strikes
  if (hit) u.r(cx - 3, 37, 6, 4, MOUTH);
  else {
    u.row(38, cx - 3, cx + 2, MOUTH);
    u.p(cx - 2, 37, MOUTH);
    u.p(cx + 1, 37, MOUTH);
  }
  // ash flakes drifting up and away
  [
    [cx - 16, 40, 0],
    [cx + 15, 34, 3],
    [cx + 8, 18, 5],
    [cx - 13, 22, 6],
  ].forEach(([x, y, ph]) => {
    const k = (f + ph) % 8;
    if (k < 6) u.p(x + (k % 3) - 1, y - k * 2, k < 3 ? ASH[2] : ASH[1]);
  });
  return out;
}
