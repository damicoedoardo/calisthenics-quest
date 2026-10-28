import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, mix, outline, painter, stamp, type Grid } from '../engine/grid';
import { FLAME } from '../palette';
import { drawFairy, type FairyLevel, type FlameSex } from './fairy';

/* The flame: your spark, and later your friend. A chubby flame spirit with a big face and manga
   eyes that grows with your workouts (stage) and shows how it feels (mood). Over the hover clip its
   tip curls side to side, it breathes, sparks rise, and it blinks once. The candle is the classic
   Ember look. From the torch on it is a fairy that grows (a little one, a proper one, the grandest),
   drawn in fairy.ts: a pixie for girls, its own look for boys. The face is always Ember's. */

export type FlameStage = 'spark' | 'candle' | 'torch' | 'bonfire' | 'fairy';
export type FlameFace = 'happy' | 'bright' | 'soft' | 'sleepy' | 'smoky' | 'scared' | 'dim';

export interface FlameOpts {
  stage: FlameStage;
  mood: FlameFace;
  /** Whose flame it is (the hero's look): the fairy stages look different for boys and girls. */
  sex?: FlameSex;
}

/** The fairy stages: 0 little, 1 proper, 2 the grandest. */
const FAIRY: Partial<Record<FlameStage, FairyLevel>> = { torch: 0, bonfire: 1, fairy: 2 };

/** Tip sway per frame (8 frames). */
const SWAY = [0, 1, 2, 1, 0, -1, -2, -1];
const BLINK_FRAME = 6;
const MOUTH = '#7f1d1d';
const SMOKE = ['#6b7280', '#9ca3af'];
const LOG = ['#3b2414', '#5b3a24', '#7c5233'];

/** Size and placement of the flame stages (the fairies are in fairy.ts): kx, ky scale the body;
    cy is where the belly sits. */
const BUILD = {
  spark: { kx: 0.5, ky: 0.5, tip: 1, cy: 50 },
  candle: { kx: 1, ky: 1, tip: 1, cy: 43 },
};

export function drawEmber(o: Partial<FlameOpts>, frame: ClipFrame, f: number): Grid {
  const stage = o.stage ?? 'candle',
    mood = o.mood ?? 'happy',
    s = SWAY[f % SWAY.length],
    b = frame.bob ?? 0;
  // Colors fade when the flame is dim (you've been away) or smoky (no rest for days).
  const fade = mood === 'dim' ? 0.55 : mood === 'smoky' ? 0.28 : 0,
    to = mood === 'dim' ? '#1f1b2e' : '#6b7280',
    c = (col: string) => (fade ? mix(col, to, fade) : col),
    red = c(FLAME.red[1]),
    orange = c(FLAME.orange[1]),
    yellow = c(FLAME.yellow),
    core = c(FLAME.core);

  const level = FAIRY[stage];
  if (level !== undefined) {
    // a fairy: its layers from fairy.ts, each outlined, then Ember's face on top
    const fairy = drawFairy(o.sex ?? 'm', level, s, f, c),
      out = outline(autoshade(fairy.layers[0]));
    fairy.layers.slice(1).forEach((l) => stamp(out, outline(autoshade(l))));
    const face = painter(out),
      F = fairy.face;
    drawFace(face, stage, mood, F.cx, F.cy, F.k, f);
    dust(face, F.cx, F.cy, f, level, mood, yellow, core);
    if (mood === 'smoky') smoke(face, F.cx, F.cy - 26, f);
    if (mood === 'sleepy' || mood === 'dim') zzz(face, F.cx + 13, F.cy - 18, f);
    return out;
  }

  const B = BUILD[stage === 'spark' ? 'spark' : 'candle'],
    g = grid(SIZE),
    p = painter(g),
    cx = 32,
    cy = B.cy + b;
  const P = (dx: number, dy: number): [number, number] => [cx + dx * B.kx, cy + dy * B.ky * (dy < -10 ? B.tip : 1)];
  const poly = (pts: [number, number][], col: string) => p.poly(pts.map(([x, y]) => P(x, y)), col);
  const ell = (dy: number, rx: number, ry: number, col: string) => p.ellipse(cx, cy + dy * B.ky, rx * B.kx, ry * B.ky, col);

  // outer flame: a round body, a tall curling tip, a small second tip and two little arms
  ell(0, 18, 15 - b, red);
  poly([[-11, -10], [12, -8], [9, -24], [5 + s, -37 + b], [1, -26], [-4, -22]], red);
  poly([[-15, -6], [-6, -14], [-11 + s, -27 + b]], red);
  if (stage === 'candle') {
    // arms: out to the sides
    poly([[-17, 2], [-16, -5], [-23 + s / 2, -7]], red);
    poly([[17, 2], [16, -5], [23 + s / 2, -8]], red);
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

export function drawFace(face: ReturnType<typeof painter>, stage: FlameStage, mood: FlameFace, cx: number, cy: number, k: number, f: number) {
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
  if (mood === 'bright') list.push([cx - 6, 8, 2], [cx + 20, 12, 6], [cx - 20, 22, 4]);
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

/** Fairy dust: twinkles that fall around a fairy, more of them as it grows. */
function dust(face: ReturnType<typeof painter>, cx: number, cy: number, f: number, level: FairyLevel, mood: FlameFace, yellow: string, core: string) {
  if (mood === 'dim') return;
  const spots: [number, number, number][] = [
    [-18, -6, 0],
    [18, 2, 4],
    [-15, 16, 2],
    [16, 22, 6],
  ];
  spots.slice(0, level + 2).forEach(([dx, dy, phase]) => {
    const k = (f + phase) % 8;
    if (k > 4) return;
    const x = cx + dx,
      y = cy + dy + k;
    face.p(x, y, core);
    if (k === 1 || k === 2) [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([i, j]) => face.p(x + i, y + j, yellow));
  });
}
