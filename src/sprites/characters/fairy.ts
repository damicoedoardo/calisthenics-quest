import { grid, painter, type Grid, type Painter } from '../engine/grid';
import { SIZE } from '../engine/figure';
import { FLAME } from '../palette';

/* The flame's fairy forms (stages torch, bonfire and fairy): a little one, a proper one and the
   grandest. Girls get a fairy princess: flame hair, a dress of flame, see-through wings, and at the
   end long hair and a crown. Boys get her brother, a fairy prince: short flame hair, a doublet with
   gold trim, a cape, and at the end a bigger crown and a flame scepter. Both keep Ember's face,
   which ember.ts paints on top at `face`. Wings, body and crown are separate layers so each keeps
   its own outline. */

export type FairyLevel = 0 | 1 | 2;
export type FlameSex = 'm' | 'f';

export interface FairyLayers {
  /** Back to front. */
  layers: Grid[];
  /** Where Ember's face goes: the center the face is drawn around, and its scale. */
  face: { cx: number; cy: number; k: number };
}

/** A color through the mood's fade (dim, smoky). */
type Tone = (col: string) => string;

const GOLD = '#fbbf24',
  PALE = '#fff4cc',
  PALE_GOLD = '#fff7d6',
  VEIN = '#fdba74',
  VEIN_GOLD = '#fcd34d',
  SHOE = '#9a3412',
  BOOT = '#7c2d12';

/** A filled ellipse turned by `turn` radians, as a polygon (a wing lobe). */
function lobe(p: Painter, x: number, y: number, rx: number, ry: number, turn: number, col: string) {
  const pts: [number, number][] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2,
      ex = Math.cos(a) * rx,
      ey = Math.sin(a) * ry;
    pts.push([x + ex * Math.cos(turn) - ey * Math.sin(turn), y + ex * Math.sin(turn) + ey * Math.cos(turn)]);
  }
  p.poly(pts, col);
}

/** Head height per level, and the hover bob (the wings hold it up). */
const HEAD_Y = [27, 22, 20];
const LIFT = [0, -1, -2, -1, 0, 1, 1, 0];
/** Wing beat per frame. */
const BEAT = [0, 2, 3, 2, 0, -1, -2, -1];

export function drawFairy(sex: FlameSex, level: FairyLevel, s: number, f: number, c: Tone): FairyLayers {
  const cx = 32,
    hy = HEAD_Y[level] + LIFT[f % 8],
    beat = BEAT[f % 8],
    back = grid(SIZE),
    body = grid(SIZE),
    top = grid(SIZE);
  (sex === 'f' ? princess : prince)(painter(back), painter(body), painter(top), cx, hy, level, s, beat, c);
  return { layers: [back, body, top], face: { cx, cy: hy + 6, k: 0.78 } };
}

