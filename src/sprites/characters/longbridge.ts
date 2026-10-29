import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';

/* The Long Bridge, the Ember Road's third world: its own monster, its mid-boss and its boss.
   - The Loner: a hooded traveller crouched behind a great round shield, peering over the rim.
   - The Tollkeeper: a stout old keeper of the bridge, a coin box on a strap and a plank for a club.
   - The One Who Walks Alone: a traveller grown into armor, arms folded, a huge pack of burdens on
     its back that it never puts down. It sheds plates as the fight goes; at the end, the helm is
     off and a tired face looks out. */

const CLOTH = ['#2b2a36', '#45445a', '#646380'];
const SHIELD = ['#3b2414', '#6b4226', '#9a6a3e', '#c9975e'];
const IRON = ['#26262b', '#4a4a52', '#7b7b86', '#b5b5c0'];
const SKIN = ['#8a5a3c', '#c08a62', '#e3b48a'];
const FACE = '#14121c';

/* The Loner. It peers over its shield. Its attack: it bashes forward with the shield. */
export function drawLoner(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    hit = frame.fx === 'impact',
    wind = frame.right === 'up',
    bob = frame.bob ?? 0,
    push = hit ? -4 : wind ? 2 : 0,
    top = 14 + bob;
  // the hooded body behind, crouched
  p.ellipse(36, top + 26, 13, 16, CLOTH[1]);
  p.ellipse(36, top + 8, 9, 9, CLOTH[1]);
  p.r(30, 54, 5, 8, CLOTH[0]);
  p.r(39, 54, 5, 8, CLOTH[0]);
  // the round shield, held out to the left (monsters face left)
  const sx = 24 + push,
    sy = top + 26;
  p.ellipse(sx, sy, 15, 17, SHIELD[1]);
  const out = outline(autoshade(g)),
    u = painter(out);
  // planks of the shield, an iron rim and a boss in the middle
  for (let x = sx - 10; x <= sx + 10; x += 5) u.col(x, sy - 14, sy + 14, SHIELD[0]);
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    u.p(sx + Math.cos(t) * 14, sy + Math.sin(t) * 16, a % 3 ? IRON[1] : IRON[2]);
  }
  u.ellipse(sx, sy, 3.5, 3.5, IRON[2]);
  u.p(sx - 1, sy - 1, IRON[3]);
  // scratches from a long road
  u.line(sx - 8, sy - 6, sx - 3, sy - 2, SHIELD[3]);
  u.line(sx + 2, sy + 6, sx + 7, sy + 9, SHIELD[3]);
  // eyes peering over the rim from the dark of the hood, wary
  const ey = top + 8;
  u.r(32, ey - 2, 10, 6, FACE);
  u.r(33, ey, 2, 2, hit ? '#fde68a' : '#e5e7eb');
  u.r(38, ey, 2, 2, hit ? '#fde68a' : '#e5e7eb');
  u.line(32, ey - 1, 35, ey, CLOTH[0]);
  // a walking stick over the shoulder
  u.line(44, top - 4, 48, top + 32, SHIELD[2]);
  // road dust at its feet, kicked up as it shoves
  if (hit) for (let i = 0; i < 4; i++) u.p(16 + i * 3 + (f % 2), 61 - (i % 2), '#9c8f7a');
  return out;
}

const COAT = ['#3d2a1c', '#5f4630', '#86684a'];
const BEARD = ['#6b6b6b', '#9ca3af', '#d1d5db'];

/* The Tollkeeper. It stands square across the planks, coin box on its belly. Its attack: it
   raises the plank and stamps. */
