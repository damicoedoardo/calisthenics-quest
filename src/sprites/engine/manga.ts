import { EYES, EYE_COLORS, HAIR, SKIN } from '../palette';
import { grid, mix, painter, type Grid, type Painter } from './grid';
import type { FaceMark, HairStyle, Look, Pose } from './figure';

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
  /** Brown, the default; a look's `eyes` picks another from EYE_COLORS. */
  iris: EYE_COLORS.brown,
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
  /** Dark lines that split the hair into locks [x0, y0, x1, y1]. */
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
/** The curly style's puffs [x, y, r]: over the top, then the bangs; and the ones behind. */
const CURLS: [number, number, number][] = [
  [21, 5, 4], [28, 4, 4], [35, 4, 4], [42, 5, 4],
  [17, 9, 4], [24, 8, 4], [31, 8, 4], [38, 8, 4], [46, 9, 4],
  [19, 12, 3], [25, 12, 3], [31, 12, 3], [37, 12, 3], [43, 12, 3],
];
const CURLS_BACK: Pt[] = [[14, 9], [12, 15], [13, 21], [17, 26], [50, 9], [52, 15], [51, 21], [47, 26]];
const BAND = { base: '#c0392b', light: '#e8604c', dark: '#7a1f18' };
const RIBBON = { base: '#db2777', light: '#f472b6' };

