import { EYES, SKIN } from '../palette';
import { mix, painter, type Grid } from './grid';
import type { HairStyle, Look, Pose } from './figure';
import { paintHair, type MangaHair, type Shape } from './manga';

/* The noir head: a darker, sharper manga head in the spirit of Death Note. A narrower skull with an
   angular jaw, small sharp eyes, sleek hair cut into fine locks, and one hard cel shadow down the
   right side of the face. Drawn at full 64 like the manga head, and every part is a table.
   Three takes share the head and hair and differ only in the eyes and mouth (NOIR_EYES). */

type Pt = [number, number];

export type NoirTake = 'sharp' | 'sleepless' | 'gothic';

/**
 * The bare head as text art, top-left at `at`. S skin, s cel shadow, n nose, r mouth, . empty.
 * The cel shadow is a cooled, darkened skin tone, so every skin option keeps working.
 */
export const NOIR_HEAD = {
  at: [21, 7] as Pt,
  art: [
    '.....SSSSSSSSSSSS.....',
    '...SSSSSSSSSSSSSSSS...',
    '..SSSSSSSSSSSSSSSSSS..',
    '.SSSSSSSSSSSSSSSSSSss.',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSSsss',
    'SSSSSSSSSSSSSSSSSSssss',
    'SSSSSSSSSSnSSSSSSSssss',
    '.SSSSSSSSnnSSSSSSsssss',
    '.SSSSSSSSSSSSSSSSssss.',
    '..SSSSSSSSSSSSSSSsss..',
    '..SSSSSSSSSSSSSSssss..',
    '...SSSSSSSSSSSSsss....',
    '....SSSSSSSSSSsss.....',
    '.....SSSSSSSSsss......',
    '.......SSSSSSss.......',
    '.........SSSs.........',
  ],
};

/**
 * Each take's eyes, brows and mouth, painted over the head at the same `at`. '.' keeps the head.
 * b brow, L lash line, w eye white, W shine, i iris, p pupil, k dark ring / eye shadow,
 * r mouth, s cel shadow, S skin (to erase a head pixel).
 */
export const NOIR_EYES: Record<NoirTake, { art: string[]; iris: string; ring?: string; lips?: string; label: string }> = {
  /** Calm and calculating: thin brows angled in, narrow almond eyes, a small smirk. */
  sharp: {
    label: 'Sharp',
    iris: '#a8582e',
    art: [
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '..bbb...........bbb...',
      '....bbbb......bbbb....',
      '..LL..............LL..',
      '...LLLLLL....LLLLLL...',
      '...wWpiwL....LwWpiw...',
      '....iiiw......wiii....',
      '....sss........sss....',
      '......................',
      '......................',
      '......................',
      '..............r.......',
      '.........rrrrr........',
    ],
  },
  /** The sleepless genius: wide round staring eyes, no shine, dark rings, a flat mouth. */
  sleepless: {
    label: 'Sleepless',
    iris: '#14121a',
    ring: '#5a4660',
    art: [
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '...LLLLL......LLLLL...',
      '..LwwwwwL....LwwwwwL..',
      '..LwwppwL....LwppwwL..',
      '..LwwppwL....LwppwwL..',
      '..LwwwwwL....LwwwwwL..',
      '...LLLLL......LLLLL...',
      '...kkkkk......kkkkk...',
      '....kkk........kkk....',
      '......................',
      '......................',
      '..........rrr.........',
    ],
  },
  /** Gothic: heavy winged liner, a red glint in the eye, dark lips. */
  gothic: {
    label: 'Gothic',
    iris: '#b01c2e',
    ring: '#3a2440',
    lips: '#5a1a2a',
    art: [
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '......................',
      '..bbbb..........bbbb..',
      '......bb......bb......',
      '.LL................LL.',
      '..LLLLLLL....LLLLLLL..',
      '...wWpiiL....LWpiiw...',
      '...kLLLL......LLLLk...',
      '....kkk........kkk....',
      '......................',
      '......................',
      '......................',
      '......................',
      '.........rrrr.........',
    ],
  },
};

/** Where the eyes sit (left edge x of each, top y), for effects like the Hollow's glow. */
export const NOIR_EYE_BOX = { x: [24, 34], y: 16, w: 6, h: 3 };

const BAND = { base: '#7a1f2b', light: '#a83242', dark: '#3e0e16' };
const RIBBON = { base: '#1a1420', light: '#4a3a58' };

