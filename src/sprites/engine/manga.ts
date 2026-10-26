import { EYES, HAIR, SKIN } from '../palette';
import { grid, painter, type Grid } from './grid';
import type { HairStyle, Look, Pose } from './figure';

/* The manga head: drawn at full 64 resolution (no Scale2x) so the eyes, the chin and every hair
   lock can be sharp. Everything is a table: edit the numbers to reshape it. */

type Pt = [number, number];

/**
 * The head and face as text art, one character per pixel, placed with its top-left at `at`.
 * S skin, s skin shadow, T skin light, b brow, L lash line, w eye white, W shine,
 * d/m/l iris dark/mid/light, p pupil, r mouth, . empty.
 */
export const MANGA_FACE = {
  at: [18, 6] as Pt,
  art: [
    '......SSSSSSSSSSSSSSSS......',
    '....SSSSSSSSSSSSSSSSSSSS....',
    '..SSSSSSSSSSSSSSSSSSSSSSSS..',
    '.SSSSSSSSSSSSSSSSSSSSSSSSSS.',
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSs',
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSs',
    'SSSbbbSSSSSSSSSSSSSSSSbbbSSs',
    'SSSSSSbbbSSSSSSSSSSbbbSSSSSs',
    'SSSSSSSSSSSSSSSSSSSSSSSSSSSs',
    'SSSSSLLLLLSSSSSSSSLLLLLSSSSs',
    'SSSLLLLLLLSSSSSSSSLLLLLLLSSs',
    'SSSLwWWddwSSSSSSSSwWWddwLSSs',
    'SSSSwWWpdwSSSSSSSSwWWpdwSSSs',
    'SSSSwdppdwSSSSSSSSwdppdwSSSs',
    'SSSSwmppmwSSSSSSSSwmppmwSSSs',
    'SSSSwmllmwSSSSSSSSwmllmwSSSs',
    'SSSSSmllmSSSSSSSSSSmllmSSSSs',
    '.SSSSSLLSSSSSSSSSSSSLLSSSSs.',
    '.SSSSSSSSSSSSSsSSSSSSSSSSSs.',
    '..SSSSSSSSSSSSSSSSSSSSSSSs..',
    '...SSSSSSSSSrrrrSSSSSSSSs...',
    '.....SSSSSSSSSSSSSSSSSs.....',
    '.......SSSSSSSSSSSSSs.......',
    '..........SSSSSSSs..........',
  ],
  iris: ['#3a2416', '#7a4a2a', '#c08a52'],
  pupil: '#1a1014',
  white: '#f4f1f6',
  mouth: '#9a4a3a',
  /** Where the eyes are (left edge x of each, top y), for effects like the Hollow's glow. */
  eyes: { x: [21, 36], y: 15, w: 7, h: 9 },
};

/** A shape and its color: a hair tone (0 dark, 1 base, 2 light) or a hex color. */
type Shape = [Pt[], number | string];

/** Hair as shapes: a cap (ellipse, cut off above the face) plus locks and extras. */
interface MangaHair {
  cap: { cx: number; cy: number; rx: number; ry: number; cutY: number };
  /** Behind the head. */
  back: Shape[];
  /** Spikes, bangs, side locks, headbands: painted in order over the cap. */
  front: Shape[];
  /** Light streaks [x0, y0, x1, y1]. */
  shine: [number, number, number, number][];
}

const SIDE_LOCKS: Shape[] = [
  [[[17, 12], [20, 12], [19, 25], [17, 21]], 1],
  [[[44, 12], [47, 12], [47, 21], [45, 25]], 1],
];
const BAND = { base: '#c0392b', light: '#e8604c', dark: '#7a1f18' };

