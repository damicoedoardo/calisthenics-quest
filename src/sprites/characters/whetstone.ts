import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';

/* The Whetstone Pass, the Ember Road's first world: its own monster, its mid-boss and its boss.
   - The Grinder: a runaway whetstone on its edge, grumpy, throwing sparks where it grinds.
   - The Bellows: a forge's great bellows with a sleepy face, breathing in and blowing embers.
   - The Lull: a mossy giant who sits at the top of the pass and sings, eyes shut, beard to his
     knees. "There is a giant up there who sings. Lovely voice." */

const SLATE = ['#2a3242', '#4a5670', '#7d8aa6', '#b9c3d8'];
const GRIT = '#9c8f7a';
const IRON = ['#26262b', '#4a4a52', '#7b7b86'];
const SPARK = ['#f97316', '#fbbf24', '#fef3c7'];
const FACE = '#14121c';

/* The Grinder. Its notches turn as it rolls. Its attack: it bares its teeth and the sparks fly. */
export function drawGrinder(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    cx = 32 + (hit ? -2 : 0),
    cy = 36 + bob,
    R = 19;
  // the stone, and the iron hub through its middle
  p.ellipse(cx, cy, R, R, SLATE[1]);
  p.ellipse(cx, cy, R - 4, R - 4, SLATE[2]);
  const out = outline(autoshade(g)),
    u = painter(out);
  // the grit speckled over it, and notches round the rim that turn as it rolls
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4,
      r = 4 + ((i * 7) % 12);
    u.p(cx + Math.cos(a) * r, cy + Math.sin(a) * r, i % 3 ? GRIT : SLATE[3]);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + f * 0.35;
    u.line(cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1), SLATE[0]);
  }
  // the iron pins of its axle, sticking out each side
  for (const x of [cx - R - 1, cx + R - 1]) {
    u.r(x, cy - 2, 3, 4, IRON[1]);
    u.p(x + 1, cy - 2, IRON[2]);
  }
  // its face: brows down, and gritted teeth (bared wide as it winds up)
  const ey = cy - 5;
  u.line(cx - 10, ey - 3, cx - 4, ey - 1, FACE);
  u.line(cx + 10, ey - 3, cx + 4, ey - 1, FACE);
  u.r(cx - 8, ey, 3, 3, FACE);
  u.r(cx + 5, ey, 3, 3, FACE);
  u.p(cx - 7, ey, wind || hit ? SPARK[1] : '#ffffff');
  u.p(cx + 6, ey, wind || hit ? SPARK[1] : '#ffffff');
  const mw = wind || hit ? 6 : 4;
  u.r(cx - mw, ey + 6, mw * 2 + 1, 3, FACE);
  for (let x = cx - mw + 1; x < cx + mw; x += 2) u.p(x, ey + 7, '#e5e7eb');
  // sparks thrown off where it meets the ground, many more on the attack
  const n = hit ? 9 : wind ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const k = (f + i * 3) % 7,
      sx = cx + 8 + i * 2 + k,
      sy = cy + R - 2 - k * (1 + (i % 3)) - (hit ? i : 0);
    u.p(sx, sy, SPARK[(i + f) % 3]);
    if (hit && i % 2) u.p(sx + 1, sy - 1, SPARK[2]);
  }
  // grit dust trailing behind it
  if (!hit) for (let i = 0; i < 3; i++) u.p(cx - R - 1 - i * 2, cy + R - 1 - ((f + i) % 2), GRIT);
  return out;
}

const WOOD = ['#3b2414', '#6b4226', '#9a6a3e'];
const HIDE = ['#4a2c22', '#7a4a36', '#a8705a'];

/* The Bellows. Breathing, its leather swells and sinks. Its attack: it puffs up, then squeezes shut
   with a burst of embers from the nozzle. */