export function drawTollMid(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    hit = frame.fx === 'impact',
    wind = frame.right === 'up',
    bob = frame.bob ?? 0,
    stamp = hit ? 2 : 0,
    top = 10 + bob + stamp;
  // a stout body in a long coat, short legs, a big head
  p.ellipse(32, top + 32, 19, 18, COAT[1]);
  p.r(23, 52, 7, 10, COAT[0]);
  p.r(34, 52, 7, 10, COAT[0]);
  p.ellipse(32, top + 10, 11, 10, SKIN[1]);
  // the plank club, raised or resting on its shoulder
  if (wind || hit) p.thick(50, top + 24, 56, top - 6, 5, SHIELD[2]);
  else p.thick(48, top + 30, 58, top + 8, 5, SHIELD[2]);
  // the coin box on a strap
  p.r(24, top + 30, 16, 12, SHIELD[1]);
  const out = outline(autoshade(g)),
    u = painter(out);
  u.line(20, top + 20, 30, top + 30, '#a8854e');
  u.line(44, top + 20, 36, top + 30, '#a8854e');
  u.r(29, top + 33, 6, 2, FACE);
  u.r(26, top + 37, 12, 1, SHIELD[0]);
  // nails in the plank
  for (let i = 0; i < 3; i++) u.p(wind || hit ? 52 + i : 50 + i * 3, wind || hit ? top + 16 - i * 7 : top + 26 - i * 6, IRON[2]);
  // a big grey beard and bushy brows, a stern look
  u.poly([[23, top + 12], [41, top + 12], [38, top + 24], [32, top + 28], [26, top + 24]], BEARD[1]);
  for (let x = 25; x <= 39; x += 3) u.line(x, top + 14, x + ((x % 2) - 0.5), top + 22, BEARD[x % 2 ? 0 : 2]);
  const ey = top + 7;
  u.r(25, ey - 2, 6, 2, BEARD[2]);
  u.r(33, ey - 2, 6, 2, BEARD[2]);
  u.r(27, ey, 2, 2, FACE);
  u.r(35, ey, 2, 2, FACE);
  u.ellipse(32, ey + 4, 2, 2, SKIN[0]);
  // a coin glinting at the slot
  if (f % 6 < 2) u.p(32, top + 32, '#fde047');
  // dust from the stamp
  if (hit) for (let i = 0; i < 6; i++) u.p(16 + i * 6, 62 - (i % 2), '#9c8f7a');
  return out;
}

export interface AloneOpts {
  stage: 0 | 1 | 2;
}

const PLATE = ['#3a3f4a', '#5e6573', '#8e96a5', '#c8ced8'];
const PACK = ['#3b2a1a', '#5f4630', '#8a6a46'];

/* The One Who Walks Alone. Arms folded, the pack of burdens high on its back. Its attack: it
   unfolds its arms and swings a fist. Stage 1: the shoulder plates gone, cracks across the chest;
   stage 2: the helm off, a tired face, the pack slipping. */