/** Fine side locks, down past the ears to the jaw, for the short styles. */
const SIDE_LOCKS: Shape[] = [
  [[[20, 10], [23, 10], [23, 21], [21, 25], [20, 18]], 1],
  [[[40, 10], [43, 10], [43, 18], [42, 25], [40, 21]], 1],
];

export const NOIR_HAIR: Record<HairStyle, MangaHair> = {
  /** Messy and unkempt: ragged locks in every direction, bangs falling into the eyes. */
  spiky: {
    cap: { cx: 31.5, cy: 12, rx: 13, ry: 9, cutY: 10 },
    back: [[[[18, 9], [45, 9], [48, 25], [44, 23], [42, 28], [21, 28], [19, 23], [15, 25]], 0]],
    front: [
      [[[18, 11], [22, 6], [14, 6]], 1],
      [[[21, 6], [27, 3], [19, 2]], 1],
      [[[26, 4], [32, 3], [29, 1]], 1],
      [[[31, 3], [37, 3], [37, 1]], 1],
      [[[36, 4], [42, 6], [45, 2]], 1],
      [[[41, 7], [45, 11], [50, 8]], 1],
      [[[19, 9], [25, 9], [21, 17]], 1],
      [[[23, 9], [29, 9], [26, 16]], 1],
      [[[27, 9], [33, 9], [30, 18]], 1],
      [[[31, 9], [37, 9], [35, 16]], 1],
      [[[35, 9], [41, 9], [39, 17]], 1],
      [[[39, 9], [45, 9], [44, 16]], 1],
      [[[18, 10], [22, 10], [22, 23], [19, 27], [18, 19]], 1],
      [[[41, 10], [45, 10], [46, 20], [44, 27], [41, 22]], 1],
    ],
    shine: [[27, 5, 31, 4]],
    strands: [
      [24, 8, 22, 13],
      [29, 8, 28, 13],
      [34, 8, 34, 12],
      [39, 8, 41, 13],
    ],
  },
  /** Neat and clever: a side part, one long sweep across the forehead, a lock between the eyes. */
  swept: {
    cap: { cx: 31.5, cy: 12, rx: 12, ry: 8, cutY: 10 },
    back: [[[[19, 10], [44, 10], [45, 24], [40, 26], [23, 26], [18, 24]], 0]],
    front: [
      [[[20, 9], [24, 5], [31, 3], [39, 4], [44, 9]], 1],
      [[[27, 5], [21, 8], [19, 15], [23, 11], [25, 14], [27, 9]], 1],
      [[[27, 5], [38, 5], [44, 10], [45, 17], [42, 13], [40, 16], [37, 12], [35, 15], [32, 11], [30, 14], [28, 10]], 1],
      [[[29, 10], [33, 10], [31, 18]], 1],
      ...SIDE_LOCKS,
    ],
    shine: [
      [31, 5, 36, 5],
      [22, 8, 24, 6],
    ],
    strands: [
      [27, 5, 23, 11],
      [31, 6, 36, 10],
      [36, 6, 41, 11],
    ],
  },
  /** Sleek and short, tied back with a thin dark-red band. */
  short: {
    cap: { cx: 31.5, cy: 12, rx: 12, ry: 8, cutY: 10 },
    back: [
      [[[43, 9], [47, 9], [51, 17], [48, 18]], BAND.base],
      [[[42, 11], [45, 11], [46, 20], [43, 20]], BAND.dark],
    ],
    front: [
      [[[20, 9], [24, 4], [31, 3], [39, 4], [44, 9]], 1],
      [[[20, 9], [43, 9], [43, 10], [20, 10]], BAND.base],
      [[[20, 9], [43, 9], [43, 9], [20, 9]], BAND.light],
      [[[20, 11], [26, 11], [22, 16]], 1],
      [[[25, 11], [31, 11], [28, 15]], 1],
      [[[30, 11], [36, 11], [33, 16]], 1],
      [[[35, 11], [42, 11], [40, 15]], 1],
      ...SIDE_LOCKS,
    ],
    shine: [[27, 5, 33, 4]],
    strands: [
      [26, 5, 25, 8],
      [33, 5, 35, 8],
    ],
  },
  /** Long and straight: blunt bangs, framing locks cut at the jaw, hair down past the shoulders. */
  long: {
    cap: { cx: 31.5, cy: 12, rx: 13, ry: 8, cutY: 11 },
    back: [[[[18, 8], [45, 8], [48, 44], [43, 46], [40, 38], [23, 38], [20, 46], [15, 44]], 0]],
    front: [
      [[[19, 9], [24, 4], [31, 3], [39, 4], [44, 9]], 1],
      [[[19, 8], [44, 8], [44, 14], [41, 15], [38, 14], [35, 15], [32, 14], [29, 15], [26, 14], [23, 15], [19, 14]], 1],
      [[[18, 10], [23, 10], [23, 31], [21, 30], [18, 31]], 1],
      [[[40, 10], [45, 10], [45, 31], [42, 30], [40, 31]], 1],
    ],
    shine: [
      [24, 6, 29, 5],
      [34, 5, 39, 6],
    ],
    strands: [
      [26, 10, 26, 13],
      [32, 10, 32, 13],
      [38, 10, 38, 13],
      [20, 16, 20, 28],
      [43, 16, 43, 28],
    ],
  },
  /** A high ponytail tied with a black ribbon, sleek bangs swept to one side. */
  pony: {
    cap: { cx: 31.5, cy: 12, rx: 12, ry: 8, cutY: 11 },
    back: [
      [[[38, 4], [45, 2], [52, 8], [55, 22], [53, 34], [49, 26], [47, 13]], 1],
      [[[45, 6], [49, 9], [51, 20], [50, 24], [48, 13]], 0],
    ],
    front: [
      [[[20, 9], [24, 4], [31, 3], [39, 4], [44, 9]], 1],
      [[[21, 7], [36, 6], [44, 10], [44, 16], [41, 12], [38, 15], [35, 11], [32, 14], [29, 11], [26, 14], [24, 11], [20, 15]], 1],
      [[[20, 10], [23, 10], [23, 25], [20, 26]], 1],
      [[[40, 10], [43, 10], [43, 25], [40, 26]], 1],
      [[[42, 2], [48, 1], [49, 5], [45, 6]], RIBBON.base],
      [[[43, 2], [47, 2], [47, 3], [43, 3]], RIBBON.light],
    ],
    shine: [
      [25, 6, 30, 5],
      [34, 5, 38, 6],
    ],
    strands: [
      [29, 7, 27, 12],
      [35, 7, 37, 11],
    ],
  },
};