export function drawBellowsMid(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    // how full it is: 0 squeezed shut, 1 breathed in
    full = hit ? 0 : wind ? 1 : 0.45 + 0.15 * bob,
    gap = 4 + Math.round(full * 8),
    top = 14 - Math.round(full * 4);
  // the two boards: teardrops, wide at the back, narrowing toward the nozzle at the bottom
  const board = (y: number): [number, number][] => [[12, y], [52, y], [56, y + 4], [44, y + 14], [32, y + 20], [20, y + 14], [8, y + 4]];
  // the leather between them, pleated
  p.poly([[10, top + 6], [54, top + 6], [44, top + 18 + gap], [32, top + 24 + gap], [20, top + 18 + gap]], HIDE[1]);
  p.poly(board(top), WOOD[1]);
  p.poly(board(top + gap), WOOD[1]);
  // the iron nozzle, and the handles sticking up off the boards
  p.poly([[28, top + 22 + gap], [36, top + 22 + gap], [34, 60], [30, 60]], IRON[1]);
  p.r(16, top - 6, 4, 8, WOOD[1]);
  p.r(44, top - 6, 4, 8, WOOD[1]);
  p.r(14, top - 8, 8, 3, WOOD[2]);
  p.r(42, top - 8, 8, 3, WOOD[2]);
  const out = outline(autoshade(g)),
    u = painter(out);
  // the pleats showing between the boards
  for (let i = 0; i < 4; i++) {
    const y = top + 9 + Math.round((i * gap) / 3);
    u.line(12 + i, y, 52 - i, y, HIDE[i % 2 ? 0 : 2]);
  }
  // iron studs round the top board, the grain on it
  for (let x = 14; x <= 50; x += 6) u.p(x, top + 2, IRON[2]);
  u.line(18, top + 6, 46, top + 6, WOOD[0]);
  u.line(22, top + 10, 42, top + 10, WOOD[0]);
  // the nozzle glows at the tip
  u.r(30, 58, 4, 2, hit ? SPARK[2] : SPARK[0]);
  // a face on the top board: sleepy coal eyes, wide as it breathes in, a slack mouth
  const ey = top + 4;
  if (wind) {
    u.ellipse(24, ey + 1, 2.5, 2.5, FACE);
    u.ellipse(40, ey + 1, 2.5, 2.5, FACE);
    u.p(24, ey, SPARK[1]);
    u.p(40, ey, SPARK[1]);
    u.ellipse(32, ey + 8, 3, 2, FACE);
  } else {
    // heavy lids over glowing coals
    u.r(21, ey, 7, 3, FACE);
    u.r(37, ey, 7, 3, FACE);
    u.row(ey + 2, 23, 26, SPARK[0]);
    u.row(ey + 2, 39, 42, SPARK[0]);
    u.r(29, ey + 7, 7, 2, FACE);
  }
  // embers: a lazy few drifting off the nozzle, a burst on the blow
  const n = hit ? 10 : 2;
  for (let i = 0; i < n; i++) {
    const k = (f + i * 2) % 6,
      x = 32 + (hit ? (i - n / 2) * 2.5 : (i ? 3 : -3)) + (i % 2 ? k : -k) * (hit ? 0.6 : 0.3),
      y = 62 - (hit ? 1 + (i % 3) : k);
    u.p(x, y, SPARK[(i + f) % 3]);
  }
  return out;
}

const MOSS = ['#2f4a2a', '#4d7a3a', '#7aa85a'];
const ROCK = ['#3a3548', '#5d5672', '#8a83a0', '#b8b2cc'];
const BEARD = ['#9ca3af', '#d1d5db', '#f3f4f6'];
const NOTE = ['#c4b5fd', '#e9d5ff'];

/* The Lull. Sitting, he sways to his own song; notes rise from his mouth. Its attack: his eyes
   half open, his arms rise like a choir master's, and he sings out loud. */
