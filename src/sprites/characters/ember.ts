import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';
import { FLAME } from '../palette';

/* Ember: your spark, a small flame with a face. Four frames: the tip sways and lifts, sparks rise. */

export function drawEmber(_o: unknown, _frame: unknown, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    sway = [0, 2, 0, -2][f],
    cx = 32,
    cy = 42,
    lift = f % 2;
  p.ellipse(cx, cy, 15, 14 - lift, FLAME.red[1]);
  p.poly(
    [
      [cx - 14, cy - 3],
      [cx + 14, cy - 3],
      [cx + 7 + sway, cy - 20],
      [cx + sway, cy - 32 + lift],
      [cx - 6 + sway, cy - 22],
    ],
    FLAME.red[1],
  );
  p.poly(
    [
      [cx - 15, cy - 1],
      [cx - 10, cy - 8],
      [cx - 18 + sway / 2, cy - 17],
    ],
    FLAME.red[1],
  );
  p.poly(
    [
      [cx + 15, cy - 1],
      [cx + 10, cy - 8],
      [cx + 19 + sway / 2, cy - 15],
    ],
    FLAME.red[1],
  );
  p.ellipse(cx, cy + 1, 12, 11.5, FLAME.orange[1]);
  p.poly(
    [
      [cx - 11, cy - 1],
      [cx + 11, cy - 1],
      [cx + 4 + sway, cy - 16],
      [cx + sway, cy - 24 + lift],
      [cx - 4 + sway, cy - 17],
    ],
    FLAME.orange[1],
  );
  p.ellipse(cx, cy + 2, 9, 9, FLAME.yellow);
  p.poly(
    [
      [cx - 8, cy],
      [cx + 8, cy],
      [cx + sway / 2, cy - 14],
    ],
    FLAME.yellow,
  );
  p.ellipse(cx, cy + 3, 7, 6.5, FLAME.core);
  const shaded = outline(autoshade(g)),
    face = painter(shaded),
    eye = FLAME.face;
  face.r(cx - 5, cy, 3, 4, eye);
  face.p(cx - 4, cy, '#ffffff');
  face.r(cx + 3, cy, 3, 4, eye);
  face.p(cx + 4, cy, '#ffffff');
  face.p(cx - 2, cy + 5, eye);
  face.row(cy + 6, cx - 1, cx + 1, eye);
  face.p(cx + 2, cy + 5, eye);
  face.r(cx - 8, cy + 4, 2, 1, FLAME.blush);
  face.r(cx + 7, cy + 4, 2, 1, FLAME.blush);
  [
    [cx - 10, cy - 28 - f * 2],
    [cx + 12, cy - 24 - ((f + 2) % 4) * 2],
    [cx + 3, cy - 36 - ((f + 1) % 4)],
  ].forEach(([x, y]) => {
    face.p(x, y, FLAME.yellow);
    face.p(x, y + 1, FLAME.orange[1]);
  });
  return shaded;
}
