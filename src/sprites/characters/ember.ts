import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, mix, outline, painter, stamp, type Grid } from '../engine/grid';
import { FLAME } from '../palette';

/* The flame: your spark, and later your friend. A chubby flame spirit with a big face and manga
   eyes that grows with your workouts (stage) and shows how it feels (mood). Over the hover clip its
   tip curls side to side, it breathes, sparks rise, and it blinks once. The candle is the classic
   Ember look; the other stages are drawn from the same shapes, scaled and dressed up. From the
   torch on it is a fire fairy that grows: a little one (torch), a proper one with a flame dress
   (bonfire), and the grandest, with big bright wings and a crown (fairy). */

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

/** Size and placement per stage: kx, ky scale the body; cy is where the belly sits. */
const BUILD: Record<FlameStage, { kx: number; ky: number; tip: number; cy: number }> = {
  spark: { kx: 0.5, ky: 0.5, tip: 1, cy: 50 },
  candle: { kx: 1, ky: 1, tip: 1, cy: 43 },
  torch: { kx: 0.74, ky: 0.72, tip: 0.9, cy: 34 },
  bonfire: { kx: 0.78, ky: 0.76, tip: 0.85, cy: 27 },
  fairy: { kx: 0.8, ky: 0.78, tip: 0.8, cy: 27 },
};

/** The fairy stages: 0 little, 1 proper, 2 the grandest. */
const FAIRY: Partial<Record<FlameStage, 0 | 1 | 2>> = { torch: 0, bonfire: 1, fairy: 2 };

export function drawEmber(o: Partial<FlameOpts>, frame: ClipFrame, f: number): Grid {
  const stage = o.stage ?? 'candle',
    mood = o.mood ?? 'happy',
    B = BUILD[stage],
    g = grid(SIZE),
    p = painter(g),
    s = SWAY[f % SWAY.length],
    b = frame.bob ?? 0,
    fairy = FAIRY[stage],
    // A fairy bobs on its wings; everyone else breathes.
    lift = fairy !== undefined ? [0, -1, -2, -1, 0, 1, 1, 0][f % 8] : 0,
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

  // A fairy's wings and crown are drawn on their own layers, so each keeps its own outline.
  const back = grid(SIZE),
    front = grid(SIZE);
  if (fairy !== undefined) {
    wings(painter(back), cx, cy, f, fairy, c);
    dress(p, cx, cy + 9 * B.ky, s, fairy, red, orange, yellow);
  }

  // outer flame: a round body, a tall curling tip, a small second tip and two little arms
  ell(0, 18, 15 - b, red);
  poly([[-11, -10], [12, -8], [9, -24], [5 + s, -37 + b], [1, -26], [-4, -22]], red);
  poly([[-15, -6], [-6, -14], [-11 + s, -27 + b]], red);
  if (stage !== 'spark') {
    // arms: out to the sides; a fairy holds them low, like it's about to curtsy
    const up = fairy !== undefined ? 7 : 0;
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

  if (fairy === 2) crown(painter(front), cx, Math.round(cy - 11 * B.ky), c);

  const out = outline(autoshade(back));
  stamp(out, outline(autoshade(g)));
  stamp(out, outline(front));
  const face = painter(out);
  drawFace(face, stage, mood, cx, cy, B.kx, f);
  if (fairy !== undefined) dust(face, cx, cy, f, fairy, mood, yellow, core);
  else sparks(face, stage, mood, cx, f, yellow, orange);
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

/** A filled ellipse turned by `turn` radians, as a polygon (for wing lobes). */
function lobe(p: ReturnType<typeof painter>, x: number, y: number, rx: number, ry: number, turn: number, col: string) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2,
      ex = Math.cos(a) * rx,
      ey = Math.sin(a) * ry;
    pts.push([x + ex * Math.cos(turn) - ey * Math.sin(turn), y + ex * Math.sin(turn) + ey * Math.cos(turn)]);
  }
  p.poly(pts, col);
}

/** Butterfly wings of light that beat over the clip, each lobe drawn from the rim in: small and
    round on the little fairy, big with a lower pair on the proper one, and on the grandest wide and
    gold with a white glow, the lower pair long swallowtails. */
