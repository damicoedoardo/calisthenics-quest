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
  /** Extra lash flicks at the outer eye corners on the female body. */
  lashes: [
    [20, 15],
    [43, 15],
  ] as Pt[],
};

/** A shape and its color: a hair tone (0 dark, 1 base, 2 light) or a hex color. */
export type Shape = [Pt[], number | string];

/** Hair as shapes: a cap (ellipse, cut off above the face) plus locks and extras. */
export interface MangaHair {
  cap: { cx: number; cy: number; rx: number; ry: number; cutY: number };
  /** Behind the head. */
  back: Shape[];
  /** Spikes, bangs, side locks, headbands: painted in order over the cap. */
  front: Shape[];
  /** Light streaks [x0, y0, x1, y1]. */
  shine: [number, number, number, number][];
  /** Dark strand lines between locks [x0, y0, x1, y1], drawn last. */
  strands?: [number, number, number, number][];
}

const SIDE_LOCKS: Shape[] = [
  [[[17, 12], [20, 12], [19, 25], [17, 21]], 1],
  [[[44, 12], [47, 12], [47, 21], [45, 25]], 1],
];
/** Softer, longer bangs for the long and pony styles. */
const SOFT_BANGS: Shape[] = [
  [[[17, 10], [26, 10], [19, 18]], 1],
  [[[24, 10], [32, 10], [27, 17]], 1],
  [[[30, 10], [38, 10], [35, 16]], 1],
  [[[36, 10], [44, 10], [41, 17]], 1],
  [[[42, 10], [48, 10], [46, 19]], 1],
];
const BAND = { base: '#c0392b', light: '#e8604c', dark: '#7a1f18' };
const RIBBON = { base: '#db2777', light: '#f472b6' };

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
  /** Long and loose: soft bangs, locks framing the face, hair down past the shoulders. */
  long: {
    cap: { cx: 32, cy: 13, rx: 16, ry: 10, cutY: 12 },
    back: [[[[15, 10], [49, 10], [51, 40], [46, 43], [43, 36], [21, 36], [18, 43], [13, 40]], 0]],
    front: [
      [[[30, 4], [34, 4], [37, 0]], 1],
      ...SOFT_BANGS,
      [[[16, 11], [21, 11], [22, 33], [18, 36], [15, 27]], 1],
      [[[43, 11], [48, 11], [49, 27], [46, 36], [42, 33]], 1],
    ],
    shine: [
      [22, 6, 27, 5],
      [36, 5, 41, 6],
    ],
  },
  /** High ponytail swinging out behind, tied with a ribbon. */
  pony: {
    cap: { cx: 32, cy: 13, rx: 16, ry: 10, cutY: 12 },
    back: [
      [[[41, 5], [47, 3], [54, 9], [57, 21], [55, 31], [51, 25], [49, 14]], 1],
      [[[47, 6], [51, 9], [53, 20], [51, 22], [49, 13]], 0],
    ],
    front: [
      ...SOFT_BANGS,
      [[[16, 11], [21, 11], [21, 26], [17, 27]], 1],
      [[[43, 11], [48, 11], [47, 27], [43, 26]], 1],
      [[[44, 3], [49, 2], [50, 6], [46, 7]], RIBBON.base],
      [[[45, 3], [48, 3], [48, 4], [45, 4]], RIBBON.light],
    ],
    shine: [
      [22, 6, 27, 5],
      [35, 5, 40, 6],
    ],
  },
};

/** Whether a look gets the manga head: hairstyles without a manga version stay classic. */
export const isManga = (look: Look) => look.head === 'manga' && !!MANGA_HAIR[look.style];

/**
 * Paints the manga head (skin and face) onto `g`, the body grid at 64. With `hair` (the front hair
 * grid), the bangs also cast a soft shadow on the forehead, just below their outline.
 */
export function mangaHead(g: Grid, P: Pose, look: Look, hair?: Grid) {
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
  if (look.sex === 'f') F.lashes.forEach(([x, y]) => u.p(x, y, EYES.line));
  if (!hair) return;
  for (let y = 0; y < g.length - 2; y++)
    for (let x = 0; x < g[0].length; x++)
      if (hair[y][x] && !hair[y + 1][x] && !hair[y + 2][x] && g[y + 2][x] === Sk[1]) g[y + 2][x] = Sk[0];
}

/** The manga hair, split so the back locks can sit behind the head. */
export function mangaHair(P: Pose, look: Look): { back: Grid; front: Grid } | null {
  const style = MANGA_HAIR[look.style];
  return style ? paintHair(style, P, look) : null;
}

/** Paints a hair table (cap, back and front shapes, shine) in the look's hair color. */
export function paintHair(style: MangaHair, P: Pose, look: Look): { back: Grid; front: Grid } {
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
  style.strands?.forEach(([x0, y0, x1, y1]) => f.line(x0, y0, x1, y1, H[0]));
  return { back, front };
}