export const MANGA_HAIR: Partial<Record<HairStyle, MangaHair>> = {
  /** Shonen hero: big spikes up and out, pointed bangs. */
  spiky: {
    cap: { cx: 32, cy: 13, rx: 15, ry: 10, cutY: 11 },
    back: [
      [[[16, 13], [19, 24], [10, 21]], 0],
      [[[48, 13], [45, 24], [54, 21]], 0],
    ],
    front: [
      [[[17, 13], [21, 6], [8, 5]], 1],
      [[[19, 8], [27, 3], [15, 0]], 1],
      [[[25, 4], [36, 3], [30, 0]], 1],
      [[[34, 3], [43, 6], [47, 0]], 1],
      [[[42, 6], [47, 13], [56, 7]], 1],
      [[[17, 10], [24, 10], [18, 18]], 1],
      [[[22, 10], [30, 10], [25, 15]], 1],
      [[[28, 10], [36, 10], [32, 17]], 1],
      [[[34, 10], [42, 10], [39, 15]], 1],
      [[[40, 10], [47, 10], [46, 18]], 1],
      ...SIDE_LOCKS,
    ],
    shine: [
      [21, 8, 25, 6],
      [29, 5, 33, 5],
    ],
  },
  /** Calm and cool: one long sweep of bangs across the forehead. */
  swept: {
    cap: { cx: 32, cy: 13, rx: 15, ry: 10, cutY: 11 },
    back: [
      [[[16, 14], [18, 26], [12, 22]], 0],
      [[[48, 14], [46, 26], [52, 22]], 0],
    ],
    front: [
      [[[19, 8], [29, 3], [16, 1]], 1],
      [[[27, 4], [40, 4], [37, 0]], 1],
      [[[38, 4], [46, 9], [50, 2]], 1],
      [[[47, 9], [44, 4], [30, 5], [18, 9], [13, 18], [19, 14], [21, 19], [25, 13], [28, 17], [31, 12], [37, 13], [41, 11], [43, 14], [47, 12]], 1],
      [[[17, 12], [21, 12], [20, 27], [17, 24]], 1],
      [[[44, 12], [47, 12], [47, 22], [45, 25]], 1],
    ],
    shine: [
      [36, 7, 42, 9],
      [24, 8, 30, 7],
    ],
  },
  /** Training hero: short spikes and a red headband with tails. */
  short: {
    cap: { cx: 32, cy: 13, rx: 15, ry: 9, cutY: 11 },
    back: [
      // the knot's two tails, flying back
      [[[47, 10], [51, 10], [55, 18], [52, 19]], BAND.base],
      [[[46, 12], [49, 12], [50, 21], [47, 21]], BAND.dark],
    ],
    front: [
      [[[18, 9], [23, 6], [14, 2]], 1],
      [[[22, 6], [29, 4], [22, 0]], 1],
      [[[28, 4], [35, 4], [32, 0]], 1],
      [[[34, 4], [41, 6], [42, 0]], 1],
      [[[40, 6], [46, 9], [51, 3]], 1],
      [[[17, 9], [47, 9], [47, 11], [17, 11]], BAND.base],
      [[[17, 9], [47, 9], [47, 9], [17, 9]], BAND.light],
      [[[45, 9], [49, 9], [49, 12], [45, 12]], BAND.dark],
      [[[22, 11], [27, 11], [23, 15]], 1],
      [[[30, 11], [35, 11], [33, 15]], 1],
      [[[38, 11], [43, 11], [41, 14]], 1],
      ...SIDE_LOCKS,
    ],
    shine: [[24, 6, 28, 5]],
  },
};

/** Paints the manga head (skin and face) onto `g`, the body grid at 64. */
export function mangaHead(g: Grid, P: Pose, look: Look) {
  const u = painter(g, P.bob),
    Sk = SKIN[look.skin],
    F = MANGA_FACE,
    ink: Record<string, string> = {
      S: Sk[1],
      s: Sk[0],
      T: Sk[2],
      b: HAIR[look.hair][0],
      L: EYES.line,
      w: F.white,
      W: EYES.shine,
      d: F.iris[0],
      m: F.iris[1],
      l: F.iris[2],
      p: F.pupil,
      r: F.mouth,
    };
  F.art.forEach((row, j) => [...row].forEach((ch, i) => ink[ch] && u.p(F.at[0] + i, F.at[1] + j, ink[ch])));
}

/** The manga hair, split so the back locks can sit behind the head. */
export function mangaHair(P: Pose, look: Look): { back: Grid; front: Grid } | null {
  const style = MANGA_HAIR[look.style];
  if (!style) return null;
  const H = HAIR[look.hair],
    back = grid(64),
    front = grid(64),
    b = painter(back, P.bob),
    f = painter(front, P.bob),
    { cx, cy, rx, ry, cutY } = style.cap;
  const ink = (c: number | string) => (typeof c === 'number' ? H[c] : c);
  style.back.forEach(([pts, c]) => b.poly(pts, ink(c)));
  for (let y = Math.floor(cy - ry); y <= cutY; y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx,
        dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) f.p(x, y, H[1]);
    }
  style.front.forEach(([pts, c]) => f.poly(pts, ink(c)));
  style.shine.forEach(([x0, y0, x1, y1]) => f.line(x0, y0, x1, y1, H[2]));
  return { back, front };
}