function wings(p: ReturnType<typeof painter>, cx: number, cy: number, f: number, level: 0 | 1 | 2, c: (col: string) => string) {
  const beat = [0, 1, 2, 1, 0, -1, -2, -1][f % 8],
    // the wings fold a little on the down beat
    fold = [1, 0.95, 0.85, 0.95, 1, 1, 1, 1][f % 8],
    layers = [
      [FLAME.orange[1], mix(FLAME.yellow, '#ffffff', 0.5)],
      [FLAME.orange[1], FLAME.yellow, mix(FLAME.yellow, '#ffffff', 0.6)],
      ['#f59e0b', FLAME.yellow, '#fef9c3', '#ffffff'],
    ][level].map(c),
    top = [
      { x: 14, y: -9, rx: 8, ry: 5 },
      { x: 18, y: -10, rx: 11, ry: 6.5 },
      { x: 20, y: -12, rx: 14, ry: 8.5 },
    ][level],
    low = [
      { x: 12, y: 2, rx: 5, ry: 3.5 },
      { x: 15, y: 5, rx: 7.5, ry: 5 },
      { x: 16, y: 9, rx: 12, ry: 5 },
    ][level];
  ([-1, 1] as const).forEach((side) => {
    [
      // the grandest fairy's lower wings are long swallowtails
      { ...low, turn: side * (level === 2 ? 1 : 0.6), y: low.y + beat / 2 },
      { ...top, turn: side * -1, y: top.y + beat },
    ].forEach((w) => {
      const x = cx + side * w.x * fold,
        y = cy + w.y;
      // each inner layer is smaller and sits a little toward the body
      layers.forEach((col, i) => lobe(p, x - side * i * 0.8, y + i * 0.3, (w.rx - i * 2) * fold, w.ry - i * 1.4, w.turn, col));
    });
  });
}

/** Below the face: a short wisp of a tail on the little fairy; on the others a bell dress of flame
    that sways, with three points at the hem (longer on the grandest). */
function dress(p: ReturnType<typeof painter>, cx: number, y: number, s: number, level: 0 | 1 | 2, red: string, orange: string, yellow: string) {
  if (level === 0) {
    p.poly([[cx - 6, y], [cx + 6, y], [cx + 1 + s, y + 11]], red);
    p.poly([[cx - 3, y], [cx + 3, y], [cx + s / 2, y + 7]], orange);
    return;
  }
  const L = level === 2 ? 1.35 : 1,
    w = level === 2 ? 1.1 : 1;
  const bell = (k: number, dy: number): [number, number][] =>
    (
      [
        [-5, 0],
        [5, 0],
        [8, 9],
        [12 + s / 2, 17],
        [5, 15],
        [s / 2, 20],
        [-5, 15],
        [-12 + s / 2, 17],
        [-8, 9],
      ] as [number, number][]
    ).map(([x, yy]) => [cx + x * k * w, y + dy + yy * k * L]);
  p.poly(bell(1, 0), red);
  p.poly(bell(0.7, 1), orange);
  p.poly(bell(0.4, 1), yellow);
  if (level === 2) p.poly(bell(0.18, 2), mix(yellow, '#ffffff', 0.6));
}

/** A small gold crown with three points and a red gem, sat on the grandest fairy's head. */
function crown(p: ReturnType<typeof painter>, cx: number, y: number, c: (col: string) => string) {
  const gold = c('#fbbf24'),
    deep = c('#d97706'),
    gem = c(FLAME.red[1]);
  p.r(cx - 6, y - 1, 13, 3, gold);
  p.row(y + 1, cx - 6, cx + 6, deep);
  p.poly([[cx - 6, y - 1], [cx - 5, y - 5], [cx - 3, y - 1]], gold);
  p.poly([[cx - 2, y - 1], [cx, y - 7], [cx + 2, y - 1]], gold);
  p.poly([[cx + 3, y - 1], [cx + 5, y - 5], [cx + 6, y - 1]], gold);
  p.r(cx - 1, y - 1, 3, 2, gem);
}

/** Fairy dust: little twinkles that fall from the wings, more of them as the fairy grows. */
function dust(face: ReturnType<typeof painter>, cx: number, cy: number, f: number, level: 0 | 1 | 2, mood: FlameFace, yellow: string, core: string) {
  if (mood === 'dim') return;
  const spots: [number, number, number][] = [
    [-14, 4, 0],
    [15, 6, 4],
    [-20, -4, 2],
    [21, -2, 6],
    [-9, 18, 3],
    [10, 20, 7],
    [-24, 10, 5],
    [25, 12, 1],
  ];
  spots.slice(0, [3, 5, 8][level]).forEach(([dx, dy, phase]) => {
    const k = (f + phase) % 8;
    if (k > 5) return;
    const x = cx + dx,
      y = Math.round(cy + dy + k);
    // a twinkle: a plus at its brightest, a dot as it fades
    if (k === 1 || k === 2) {
      face.p(x, y, core);
      face.p(x - 1, y, yellow);
      face.p(x + 1, y, yellow);
      face.p(x, y - 1, yellow);
      face.p(x, y + 1, yellow);
    } else face.p(x, y, yellow);
  });
}
