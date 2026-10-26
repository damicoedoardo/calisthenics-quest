import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, mix, outline, painter, type Grid } from '../engine/grid';
import { FLAME } from '../palette';

/* The flame: your spark, and later your friend. A chubby flame spirit with a big face and manga
   eyes that grows with your workouts (stage) and shows how it feels (mood). Over the hover clip its
   tip curls side to side, it breathes, sparks rise, and it blinks once. The candle is the classic
   Ember look; the other stages are drawn from the same shapes, scaled and dressed up. */

export type FlameStage = 'spark' | 'candle' | 'torch' | 'bonfire' | 'fairy';
export type FlameFace = 'happy' | 'bright' | 'soft' | 'sleepy' | 'smoky' | 'scared' | 'dim';

export interface FlameOpts {
  stage: FlameStage;
  mood: FlameFace;
}

/** Tip sway per frame (8 frames). */
const SWAY = [0, 1, 2, 1, 0, -1, -2, -1];
const BLINK_FRAME = 6;
const MOUTH = '#7f1d1d';
const SMOKE = ['#6b7280', '#9ca3af'];
const LOG = ['#3b2414', '#5b3a24', '#7c5233'];

/** Size and placement per stage: kx, ky scale the body; cy is where the belly sits. */
const BUILD: Record<FlameStage, { kx: number; ky: number; tip: number; cy: number }> = {
  spark: { kx: 0.5, ky: 0.5, tip: 1, cy: 50 },
  candle: { kx: 1, ky: 1, tip: 1, cy: 43 },
  torch: { kx: 0.92, ky: 0.95, tip: 1.3, cy: 45 },
  bonfire: { kx: 1.12, ky: 0.92, tip: 1.1, cy: 44 },
  fairy: { kx: 0.78, ky: 0.8, tip: 1.05, cy: 38 },
};

export function drawEmber(o: Partial<FlameOpts>, frame: ClipFrame, f: number): Grid {
  const stage = o.stage ?? 'candle',
    mood = o.mood ?? 'happy',
    B = BUILD[stage],
    g = grid(SIZE),
    p = painter(g),
    s = SWAY[f % SWAY.length],
    b = frame.bob ?? 0,
    // The fairy bobs on its wings; everyone else breathes.
    lift = stage === 'fairy' ? [0, -1, -2, -1, 0, 1, 1, 0][f % 8] : 0,
    cx = 32,
    cy = B.cy + b + lift;
  // Colors fade when the flame is dim (you've been away) or smoky (no rest for days).
  const fade = mood === 'dim' ? 0.55 : mood === 'smoky' ? 0.28 : 0,
    to = mood === 'dim' ? '#1f1b2e' : '#6b7280',
    c = (col: string) => (fade ? mix(col, to, fade) : col),
    red = c(FLAME.red[1]),
    orange = c(FLAME.orange[1]),
    yellow = c(FLAME.yellow),
    core = c(FLAME.core);
  const P = (dx: number, dy: number): [number, number] => [cx + dx * B.kx, cy + dy * B.ky * (dy < -10 ? B.tip : 1)];
  const poly = (pts: [number, number][], col: string) => p.poly(pts.map(([x, y]) => P(x, y)), col);
  const ell = (dy: number, rx: number, ry: number, col: string) => p.ellipse(cx, cy + dy * B.ky, rx * B.kx, ry * B.ky, col);

  if (stage === 'fairy') wings(p, cx, cy, f, c);
  if (stage === 'bonfire') logs(p, cx, cy + 15 * B.ky);

  // outer flame: a round body, a tall curling tip, a small second tip and two little arms
  ell(0, 18, 15 - b, red);
  poly([[-11, -10], [12, -8], [9, -24], [5 + s, -37 + b], [1, -26], [-4, -22]], red);
  poly([[-15, -6], [-6, -14], [-11 + s, -27 + b]], red);
  if (stage === 'bonfire') {
    // more fire: tips on both shoulders
    poly([[8, -10], [16, -6], [17 - s, -22 + b]], red);
    poly([[-18, 0], [-12, -8], [-21 + s, -16]], red);
  }
  if (stage !== 'spark') {
    // arms: out to the sides, raised high on the torch (it carries the light ahead of you)
    const up = stage === 'torch' ? -9 : 0;
    poly([[-17, 2], [-16, -5], [-23 + s / 2, -7 + up]], red);
    poly([[17, 2], [16, -5], [23 + s / 2, -8 + up]], red);
  }
  // middle
  p.ellipse(cx, cy + 1 * B.ky, 15 * B.kx, (12.5 - b) * B.ky, orange);
  poly([[-8, -9], [9, -8], [6, -20], [4 + s, -30 + b], [-1, -19]], orange);
  // the face glows
  p.ellipse(cx, cy + 2 * B.ky, 12.5 * B.kx, (10.5 - b) * B.ky, yellow);
  poly([[-4, -7], [6, -7], [3 + s / 2, -19 + b]], yellow);
  p.ellipse(cx, cy + 3 * B.ky, 10.5 * B.kx, (8.5 - b) * B.ky, core);

  const out = outline(autoshade(g)),
    face = painter(out);
  drawFace(face, stage, mood, cx, cy, B.kx, f);
  sparks(face, stage, mood, cx, f, yellow, orange);
  if (mood === 'smoky') smoke(face, cx, cy - 36 * B.ky * B.tip, f);
  if (mood === 'sleepy' || mood === 'dim') zzz(face, cx + 14 * B.kx, cy - 22 * B.ky, f);
  return out;
}

