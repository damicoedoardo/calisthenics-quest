import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';

/* Tomorrow, the Chapter 1 enemy: a sleepy gray slime in a nightcap. "I'll start tomorrow." It
   squashes as it breathes and lets out a lazy z. Its attack: a squash, then a lunge left. */

const GOO = ['#3f4a5c', '#64748b', '#94a3b8'];
const CAP = ['#1e2a5a', '#2f4590', '#5b74c4'];
const POM = '#e2e8f0';
const FACE = '#1e1b2e';
const Z = '#c7d2fe';

export function drawTomorrow(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    sq = frame.right === 'up' ? 2 : frame.bob ?? 0,
    hit = frame.fx === 'impact',
    dx = hit ? -7 : 0,
    cx = 32 + dx,
    top = 30 + sq * 3,
    rx = 21 + sq * 2 + (hit ? -2 : 0);

  // the blob: a dome on a flat, dripping base
  p.ellipse(cx, 50, rx, 50 - top, GOO[1]);
  p.r(cx - rx, 50, rx * 2 + 1, 7, GOO[1]);
  p.poly([[cx - rx - 2, 57], [cx + rx + 2, 57], [cx + rx, 54], [cx - rx, 54]], GOO[1]);
  [cx - 13, cx + 2, cx + 14].forEach((x, i) => p.r(x, 57, 3, 1 + ((f + i) % 3 === 0 ? 1 : 0), GOO[1]));
  // shine
  p.ellipse(cx - 9, top + 7, 4, 2.5, GOO[2]);
  // nightcap: a cone that flops over to the right
  p.poly([[cx - 13, top + 4], [cx + 9, top + 3], [cx + 7, top - 5], [cx + 21, top - 3], [cx + 17, top - 9], [cx + 3, top - 13], [cx - 8, top - 6]], CAP[1]);

  const out = outline(autoshade(g)),
    u = painter(out),
    ey = top + 13;
  // stripes and the cuff, then the pom-pom
  u.line(cx - 8, top - 3, cx + 6, top - 9, CAP[2]);
  u.line(cx - 10, top + 1, cx + 7, top - 4, CAP[0]);
  u.line(cx + 9, top - 6, cx + 17, top - 5, CAP[2]);
  u.row(top + 3, cx - 12, cx + 8, CAP[2]);
  u.row(top + 4, cx - 12, cx + 8, CAP[0]);
  u.ellipse(cx + 21, top - 3, 2.5, 2.5, POM);
  if (hit) {
    // awake for once: angry eyes
    u.line(cx - 10, ey - 1, cx - 5, ey + 1, FACE);
    u.line(cx + 9, ey - 1, cx + 4, ey + 1, FACE);
    u.r(cx - 8, ey + 2, 3, 3, FACE);
    u.r(cx + 4, ey + 2, 3, 3, FACE);
    u.r(cx - 3, ey + 7, 6, 3, FACE);
  } else {
    // heavy lids
    [cx - 10, cx + 4].forEach((x) => {
      u.row(ey, x, x + 5, FACE);
      u.r(x + 1, ey + 1, 4, 2, FACE);
      u.p(x + 2, ey + 1, '#ffffff');
    });
    // a lazy little smile with drool
    u.row(ey + 7, cx - 3, cx + 2, FACE);
    u.p(cx - 4, ey + 6, FACE);
    u.p(cx + 3, ey + 8, '#bfdbfe');
  }
  // z z z
  if (!hit) {
    const k = f % 8,
      zx = cx + 18 + (k >> 2),
      zy = top - 2 - k * 2;
    if (k < 7) {
      u.row(zy, zx, zx + 3, Z);
      u.line(zx + 3, zy, zx, zy + 3, Z);
      u.row(zy + 3, zx, zx + 3, Z);
    }
  }
  return out;
}
