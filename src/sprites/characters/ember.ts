import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';
import { FLAME } from '../palette';

/* Ember: your spark. A chubby flame spirit with a big face and manga eyes. Over the hover clip her
   tip curls side to side, she breathes, sparks rise, and she blinks once. */

/** Tip sway per frame (8 frames). */
const SWAY = [0, 1, 2, 1, 0, -1, -2, -1];
const BLINK_FRAME = 6;
const MOUTH = '#7f1d1d';

export function drawEmber(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    s = SWAY[f % SWAY.length],
    b = frame.bob ?? 0,
    cx = 32,
    cy = 43 + b;

  // outer flame: a round body, a tall curling tip, a small second tip and two little arms
  p.ellipse(cx, cy, 18, 15 - b, FLAME.red[1]);
  p.poly([[cx - 11, cy - 10], [cx + 12, cy - 8], [cx + 9, cy - 24], [cx + 5 + s, cy - 37 + b], [cx + 1, cy - 26], [cx - 4, cy - 22]], FLAME.red[1]);
  p.poly([[cx - 15, cy - 6], [cx - 6, cy - 14], [cx - 11 + s, cy - 27 + b]], FLAME.red[1]);
  p.poly([[cx - 17, cy + 2], [cx - 16, cy - 5], [cx - 23 + s / 2, cy - 7]], FLAME.red[1]);
  p.poly([[cx + 17, cy + 2], [cx + 16, cy - 5], [cx + 23 + s / 2, cy - 8]], FLAME.red[1]);
  // middle
  p.ellipse(cx, cy + 1, 15, 12.5 - b, FLAME.orange[1]);
  p.poly([[cx - 8, cy - 9], [cx + 9, cy - 8], [cx + 6, cy - 20], [cx + 4 + s, cy - 30 + b], [cx - 1, cy - 19]], FLAME.orange[1]);
  // the face glows
  p.ellipse(cx, cy + 2, 12.5, 10.5 - b, FLAME.yellow);
  p.poly([[cx - 4, cy - 7], [cx + 6, cy - 7], [cx + 3 + s / 2, cy - 19 + b]], FLAME.yellow);
  p.ellipse(cx, cy + 3, 10.5, 8.5 - b, FLAME.core);

  const out = outline(autoshade(g)),
    face = painter(out),
    E = FLAME.face,
    ey = cy - 4;
  [cx - 9, cx + 4].forEach((x) => {
    if (f === BLINK_FRAME) {
      // closed: happy arcs
      face.row(ey + 4, x + 1, x + 3, E);
      face.p(x, ey + 3, E);
      face.p(x + 4, ey + 3, E);
    } else {
      // rounded: corners cut, a big shine top-left, a small one bottom-right
      face.row(ey, x + 1, x + 3, E);
      face.r(x, ey + 1, 5, 5, E);
      face.row(ey + 6, x + 1, x + 3, E);
      face.r(x + 1, ey + 1, 2, 2, '#ffffff');
      face.p(x + 3, ey + 4, '#ffffff');
      face.row(ey + 5, x + 1, x + 2, FLAME.orange[0]);
    }
  });
  // small open smile, blush
  face.r(cx - 1, ey + 8, 3, 2, MOUTH);
  face.p(cx, ey + 9, FLAME.blush);
  face.r(cx - 13, ey + 7, 3, 2, FLAME.blush);
  face.r(cx + 11, ey + 7, 3, 2, FLAME.blush);

  // sparks drifting up
  [
    [cx - 14, 16, 0],
    [cx + 15, 18, 3],
    [cx + 9, 6, 5],
  ].forEach(([x, y, phase]) => {
    const k = (f + phase) % 8;
    if (k > 5) return;
    face.p(x + (k % 2), y - k * 2, FLAME.yellow);
    if (k < 4) face.p(x + (k % 2), y - k * 2 + 1, FLAME.orange[1]);
  });
  return out;
}
