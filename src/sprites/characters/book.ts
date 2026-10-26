import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';
import { R } from '../palette';

/* The Book of Days: old leather, every page blank, glowing faintly. It floats; over the hover clip
   the right page lifts at the corner and motes of light rise from the pages. */

const PAGE = ['#c9b994', '#efe4c8', '#fbf6e8'];
const RIBBON = ['#7f1d1d', '#b91c1c'];
const GLOW = '#fde68a';

export function drawBook(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g, frame.bob ?? 0),
    L = R.leather,
    G = R.gold,
    lift = [0, 1, 2, 2, 1, 0, 0, 0][f % 8];

  // covers
  p.poly([[5, 27], [32, 32], [32, 50], [5, 45]], L[1]);
  p.poly([[32, 32], [59, 27], [59, 45], [32, 50]], L[1]);
  // page stacks (the edges you see under each page)
  p.poly([[8, 26], [31, 30], [31, 47], [8, 43]], PAGE[0]);
  p.poly([[33, 30], [56, 26], [56, 43], [33, 47]], PAGE[0]);
  // the open pages, curving up from the spine
  p.poly([[8, 23], [20, 23], [31, 28], [31, 45], [8, 41]], PAGE[1]);
  p.poly([[33, 28], [44, 23], [56, 23 - lift], [56, 41 - lift], [33, 45]], PAGE[1]);
  p.col(32, 28, 47, L[0]);
  // gold corner caps
  p.poly([[5, 41], [10, 45], [5, 45]], G[1]);
  p.poly([[59, 41], [54, 45], [59, 45]], G[1]);
  // ribbon hanging from the spine
  p.r(31, 48, 3, 10, RIBBON[1]);
  p.poly([[31, 57], [33, 57], [33, 61], [32, 60], [31, 61]], RIBBON[1]);

  const out = outline(autoshade(g)),
    u = painter(out, frame.bob ?? 0);
  u.col(33, 49, 57, RIBBON[0]);
  // a soft glow along the page tops
  u.line(10, 24, 19, 24, PAGE[2]);
  u.line(45, 24 - lift, 54, 24 - lift, PAGE[2]);
  // faint ruled lines, nothing written yet
  [30, 34, 38].forEach((y) => {
    u.line(11, y - 4, 28, y, PAGE[0]);
    u.line(36, y, 53, y - 4 - lift, PAGE[0]);
  });
  // motes rising
  [
    [18, 18, 0],
    [44, 15, 3],
    [30, 12, 5],
  ].forEach(([x, y, phase]) => {
    const k = (f + phase) % 8;
    if (k < 6) u.p(x + (k >> 1) % 2, y - k * 2, k < 3 ? GLOW : G[2]);
  });
  return out;
}