function drawFace(face: ReturnType<typeof painter>, stage: FlameStage, mood: FlameFace, cx: number, cy: number, k: number, f: number) {
  const E = FLAME.face,
    small = stage === 'spark',
    ey = cy - (small ? 2 : 4),
    xs = small ? [cx - 5, cx + 2] : [Math.round(cx - 9 * Math.min(1, k + 0.12)), Math.round(cx + 4 * Math.min(1, k + 0.12))];
  const closed = mood === 'sleepy' || mood === 'dim' || (f === BLINK_FRAME && mood !== 'scared');
  xs.forEach((x) => {
    if (small) {
      // a tiny spark: dot eyes
      if (closed) face.row(ey + 2, x, x + 2, E);
      else {
        face.r(x, ey, 3, 3, E);
        face.p(x, ey, '#ffffff');
      }
      return;
    }
    if (closed) {
      // closed: sleepy lines, or happy arcs on a blink
      if (mood === 'sleepy' || mood === 'dim') face.row(ey + 4, x, x + 4, E);
      else {
        face.row(ey + 4, x + 1, x + 3, E);
        face.p(x, ey + 3, E);
        face.p(x + 4, ey + 3, E);
      }
      return;
    }
    if (mood === 'soft' || mood === 'smoky') {
      // half-lidded: the top of the eye is hidden
      face.row(ey + 2, x, x + 4, E);
      face.r(x, ey + 3, 5, 3, E);
      face.row(ey + 6, x + 1, x + 3, E);
      face.p(x + 1, ey + 3, '#ffffff');
      return;
    }
    // rounded: corners cut, a big shine top-left, a small one bottom-right
    face.row(ey, x + 1, x + 3, E);
    face.r(x, ey + 1, 5, 5, E);
    face.row(ey + 6, x + 1, x + 3, E);
    if (mood === 'scared') {
      face.r(x + 1, ey + 2, 3, 3, '#ffffff');
      face.p(x + 2, ey + 3, E);
    } else {
      face.r(x + 1, ey + 1, 2, 2, '#ffffff');
      face.p(x + 3, ey + 4, '#ffffff');
      face.row(ey + 5, x + 1, x + 2, FLAME.orange[0]);
    }
  });
  if (small) {
    face.p(cx, ey + 5, MOUTH);
    return;
  }
  if (mood === 'scared') {
    // a small round "o"
    face.r(cx - 1, ey + 8, 3, 3, MOUTH);
    face.p(cx, ey + 9, FLAME.blush);
  } else if (mood === 'sleepy' || mood === 'dim' || mood === 'smoky') {
    face.row(ey + 9, cx - 1, cx + 1, MOUTH);
  } else if (mood === 'bright') {
    // a big open grin
    face.r(cx - 2, ey + 8, 5, 3, MOUTH);
    face.row(ey + 10, cx - 1, cx + 1, FLAME.blush);
  } else {
    // small open smile
    face.r(cx - 1, ey + 8, 3, 2, MOUTH);
    face.p(cx, ey + 9, FLAME.blush);
  }
  if (mood === 'scared') {
    // a bead of sweat by the eye
    const sx = Math.round(cx + 14 * k);
    face.p(sx, ey - 2, '#e0f2fe');
    face.r(sx - 1, ey - 1, 3, 2, '#7dd3fc');
    face.p(sx, ey + 1, '#38bdf8');
  }
  if (mood !== 'dim' && mood !== 'smoky') {
    face.r(Math.round(cx - 13 * k), ey + 7, 3, 2, FLAME.blush);
    face.r(Math.round(cx + 11 * k), ey + 7, 3, 2, FLAME.blush);
  }
}