/** The same shape on the other side of the face (the face is centered on x 32). */
const mirror = ([pts, c]: Shape): Shape => [pts.map(([x, y]) => [64 - x, y] as Pt), c];
const both = (s: Shape): Shape[] => [s, mirror(s)];
/** An oval as points. */
function oval(cx: number, cy: number, rx: number, ry: number, n = 16): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)] as Pt;
  });
}

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
    strands: [
      [13, 6, 18, 10],
      [20, 3, 24, 8],
      [31, 2, 31, 6],
      [41, 3, 38, 7],
      [51, 6, 45, 10],
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
  /** Cropped short all over: a neat fringe and short sides. */
  buzz: {
    cap: { cx: 32, cy: 13, rx: 15, ry: 9, cutY: 10 },
    back: [],
    front: [
      [[[17, 8], [47, 8], [47, 11], [44, 13], [41, 11], [37, 12], [33, 11], [29, 13], [25, 11], [21, 12], [17, 11]], 1],
      ...both([[[17, 10], [20, 10], [20, 16], [18, 15]], 1]),
    ],
    shine: [
      [22, 7, 27, 6],
      [33, 6, 37, 6],
    ],
    strands: [
      [24, 9, 25, 11],
      [32, 9, 32, 11],
      [40, 9, 39, 11],
    ],
  },
  /** A wild mane: spikes everywhere and long spiky locks down the back. */
  wild: {
    cap: { cx: 32, cy: 13, rx: 16, ry: 10, cutY: 11 },
    back: [...both([[[17, 12], [9, 34], [15, 28], [13, 40], [22, 26]], 0]), ...both([[[16, 10], [5, 18], [15, 20]], 0])],
    front: [
      [[[16, 13], [20, 5], [5, 7]], 1],
      [[[18, 8], [25, 3], [11, 0]], 1],
      [[[23, 5], [32, 3], [24, 0]], 1],
      [[[30, 3], [38, 4], [36, 0]], 1],
      [[[36, 4], [44, 5], [52, 0]], 1],
      [[[42, 5], [48, 12], [59, 6]], 1],
      [[[17, 10], [25, 10], [17, 20]], 1],
      [[[22, 10], [30, 10], [27, 18]], 1],
      [[[29, 10], [36, 10], [31, 16]], 1],
      [[[34, 10], [42, 10], [40, 18]], 1],
      [[[40, 10], [48, 10], [48, 21]], 1],
      ...SIDE_LOCKS,
    ],
    shine: [
      [20, 7, 24, 5],
      [30, 5, 34, 5],
    ],
    strands: [
      [11, 7, 17, 10],
      [21, 2, 24, 7],
      [34, 1, 33, 5],
      [46, 3, 41, 7],
      [55, 7, 46, 10],
    ],
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
  /** A chin-length bob with blunt bangs. */
  bob: {
    cap: { cx: 32, cy: 13, rx: 16, ry: 10, cutY: 12 },
    back: [[[[15, 10], [49, 10], [50, 29], [45, 31], [19, 31], [14, 29]], 0]],
    front: [
      [[[17, 9], [47, 9], [47, 14], [42, 15], [37, 14], [32, 15], [27, 14], [22, 15], [17, 14]], 1],
      ...both([[[15, 11], [21, 11], [21, 24], [23, 30], [16, 30], [14, 23]], 1]),
    ],
    shine: [
      [21, 6, 27, 5],
      [35, 5, 41, 6],
    ],
    strands: [
      [26, 10, 26, 14],
      [38, 10, 38, 14],
    ],
  },
  /** Pulled back into a bun up on the head, two soft locks by the ears. */
  bun: {
    cap: { cx: 32, cy: 13, rx: 15, ry: 10, cutY: 11 },
    back: [[oval(43, 4, 6, 5), 1]],
    front: [
      [[[17, 11], [24, 6], [31, 9], [26, 11]], 1],
      [[[33, 9], [40, 6], [47, 11], [38, 11]], 1],
      ...both([[[17, 10], [20, 10], [20, 25], [17, 21]], 1]),
      [[[38, 4], [42, 2], [44, 6], [40, 8]], RIBBON.base],
      [[[39, 4], [41, 3], [42, 4], [40, 5]], RIBBON.light],
    ],
    shine: [
      [22, 6, 27, 5],
      [42, 1, 46, 2],
    ],
    strands: [
      [32, 3, 32, 9],
      [26, 4, 22, 9],
      [38, 4, 42, 9],
    ],
  },
  /** Twin tails tied high on both sides, swinging down past the shoulders. */
  twin: {
    cap: { cx: 32, cy: 13, rx: 16, ry: 10, cutY: 12 },
    back: [...both([[[19, 5], [13, 3], [8, 10], [6, 24], [9, 36], [12, 28], [14, 17], [17, 10]], 1]), ...both([[[13, 5], [9, 11], [8, 24], [10, 30], [11, 16]], 0])],
    front: [
      ...SOFT_BANGS,
      ...both([[[16, 11], [21, 11], [21, 26], [17, 27]], 1]),
      ...both([[[14, 3], [19, 2], [19, 7], [15, 7]], RIBBON.base]),
      ...both([[[15, 3], [18, 3], [18, 4], [15, 4]], RIBBON.light]),
    ],
    shine: [
      [22, 6, 27, 5],
      [35, 5, 40, 6],
    ],
  },
  /** Big soft curls all round the head: round puffs, each with its own light and shadow. */
  curly: {
    cap: { cx: 32, cy: 13, rx: 16, ry: 10, cutY: 11 },
    back: CURLS_BACK.map(([x, y]): Shape => [oval(x, y, 5, 5, 12), 0]),
    front: [...CURLS.map(([x, y, r]): Shape => [oval(x, y, r, r, 12), 1]), ...both([[[15, 12], [20, 12], [21, 22], [17, 25], [14, 20]], 1])],
    shine: CURLS.map(([x, y]) => [x - 2, y - 1, x - 1, y - 2]),
    strands: CURLS.map(([x, y, r]) => [x + 1, y + r - 1, x + r - 1, y + 1]),
  },
};

/** Whether a look gets the manga head: hairstyles without a manga version stay classic. */
export const isManga = (look: Look) => look.head === 'manga' && !!MANGA_HAIR[look.style];

/** The face marks, painted over the face (63 - x is the same spot on the other cheek). */
const MARKS: Record<Exclude<FaceMark, 'none'>, (u: Painter, Sk: string[]) => void> = {
  freckles: (u, Sk) => {
    const c = mix(Sk[0], '#6a3018', 0.35);
    [[21, 24], [23, 25], [25, 24], [22, 26]].forEach(([x, y]) => (u.p(x, y, c), u.p(63 - x, y, c)));
  },
  blush: (u, Sk) => {
    const c = mix(Sk[1], '#e8506a', 0.45),
      soft = mix(Sk[1], '#e8506a', 0.3);
    u.row(24, 21, 25, c);
    u.row(24, 38, 42, c);
    u.row(25, 22, 24, soft);
    u.row(25, 39, 41, soft);
  },
  scar: (u, Sk) => {
    const c = mix(Sk[0], '#9a2a3a', 0.55);
    u.line(42, 9, 40, 14, c);
    u.line(40, 24, 38, 28, c);
  },
  plaster: (u) => {
    u.r(28, 23, 8, 2, '#f2dfbc');
    u.row(23, 29, 34, '#fff3dc');
    u.col(28, 23, 24, '#c9a878');
    u.col(35, 23, 24, '#c9a878');
    u.p(31, 24, '#c9a878');
    u.p(32, 23, '#c9a878');
  },
  mole: (u, Sk) => u.r(40, 26, 2, 1, mix(Sk[0], '#1a1014', 0.6)),
};

/**
 * Paints the manga head (skin and face) onto `g`, the body grid at 64. With `hair` (the front hair
 * grid), the bangs also cast a soft shadow on the forehead, just below their outline.
 */
export function mangaHead(g: Grid, P: Pose, look: Look, hair?: Grid) {
  const u = painter(g, P.bob),
    Sk = SKIN[look.skin],
    F = MANGA_FACE,
    iris = look.eyes ? EYE_COLORS[look.eyes] : F.iris,
    ink: Record<string, string> = {
      S: Sk[1],
      s: Sk[0],
      T: Sk[2],
      b: HAIR[look.hair][0],
      L: EYES.line,
      w: F.white,
      W: EYES.shine,
      d: iris[0],
      m: iris[1],
      l: iris[2],
      p: F.pupil,
      r: F.mouth,
    };
  F.art.forEach((row, j) => [...row].forEach((ch, i) => ink[ch] && u.p(F.at[0] + i, F.at[1] + j, ink[ch])));
  if (look.sex === 'f') F.lashes.forEach(([x, y]) => u.p(x, y, EYES.line));
  if (look.mark && look.mark !== 'none') MARKS[look.mark](u, Sk);
  if (!hair) return;
  for (let y = 0; y < g.length - 2; y++)
    for (let x = 0; x < g[0].length; x++)
      if (hair[y][x] && !hair[y + 1][x] && !hair[y + 2][x] && g[y + 2][x] === Sk[1]) g[y + 2][x] = Sk[0];
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
  shadeHair(front, H, cx, cy + P.bob, rx, ry);
  if (style.strands) {
    // only over hair already there, so a line never pokes out of a lock
    const lines = grid(64);
    style.strands.forEach(([x0, y0, x1, y1]) => painter(lines, P.bob).line(x0, y0, x1, y1, H[0]));
    lines.forEach((row, y) => row.forEach((c, x) => c && front[y][x] && (front[y][x] = c)));
  }
  style.shine.forEach(([x0, y0, x1, y1]) => f.line(x0, y0, x1, y1, H[2]));
  return { back, front };
}

/** Gives the hair volume, lit from the top left: the far side and the lower part fall into the
    dark tone, and every lock darkens toward its tip, so the locks read one by one. */
function shadeHair(g: Grid, H: string[], cx: number, cy: number, rx: number, ry: number) {
  const base = g.map((row) => row.slice()),
    at = (x: number, y: number) => base[y]?.[x] ?? null;
  for (let y = 0; y < g.length; y++)
    for (let x = 0; x < g[0].length; x++) {
      if (base[y][x] !== H[1]) continue;
      const side = ((x - cx) / rx) * 0.8 + ((y - cy) / ry) * 0.6,
        tip = !at(x, y + 1) || !at(x, y + 2);
      if (side > 0.55 || tip) g[y][x] = H[0];
    }
}