/** The girls' fairy. */
function princess(bp: Painter, p: Painter, t: Painter, cx: number, hy: number, level: FairyLevel, s: number, beat: number, c: Tone) {
  const R = c(FLAME.red[1]),
    OR = c(FLAME.orange[1]),
    Y = c(FLAME.yellow),
    C = c(FLAME.core),
    grand = level === 2,
    rim = c(grand ? GOLD : FLAME.orange[2]),
    fill = c(grand ? PALE_GOLD : PALE),
    vein = c(grand ? VEIN_GOLD : VEIN);

  roundWings(bp, cx, hy, level, beat, rim, fill, vein, c);

  // flame hair behind the head; the grandest's falls to the waist
  const hair = [8, 12, 24][level];
  ([-1, 1] as const).forEach((side) =>
    p.poly(
      [
        [cx + side * 6, hy - 6],
        [cx + side * 13, hy + 2],
        [cx + side * (11 - s / 2), hy + hair],
        [cx + side * 5, hy + 6],
      ],
      R,
    ),
  );

  // body: a dress of flame, little legs (a wisp of a tail on the little one), little arms
  const d = hy + 13,
    L = [0.55, 1, 1.35][level],
    W = [0.7, 1, 1.15][level],
    hem = d + 12 * L;
  if (level > 0) {
    p.thick(cx - 3, hem, cx - 3, hem + 4, 2, C);
    p.thick(cx + 2, hem, cx + 2 - s / 2, hem + 4, 2, C);
    p.r(cx - 4, hem + 4, 3, 2, c(SHOE));
    p.r(cx + 1 - s / 2, hem + 4, 3, 2, c(SHOE));
  } else p.poly([[cx - 3, d + 5], [cx + 3, d + 5], [cx + s, d + 13]], OR);
  const bell = (k: number, dy: number): [number, number][] =>
    (
      [
        [-3, 0],
        [3, 0],
        [6, 6],
        [9, 12],
        [5, 11],
        [2 + s / 2, 14],
        [-1, 11],
        [-4 + s / 2, 14],
        [-6, 11],
        [-9, 12],
        [-6, 6],
      ] as [number, number][]
    ).map(([x, y]) => [cx + x * k * W, d + dy + y * k * L]);
  p.poly(bell(1, 0), R);
  p.poly(bell(0.7, 1), OR);
  p.poly(bell(0.4, 1.5), Y);
  p.r(cx - 2, d - 1, 5, 3, C);
  p.thick(cx - 3, d + 1, cx - 8, d + 6 + s / 2, 1.6, Y);
  // the grandest waves
  if (grand) p.thick(cx + 3, d + 1, cx + 9, d - 4 - Math.abs(s), 1.6, Y);
  else p.thick(cx + 3, d + 1, cx + 8, d + 6 - s / 2, 1.6, Y);

  // head: flame hair with a tip that sways, bangs over the forehead, the glowing face
  const tip = level ? 19 : 15;
  p.ellipse(cx, hy, 12.5, 11, R);
  p.poly([[cx - 8, hy - 6], [cx + 9, hy - 6], [cx + 3 + s, hy - tip]], R);
  p.poly([[cx - 11, hy - 3], [cx - 4, hy - 9], [cx - 10 + s, hy - 14]], R);
  p.ellipse(cx, hy - 1, 11, 9.5, OR);
  p.poly([[cx - 5, hy - 6], [cx + 6, hy - 6], [cx + 3 + s, hy - tip + 4]], OR);
  p.poly([[cx - 2, hy - 7], [cx + 4, hy - 7], [cx + 2 + s / 2, hy - tip + 8]], Y);
  p.ellipse(cx, hy + 3, 10, 7.5, C);
  [
    [-7, -1],
    [0, 0],
    [6, -1],
  ].forEach(([x, y]) => p.poly([[cx + x - 3, hy - 5], [cx + x + 3, hy - 5], [cx + x, hy + y]], OR));

  if (grand) {
    // a small gold crown with a red gem
    const gold = c(GOLD);
    t.r(cx - 5, hy - 10, 11, 2, gold);
    t.poly([[cx - 5, hy - 10], [cx - 4, hy - 13], [cx - 2, hy - 10]], gold);
    t.poly([[cx - 2, hy - 10], [cx, hy - 15], [cx + 2, hy - 10]], gold);
    t.poly([[cx + 2, hy - 10], [cx + 4, hy - 13], [cx + 5, hy - 10]], gold);
    t.r(cx - 1, hy - 10, 3, 1, R);
  }
}

/** The prince's wings: 'pointed' (long, swept back) or 'round' (the same as hers). */
const PRINCE_WINGS: 'pointed' | 'round' = 'pointed';

