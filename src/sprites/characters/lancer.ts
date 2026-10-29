import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { shifted } from './pixel';

/* The Lancer Husk, a dungeon monster: an empty suit of ash-grey armor that still stands guard. Two
   embers float where its eyes were, a torn red cape hangs off its back, and it holds a long lance
   low in front of it with a little pennant. Its attack is the charge: it rears back with the lance
   raised, its eyes flare red, then it thrusts forward. Faces left; 32x32, doubled. */

const PLATE = ['#2b2b33', '#55555f', '#8a8a96'];
const CAPE = ['#5a1414', '#8f2323', '#c0392b'];
const HAFT = ['#3b2614', '#6b4423'];
const TIP = '#d4d4d8';
const PENNANT = '#e8c547';
const EMBER = ['#b45309', '#f59e0b', '#fde68a'];
const RAGE = ['#7f1d1d', '#ef4444', '#fecaca'];
const DUST = ['#78716c', '#a8a29e'];

export function drawLancer(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // the cape, flapping behind it (right)
  const flap = f % 4 < 2 ? 0 : 1;
  p.poly([[18, 10], [22, 10], [27 + flap, 22], [24, 21], [26 + flap, 25], [20, 23]], CAPE[1]);
  // legs: plated, apart, a step forward on the thrust
  const step = hit ? -2 : 0;
  p.r(13 + step, 21, 3, 7, PLATE[1]);
  p.r(18, 21, 3, 7, PLATE[1]);
  p.r(12 + step, 27, 5, 2, PLATE[0]);
  p.r(17, 27, 5, 2, PLATE[0]);
  // the body: a barrel of a breastplate, a skirt of plates, a big pauldron
  p.ellipse(17, 16, 5, 6, PLATE[1]);
  p.r(12, 19, 10, 3, PLATE[1]);
  p.ellipse(20, 12, 4, 3, PLATE[2]);
  // the helm: a bucket with a crest
  p.r(13, 4, 7, 7, PLATE[1]);
  p.r(14, 3, 5, 1, PLATE[1]);
  p.poly([[15, 3], [20, 0], [22, 1], [18, 3]], CAPE[2]);
  // the lance: low and level, raised back on the wind-up, thrust out on the hit
  const [hx, hy, tx, ty] = wind ? [24, 14, 4, 3] : hit ? [22, 16, 0, 16] : [24, 17, 1, 17];
  p.thick(hx, hy, tx, ty, 1, HAFT[1]);
  p.line(tx, ty, tx + (hx - tx) * 0.2, ty + (hy - ty) * 0.2, TIP);
  // the gauntlet round the haft
  p.r(Math.round(hx - (hx - tx) * 0.3) - 1, Math.round(hy - (hy - ty) * 0.3) - 1, 3, 3, PLATE[2]);
  // the vambrace guard at the grip
  p.ellipse(hx - (hx - tx) * 0.62, hy - (hy - ty) * 0.62, 1.5, 2.5, PLATE[2]);

  const dx = hit ? -2 : wind ? 2 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, bob + (wind ? -1 : 0)),
    u = painter(pic, bob + (wind ? -1 : 0));
  // the visor slit, and the embers floating inside the empty helm
  u.r(27 + dx, 13, 12, 3, '#0c0a10');
  const E = wind || hit ? RAGE : EMBER;
  [28, 33].forEach((x, i) => {
    u.r(x + dx, 13, 3, 2, E[1]);
    u.p(x + dx + (i ? 0 : 2), 13, E[2]);
  });
  // rivets and a dent on the breastplate, the pennant on the lance
  [[30, 28], [38, 30], [34, 36]].forEach(([x, y]) => u.p(x + dx, y, PLATE[2]));
  u.line(28 + dx, 32, 32 + dx, 34, PLATE[0]);
  const px = (wind ? 14 : hit ? 6 : 10) + dx,
    py = wind ? 13 : hit ? 31 : 34,
    wave = f % 4 < 2 ? 0 : 1;
  u.poly([[px, py], [px + 6, py + 1 + wave], [px, py + 4]], PENNANT);
  // the wind-up: sparks off the tip; the thrust: dust and speed lines
  if (wind) [[8, 4], [12, 2], [6, 8]].forEach(([x, y], i) => u.p(x + dx, y, E[i % 3]));
  if (hit) {
    const v = painter(pic);
    [[50, 58, 3], [56, 55, 2], [60, 59, 2]].forEach(([x, y, s], i) => v.r(x, y, s, s, DUST[i % 2]));
    [22, 30, 40].forEach((y, i) => v.row(y, 54 - i * 2, 63, DUST[1]));
  }
  return pic;
}