function sparks(face: ReturnType<typeof painter>, stage: FlameStage, mood: FlameFace, cx: number, f: number, yellow: string, orange: string) {
  if (mood === 'dim') return;
  const list: [number, number, number][] = [
    [cx - 14, 16, 0],
    [cx + 15, 18, 3],
    [cx + 9, 6, 5],
  ];
  if (stage === 'bonfire' || mood === 'bright') list.push([cx - 6, 8, 2], [cx + 20, 12, 6], [cx - 20, 22, 4]);
  if (stage === 'spark') list.splice(1);
  list.forEach(([x, y, phase]) => {
    const k = (f + phase) % 8;
    if (k > 5) return;
    face.p(x + (k % 2), y - k * 2 + (stage === 'spark' ? 18 : 0), yellow);
    if (k < 4) face.p(x + (k % 2), y - k * 2 + 1 + (stage === 'spark' ? 18 : 0), orange);
  });
}

function smoke(face: ReturnType<typeof painter>, cx: number, top: number, f: number) {
  [0, 3].forEach((phase, i) => {
    const k = (f + phase) % 8,
      x = cx + (i ? 4 : -3) + (k % 3) - 1,
      y = Math.round(top - 2 - k);
    if (y < 0) return;
    face.r(x, y, 3, 2, SMOKE[i]);
    face.p(x + 1, y - 1, SMOKE[1 - i]);
  });
}

function zzz(face: ReturnType<typeof painter>, x: number, y: number, f: number) {
  const k = Math.floor(f / 2) % 4,
    zx = Math.round(x) + k,
    zy = Math.round(y) - k * 2,
    Z = '#e0e7ff';
  // a 3x3 "z"
  face.row(zy, zx, zx + 2, Z);
  face.p(zx + 1, zy + 1, Z);
  face.row(zy + 2, zx, zx + 2, Z);
}

function logs(p: ReturnType<typeof painter>, cx: number, y: number) {
  p.thick(cx - 16, y + 1, cx + 14, y - 3, 3, LOG[1]);
  p.thick(cx - 14, y - 3, cx + 16, y + 1, 3, LOG[0]);
  p.r(cx - 17, y, 3, 3, LOG[2]);
  p.r(cx + 15, y, 3, 3, LOG[2]);
}

function wings(p: ReturnType<typeof painter>, cx: number, cy: number, f: number, c: (col: string) => string) {
  // Two flame wings that beat over the clip.
  const beat = [0, 2, 4, 2, 0, -1, -2, -1][f % 8],
    outer = c(FLAME.orange[2]),
    inner = c(FLAME.yellow);
  ([-1, 1] as const).forEach((side) => {
    const x0 = cx + side * 9,
      tipX = cx + side * 30,
      tipY = cy - 22 + beat,
      lowX = cx + side * 26,
      lowY = cy + 4 + beat / 2;
    p.poly([[x0, cy - 6], [tipX, tipY], [cx + side * 24, cy - 6], [lowX, lowY], [x0, cy + 2]], outer);
    p.poly([[x0, cy - 4], [cx + side * 24, tipY + 5], [cx + side * 18, cy - 4], [cx + side * 20, lowY - 2], [x0, cy]], inner);
  });
}
