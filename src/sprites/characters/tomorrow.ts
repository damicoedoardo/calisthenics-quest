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

const QUILT = ['#5b2a3a', '#8a3f55', '#c06a7e'];
const PATCH = ['#2f4f4f', '#4a7a6a', '#7fb3a0'];
const CLOCK = ['#7c5a1e', '#c9a23a', '#f2dc8a'];
const PILLOW = ['#9aa3b5', '#cfd6e4', '#f1f4fa'];

/* Tomorrow as the first dungeon's boss: the same sleepy slime, grown huge, curled on a pillow
   under a patched quilt, its nightcap flopped over. An alarm clock it has slept through is stuck
   in its goo. Its attack: its eyes snap open, it puffs up, and the clock rings. */
export function drawTomorrowBoss(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    breathe = frame.bob ?? 0,
    puff = wind ? 2 : hit ? 3 : 0,
    cx = 32,
    top = 18 - puff + breathe,
    rx = 27 + puff;

  // the pillow under it
  p.ellipse(cx + 2, 58, 29, 5, PILLOW[1]);
  // the blob: a wide dome on a flat base
  p.ellipse(cx, 50, rx, 50 - top, GOO[1]);
  p.r(cx - rx, 50, rx * 2 + 1, 6, GOO[1]);
  // the quilt, pulled up over its lower half
  p.poly([[cx - rx + 3, 56], [cx - rx + 1, 49], [cx - 8, 45], [cx + 14, 44], [cx + rx, 47], [cx + rx + 1, 56]], QUILT[1]);
  // nightcap: a long cone flopping over to the right, past its side
  p.poly([[cx - 16, top + 6], [cx + 10, top + 4], [cx + 9, top - 6], [cx + 24, top - 4], [cx + 28, top + 2], [cx + 22, top - 11], [cx + 4, top - 15], [cx - 10, top - 7]], CAP[1]);

  const out = outline(autoshade(g)),
    u = painter(out),
    ey = top + 13;
  // the quilt's patches and stitches
  u.r(cx - 14, 48, 7, 5, PATCH[1]);
  u.row(48, cx - 14, cx - 8, PATCH[2]);
  u.r(cx + 9, 47, 8, 5, PATCH[1]);
  u.row(47, cx + 9, cx + 16, PATCH[2]);
  for (let x = cx - rx + 6; x < cx + rx - 2; x += 3) u.p(x, 54, QUILT[2]);
  u.line(cx - 8, 45, cx + 14, 44, QUILT[2]);
  // shine on the goo
  u.ellipse(cx - 13, top + 8, 5, 2.5, GOO[2]);
  // stripes, cuff and pom-pom
  u.line(cx - 10, top - 4, cx + 8, top - 11, CAP[2]);
  u.line(cx - 12, top + 1, cx + 9, top - 5, CAP[0]);
  u.row(top + 4, cx - 15, cx + 10, CAP[2]);
  u.row(top + 5, cx - 15, cx + 10, CAP[0]);
  u.ellipse(cx + 28, top + 3, 3, 3, POM);
  // the alarm clock stuck in its side: two bells, a face, the hands at "later"
  const kx = cx - 22,
    ky = 45 + (hit ? (f % 2 ? -1 : 1) : 0);
  u.ellipse(kx, ky, 5, 5, CLOCK[1]);
  u.ellipse(kx, ky, 3.5, 3.5, '#fdf6e3');
  u.ellipse(kx - 4, ky - 5, 2, 1.5, CLOCK[2]);
  u.ellipse(kx + 4, ky - 5, 2, 1.5, CLOCK[2]);
  u.line(kx, ky, kx, ky - 3, FACE);
  u.line(kx, ky, kx + 2, ky + 1, FACE);
  if (hit) {
    // ringing: lines shaking off the bells
    u.line(kx - 8, ky - 8, kx - 10, ky - 10, CLOCK[2]);
    u.line(kx + 8, ky - 8, kx + 10, ky - 10, CLOCK[2]);
    u.line(kx - 9, ky - 3, kx - 12, ky - 3, CLOCK[2]);
  }
  if (wind || hit) {
    // awake, and cross about it
    u.line(cx - 13, ey - 2, cx - 6, ey + 1, FACE);
    u.line(cx + 12, ey - 2, cx + 5, ey + 1, FACE);
    u.r(cx - 11, ey + 2, 4, 4, FACE);
    u.r(cx + 5, ey + 2, 4, 4, FACE);
    u.p(cx - 10, ey + 2, '#ffffff');
    u.p(cx + 6, ey + 2, '#ffffff');
    u.ellipse(cx, ey + 10, 4, hit ? 3 : 2, FACE);
  } else {
    // heavy lids, a slow smile, drool
    [cx - 13, cx + 5].forEach((x) => {
      u.row(ey, x, x + 7, FACE);
      u.r(x + 1, ey + 1, 6, 2, FACE);
      u.p(x + 2, ey + 1, '#ffffff');
    });
    u.row(ey + 9, cx - 4, cx + 3, FACE);
    u.p(cx - 5, ey + 8, FACE);
    u.p(cx + 4, ey + 10, '#bfdbfe');
    u.p(cx + 4, ey + 11, '#bfdbfe');
    // a big Z and a small one, drifting up
    const k = f % 8,
      zx = cx + 20 + (k >> 2),
      zy = top - 8 - k * 2;
    if (k < 7) {
      u.row(zy, zx, zx + 4, Z);
      u.line(zx + 4, zy, zx, zy + 4, Z);
      u.row(zy + 4, zx, zx + 4, Z);
    }
    const j = (f + 4) % 8;
    if (j < 6) {
      const sx = cx + 14 + (j >> 2),
        sy = top - 2 - j * 2;
      u.row(sy, sx, sx + 2, Z);
      u.line(sx + 2, sy, sx, sy + 2, Z);
      u.row(sy + 2, sx, sx + 2, Z);
    }
  }
  return out;
}