export function drawAloneBoss(o: AloneOpts, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    stage = o.stage,
    hit = frame.fx === 'impact',
    wind = frame.right === 'up',
    bob = frame.bob ?? 0,
    top = 6 + bob,
    cx = 32;
  // the pack: a tall heap of bundles strapped together, higher than its head
  const slip = stage === 2 ? 3 : 0;
  p.r(cx - 2, top + slip, 22, 30, PACK[1]);
  p.ellipse(cx + 9, top + 2 + slip, 10, 6, PACK[2]);
  // legs, body and head
  p.r(cx - 10, 46, 8, 16, PLATE[1]);
  p.r(cx + 2, 46, 8, 16, PLATE[1]);
  p.ellipse(cx, top + 34, 15, 15, PLATE[2]);
  if (stage < 2) p.r(cx - 7, top + 6, 14, 14, PLATE[2]);
  else p.ellipse(cx, top + 13, 7, 8, SKIN[1]);
  // the shoulder plates, until stage 1
  if (stage === 0) {
    p.ellipse(cx - 14, top + 24, 6, 5, PLATE[3]);
    p.ellipse(cx + 14, top + 24, 6, 5, PLATE[3]);
  }
  // the arms: folded over the chest, or one out in a swing
  if (hit || wind) {
    p.thick(cx - 12, top + 28, cx - 28, top + 22, 5, PLATE[1]);
    p.ellipse(cx - 29, top + 21, 4, 4, PLATE[2]);
  } else p.r(cx - 12, top + 31, 24, 6, PLATE[1]);
  const out = outline(autoshade(g)),
    u = painter(out);
  // straps and bundles of the pack
  u.line(cx - 8, top + 22, cx + 6, top + 6 + slip, PACK[0]);
  u.row(top + 12 + slip, cx, cx + 18, PACK[0]);
  u.row(top + 22 + slip, cx + 2, cx + 18, PACK[0]);
  u.r(cx + 12, top + 14 + slip, 4, 4, '#a8854e');
  // the chest plate's ridge, and the cracks once plates fall
  u.col(cx, top + 26, top + 44, PLATE[3]);
  if (stage >= 1) {
    u.line(cx - 8, top + 28, cx - 3, top + 36, FACE);
    u.line(cx + 6, top + 30, cx + 2, top + 40, FACE);
    u.p(cx - 14, top + 25, PLATE[0]);
    u.p(cx + 14, top + 25, PLATE[0]);
  }
  if (stage === 2) u.line(cx - 2, top + 40, cx + 4, top + 46, FACE);
  // the face: a closed helm with a thin slit, or, helm off, tired eyes and a small mouth
  if (stage < 2) {
    u.row(top + 12, cx - 5, cx + 5, FACE);
    u.p(cx - 2, top + 12, hit ? '#fca5a5' : '#e5e7eb');
    u.p(cx + 2, top + 12, hit ? '#fca5a5' : '#e5e7eb');
    u.col(cx, top + 14, top + 18, PLATE[1]);
  } else {
    u.r(cx - 5, top + 6, 10, 3, '#3b2a1a');
    u.line(cx - 4, top + 12, cx - 2, top + 13, FACE);
    u.line(cx + 2, top + 13, cx + 4, top + 12, FACE);
    u.p(cx - 3, top + 14, SKIN[0]);
    u.p(cx + 3, top + 14, SKIN[0]);
    u.row(top + 17, cx - 1, cx + 1, SKIN[0]);
  }
  // a plate falling off at stage 1-2, now and then
  if (stage >= 1 && f % 8 < 3) u.r(cx + 16, top + 40 + (f % 8) * 4, 3, 2, PLATE[3]);
  return out;
}

const BANNER = ['#7f1d1d', '#b91c1c', '#dc2626', '#f87171'];
const THREAD = ['#b45309', '#f59e0b', '#fde68a'];

/* The Road Banner, kept at the road's end: a red banner on a pole, an ember stitched in its middle
   and rows of stitched names under it, its tail flapping in the wind. */
export function drawRoadBanner(_o: unknown, _frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    wave = [0, 1, 2, 1][f % 4];
  // the pole and its crossbar, a gold knob on top
  p.r(14, 6, 3, 56, SHIELD[1]);
  p.r(12, 8, 38, 3, SHIELD[2]);
  // the cloth, hanging from the bar, its tail split in two and moving
  p.poly([[17, 11], [48, 11], [48 + wave, 46], [40, 40 + wave], [32 + wave, 50], [24, 42 - wave], [17, 48]], BANNER[1]);
  const out = outline(autoshade(g)),
    u = painter(out);
  u.ellipse(15, 6, 2.5, 2.5, THREAD[1]);
  u.p(14, 5, THREAD[2]);
  // a stitched border
  for (let x = 19; x <= 46; x += 2) u.p(x, 13, THREAD[1]);
  for (let y = 13; y <= 40; y += 2) {
    u.p(19, y, THREAD[1]);
    u.p(46, y, THREAD[1]);
  }
  // the ember in the middle
  u.poly([[32, 16], [37, 24], [35, 29], [29, 29], [27, 24]], THREAD[1]);
  u.poly([[32, 20], [34, 25], [32, 28], [30, 25]], THREAD[2]);
  // the stitched names: short rows of thread
  [[22, 33, 8], [33, 33, 9], [23, 36, 6], [31, 36, 11], [25, 39, 13]].forEach(([x, y, w], i) => u.row(y, x, x + w, i % 2 ? THREAD[2] : THREAD[0]));
  // the light catching the folds
  u.line(40, 14, 42 + wave, 38, BANNER[3]);
  u.line(26, 14, 24, 38, BANNER[0]);
  return out;
}