export function drawLullBoss(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    sway = wind || hit ? 0 : [0, 1, 1, 0, 0, -1, -1, 0][f % 8],
    cx = 32 + sway,
    top = 10 + bob;
  // his body: a great hunched mound of mossy rock, sitting, knees up in front
  p.ellipse(cx, 44, 27, 20, ROCK[1]);
  p.ellipse(cx - 15, 55, 10, 6, ROCK[1]);
  p.ellipse(cx + 15, 55, 10, 6, ROCK[1]);
  // the head, sunk between the shoulders
  p.ellipse(cx, top + 12, 13, 12, ROCK[2]);
  // the arms: folded on his belly, or raised to conduct the song
  if (wind || hit) {
    p.thick(cx - 22, 38, cx - 28, top + 8, 5, ROCK[1]);
    p.thick(cx + 20, 38, cx + 25, top + 8, 5, ROCK[1]);
    p.ellipse(cx - 27, top + 6, 4, 4, ROCK[2]);
    p.ellipse(cx + 27, top + 6, 4, 4, ROCK[2]);
  } else {
    p.ellipse(cx - 10, 46, 9, 5, ROCK[2]);
    p.ellipse(cx + 10, 46, 9, 5, ROCK[2]);
  }
  // the beard, flowing down over his chest to his knees
  p.poly([[cx - 10, top + 14], [cx + 10, top + 14], [cx + 9, top + 30], [cx + 3, 54], [cx, 56], [cx - 3, 54], [cx - 9, top + 30]], BEARD[1]);
  const out = outline(autoshade(g)),
    u = painter(out);
  // moss on his shoulders and knees, and the beard's strands
  [[cx - 22, 30], [cx - 17, 27], [cx + 18, 29], [cx + 22, 32], [cx - 17, 51], [cx + 16, 51], [cx - 6, top + 1], [cx + 5, top + 2]].forEach(([x, y], i) => {
    u.r(x, y, 3 + (i % 2), 2, MOSS[i % 3]);
    u.p(x + 1, y - 1, MOSS[2]);
  });
  for (let i = -6; i <= 6; i += 3) u.line(cx + i, top + 17, cx + i * 0.5, top + 32 + Math.abs(i), BEARD[i % 2 ? 0 : 2]);
  // cracks in the rock
  u.line(cx + 12, 38, cx + 17, 44, ROCK[0]);
  u.line(cx - 20, 40, cx - 16, 46, ROCK[0]);
  // bushy brows, and his eyes: shut and peaceful, or half open as he sings out
  const ey = top + 9;
  u.r(cx - 10, ey - 3, 7, 2, BEARD[2]);
  u.r(cx + 3, ey - 3, 7, 2, BEARD[2]);
  if (wind || hit) {
    u.r(cx - 8, ey, 4, 2, FACE);
    u.r(cx + 4, ey, 4, 2, FACE);
    u.row(ey, cx - 8, cx - 5, '#a78bfa');
    u.row(ey, cx + 4, cx + 7, '#a78bfa');
  } else {
    u.line(cx - 9, ey + 1, cx - 7, ey + 2, FACE);
    u.line(cx - 6, ey + 2, cx - 4, ey + 1, FACE);
    u.line(cx + 4, ey + 1, cx + 6, ey + 2, FACE);
    u.line(cx + 7, ey + 2, cx + 9, ey + 1, FACE);
  }
  // a round nose, and his mouth open in an "o", wide on the attack
  u.ellipse(cx, ey + 5, 2, 1.5, ROCK[3]);
  u.ellipse(cx, ey + 10, hit ? 3.5 : 2.5, hit ? 3 : 2, FACE);
  u.p(cx, ey + 11, '#7c3aed');
  // notes rising from his song, drifting up and to the side
  const notes = hit ? 4 : 2;
  for (let i = 0; i < notes; i++) {
    const k = (f + i * 4) % 8,
      side = i % 2 ? 1 : -1,
      x = cx + side * (16 + k * 1.2 + i),
      y = top + 6 - k * 1.5 + (hit ? 2 : 0),
      c = NOTE[(i + f) % 2];
    if (k > 6 && !hit) continue;
    u.ellipse(x, y + 3, 1.5, 1.2, c);
    u.col(x + 1, y - 1, y + 3, c);
    u.p(x + 2, y - 1, c);
  }
  return out;
}