/** Which take a look's head is, or null when it isn't a noir head. */
export const noirTake = (look: Look): NoirTake | null => {
  const t = look.head?.startsWith('noir-') ? (look.head.slice(5) as NoirTake) : null;
  return t && t in NOIR_EYES ? t : null;
};

/** Paints the noir head (skin, cel shadow, eyes) onto `g`, the body grid at 64. */
export function noirHead(g: Grid, P: Pose, look: Look, take: NoirTake, hair?: Grid) {
  const u = painter(g, P.bob),
    Sk = SKIN[look.skin],
    E = NOIR_EYES[take],
    [ax, ay] = NOIR_HEAD.at,
    cel = mix(Sk[0], '#2a2244', 0.35),
    ink: Record<string, string> = {
      S: Sk[1],
      s: cel,
      n: Sk[0],
      r: E.lips ?? mix(Sk[0], '#3a1a22', 0.35),
      b: mix(EYES.line, Sk[0], 0.25),
      L: EYES.line,
      w: '#ece8f0',
      W: EYES.shine,
      i: E.iris,
      p: '#0c0a10',
      k: mix(Sk[0], E.ring ?? Sk[0], 0.6),
    };
  const paint = (art: string[]) => art.forEach((row, j) => [...row].forEach((ch, i) => ink[ch] && u.p(ax + i, ay + j, ink[ch])));
  paint(NOIR_HEAD.art);
  paint(E.art);
  // Lash flicks at the outer corners on the female body.
  if (look.sex === 'f') {
    u.p(ax + 1, ay + 8, EYES.line);
    u.p(ax + 20, ay + 8, EYES.line);
  }
  if (!hair) return;
  // The hair casts a hard shadow on the forehead, two pixels deep.
  for (let y = 0; y < g.length - 2; y++)
    for (let x = 0; x < g[0].length; x++)
      if (hair[y][x] && !hair[y + 1][x])
        for (const d of [1, 2]) if (g[y + d]?.[x] === Sk[1] && !hair[y + d][x]) g[y + d][x] = cel;
}

/** The noir hair, split so the back locks can sit behind the head. */
export const noirHair = (P: Pose, look: Look) => paintHair(NOIR_HAIR[look.style], P, look);