/** The boys' fairy: the princess's brother. */
function prince(bp: Painter, p: Painter, t: Painter, cx: number, hy: number, level: FairyLevel, s: number, beat: number, c: Tone) {
  const R = c(FLAME.red[1]),
    RD = c(FLAME.red[0]),
    OR = c(FLAME.orange[1]),
    Y = c(FLAME.yellow),
    C = c(FLAME.core),
    gold = c(GOLD),
    grand = level === 2,
    rim = c(grand ? GOLD : FLAME.orange[2]),
    fill = c(grand ? PALE_GOLD : PALE),
    vein = c(grand ? VEIN_GOLD : VEIN),
    d = hy + 13,
    L = [0.55, 1, 1.3][level],
    W = [0.75, 1, 1.12][level];

  if (PRINCE_WINGS === 'round') roundWings(bp, cx, hy, level, beat, rim, fill, vein, c);
  else {
    // long pointed wings: the upper pair swept up and back, the lower pair short
    const len = [9, 13, 16][level];
    ([-1, 1] as const).forEach((side) =>
      [
        { a: -0.7, l: len, w: [3.2, 4, 4.8][level], b: beat },
        { a: 0.35, l: len * 0.7, w: [2.4, 3, 3.6][level], b: beat / 2 },
      ].forEach((w, i) => {
        const mx = cx + side * (3 + w.l * Math.cos(w.a)),
          my = hy + 13 + w.l * Math.sin(w.a) + w.b;
        // an ellipse with its outer end drawn out to a point
        const pts = (k: number): [number, number][] =>
          Array.from({ length: 24 }, (_, j) => {
            const a = (j / 24) * Math.PI * 2,
              tip = Math.cos(a) > 0.6,
              ex = Math.cos(a) * w.l * k * (tip ? 1 + (Math.cos(a) - 0.6) * 0.8 : 1),
              ey = Math.sin(a) * w.w * k * (tip ? 0.7 : 1);
            return [mx + side * (ex * Math.cos(w.a) - ey * Math.sin(w.a)), my + ex * Math.sin(w.a) + ey * Math.cos(w.a)];
          });
        bp.poly(pts(1), rim);
        bp.poly(
          pts(0.8).map(([x, y]) => [x - side * 0.5, y] as [number, number]),
          fill,
        );
        bp.line(cx + side * 3, hy + 13, mx + side * Math.cos(w.a) * w.l * 0.9, my + Math.sin(w.a) * w.l * 0.9, vein);
        if (grand && i === 0) lobe(bp, mx + side, my, w.l * 0.35, w.w * 0.35, side * w.a, c('#ffffff'));
      }),
    );
  }

  // a cape: short on the proper prince, long and gold-edged on the grandest
  if (level > 0) {
    const cl = grand ? 22 : 15;
    bp.poly([[cx - 7, d - 1], [cx + 7, d - 1], [cx + 10, d + cl], [cx + 5 - s, d + cl - 2], [cx, d + cl + 1], [cx - 5 - s, d + cl - 2], [cx - 10, d + cl]], R);
    if (grand) bp.r(cx - 10, d + cl - 1, 21, 2, gold);
  }

  // legs in boots (a wisp of a tail on the little one)
  const hem = d + 9 * L;
  if (level > 0) {
    p.thick(cx - 3, hem, cx - 3, hem + 4, 2.2, OR);
    p.thick(cx + 2, hem, cx + 2 - s / 3, hem + 4, 2.2, OR);
    p.r(cx - 5, hem + 4, 4, 3, c(BOOT));
    p.r(cx + 1 - Math.round(s / 3), hem + 4, 4, 3, c(BOOT));
  } else p.poly([[cx - 3, d + 5], [cx + 3, d + 5], [cx + s, d + 13]], OR);

  // a doublet: flame red, gold trim down the middle, a belt, a white collar, gold epaulettes
  p.poly([[cx - 5 * W, d - 1], [cx + 5 * W, d - 1], [cx + 7 * W, hem], [cx - 7 * W, hem]], R);
  p.poly([[cx - 2, d - 1], [cx + 2, d - 1], [cx + 3, hem], [cx - 3, hem]], OR);
  p.col(cx, d, Math.round(hem) - 1, gold);
  p.r(cx - Math.round(6 * W), Math.round(d + 5 * L), Math.round(12 * W) + 1, 2, RD);
  p.p(cx, Math.round(d + 5 * L), gold);
  p.r(cx - 3, d - 1, 7, 2, C);
  if (level > 0) {
    t.r(cx - Math.round(7 * W) - 1, d, 3, 2, gold);
    t.r(cx + Math.round(7 * W) - 1, d, 3, 2, gold);
  }
  // a hand on the hip; the other on the hip too, or holding a flame scepter on the grandest
  p.thick(cx - 5 * W, d + 1, cx - 9, d + 4, 2, R);
  p.thick(cx - 9, d + 4, cx - 6, d + 6, 1.6, C);
  if (grand) {
    p.thick(cx + 5 * W, d + 1, cx + 11, d + 3, 2, R);
    p.r(cx + 11, d + 2, 3, 3, C);
    t.thick(cx + 13, d + 10, cx + 13, d - 5, 1.2, gold);
    t.poly([[cx + 11, d - 5], [cx + 15, d - 5], [cx + 13 + s / 2, d - 11]], R);
    t.poly([[cx + 12, d - 5], [cx + 14, d - 5], [cx + 13 + s / 3, d - 8]], Y);
  } else {
    p.thick(cx + 5 * W, d + 1, cx + 9, d + 4, 2, R);
    p.thick(cx + 9, d + 4, cx + 6, d + 6, 1.6, C);
  }

  // head: short flame hair swept up and back, spiky bangs
  const tip = [15, 18, 20][level];
  p.ellipse(cx, hy, 12.5, 11, R);
  p.poly([[cx - 6, hy - 7], [cx + 8, hy - 7], [cx + 3 + s, hy - tip]], R);
  p.poly([[cx - 12, hy - 2], [cx - 4, hy - 9], [cx - 12 + s, hy - tip + 5]], R);
  p.poly([[cx + 6, hy - 8], [cx + 12, hy - 2], [cx + 14 + s / 2, hy - tip + 7]], R);
  p.ellipse(cx, hy - 1, 11, 9.5, OR);
  p.poly([[cx - 3, hy - 7], [cx + 6, hy - 7], [cx + 3 + s, hy - tip + 4]], OR);
  p.poly([[cx - 9, hy - 3], [cx - 4, hy - 8], [cx - 10 + s, hy - tip + 8]], OR);
  p.poly([[cx, hy - 7], [cx + 4, hy - 7], [cx + 2 + s / 2, hy - tip + 8]], Y);
  p.ellipse(cx, hy + 3, 10, 7.5, C);
  p.poly([[cx - 10, hy - 4], [cx - 2, hy - 6], [cx - 8, hy + 1]], OR);
  p.poly([[cx - 4, hy - 6], [cx + 5, hy - 6], [cx - 1, hy + 1]], OR);
  p.poly([[cx + 3, hy - 6], [cx + 10, hy - 4], [cx + 6, hy]], OR);

  if (level === 1) {
    // a thin gold circlet
    t.row(hy - 6, cx - 8, cx + 8, gold);
    t.p(cx, hy - 6, R);
  }
  if (grand) {
    // a prince's crown: wider than hers, five points, a ruby and two sapphires
    t.r(cx - 7, hy - 10, 15, 3, gold);
    [-6, -3, 0, 3, 6].forEach((x, i) => t.poly([[cx + x - 1.5, hy - 10], [cx + x + 1.5, hy - 10], [cx + x, hy - 13 - (i === 2 ? 2 : 0)]], gold));
    t.r(cx - 1, hy - 9, 3, 2, R);
    t.p(cx - 5, hy - 9, c('#60a5fa'));
    t.p(cx + 5, hy - 9, c('#60a5fa'));
  }
}

/** Her wings: a big upper pair and a smaller lower pair, see-through with veins. */
function roundWings(bp: Painter, cx: number, hy: number, level: FairyLevel, beat: number, rim: string, fill: string, vein: string, c: Tone) {
  const up = [
      { x: 12, y: 5, rx: 8, ry: 5 },
      { x: 14, y: 6, rx: 11, ry: 6 },
      { x: 16, y: 6, rx: 13.5, ry: 7.5 },
    ][level],
    lo = [
      { x: 10, y: 15, rx: 5, ry: 3.5 },
      { x: 11, y: 20, rx: 7, ry: 4.2 },
      { x: 13, y: 22, rx: 9, ry: 5 },
    ][level];
  ([-1, 1] as const).forEach((side) => {
    const ux = cx + side * up.x,
      uy = hy + up.y - 6 + beat,
      lx = cx + side * lo.x,
      ly = hy + lo.y - 4 + beat / 2,
      rx = cx + side * 3,
      ry = hy + 12;
    lobe(bp, ux, uy, up.rx, up.ry, side * -0.6, rim);
    lobe(bp, ux, uy + 0.5, up.rx - 1.5, up.ry - 1.5, side * -0.6, fill);
    lobe(bp, lx, ly, lo.rx, lo.ry, side * 0.55, rim);
    lobe(bp, lx, ly, lo.rx - 1.5, lo.ry - 1.5, side * 0.55, fill);
    bp.line(rx, ry, ux + side * up.rx * 0.6, uy - up.ry * 0.5, vein);
    bp.line(rx, ry, ux + side * up.rx * 0.8, uy + 1, vein);
    bp.line(rx, ry + 2, lx + side * lo.rx * 0.6, ly + 1, vein);
    // the grandest's wings glow white in the middle
    if (level === 2) lobe(bp, ux + side * 2, uy - 1, up.rx - 7, up.ry - 4.5, side * -0.6, c('#ffffff'));
  });

}
