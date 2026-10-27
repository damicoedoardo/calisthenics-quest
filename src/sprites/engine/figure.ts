import type { ArmLeft, ArmRight, ClipFrame, ClipId, Fx } from '../clips';
import { EYES, HAIR, R, SKIN, type HairColor, type SkinTone } from '../palette';
import { autoshade, grid, outline, painter, scale2x, stamp, type Grid, type Painter, type Ramp } from './grid';
import { MANGA_FACE, isManga, mangaHair, mangaHead } from './manga';

/* The base 64x64 humanoid every character is built on: body, face, hair, arms, and the layer
   order that dresses it. The body and hair are designed on a 32-px grid ("body pixels") and
   doubled with Scale2x; the face and every layer a character adds are drawn at full 64. */

export const SIZE = 64;

export type HairStyle = 'spiky' | 'swept' | 'short' | 'long' | 'pony';

export interface Look {
  sex: 'm' | 'f';
  style: HairStyle;
  hair: HairColor;
  skin: SkinTone;
  /** Head drawing: 'classic' (designed at 32, doubled) or 'manga' (drawn at 64, see manga.ts).
      A hairstyle without a manga version falls back to classic. */
  head?: 'classic' | 'manga';
}

// ---------- the body, in body pixels (32 grid) ----------

type Rect = [x: number, y: number, w: number, h: number];

export const BODY = {
  /** Two legs from hip to ankle; the left one catches the light on its outer edge. */
  legs: { x: [12, 17], y: 23, w: 3, h: 6 },
  boots: { x: [11, 17], y: 29, w: 4, h: 2 },
  /** The shirt under any outfit. */
  torso: { m: [[11, 15, 10, 8]] as Rect[], f: [[12, 15, 8, 5], [11, 20, 10, 3]] as Rect[] },
  /** Head, row by row: [y, x0, x1]. */
  head: [[3, 11, 20], [4, 10, 21], ...[5, 6, 7, 8, 9, 10, 11, 12, 13].map((y) => [y, 9, 22]), [14, 10, 21]] as [number, number, number][],
  /** Shadow down the right side of the head. */
  headShade: { x: 22, y0: 6, y1: 13 },
  /** Shoulder joints [x, y]. Female shoulders sit 1 px further in. */
  shoulders: { right: [21, 15], left: [9, 15], femInset: 1 },
} as const;

const SPIKY_ROWS: [number, number, number, number][] = [[1, 11, 11, 2], [1, 15, 15, 2], [1, 19, 19, 1], [2, 10, 12, 2], [2, 14, 16, 2], [2, 18, 20, 1], [3, 9, 22, 1], [3, 9, 13, 2], [4, 8, 23, 1], [4, 9, 12, 2], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [5, 23, 23, 0], [6, 23, 23, 0], [7, 23, 23, 0], [8, 8, 11, 0], [8, 13, 14, 0], [8, 17, 18, 0], [8, 21, 23, 0], [9, 8, 8, 0], [10, 8, 8, 0], [11, 8, 8, 0], [9, 23, 23, 0], [10, 23, 23, 0], [11, 23, 23, 0]];

/** Hair shapes: [y, x0, x1, tone] rows, tone = index into the hair ramp (0 dark, 2 light). */
export const HAIRSTYLES: Record<HairStyle, [number, number, number, number][]> = {
  spiky: SPIKY_ROWS,
  short: SPIKY_ROWS,
  swept: [[2, 11, 20, 1], [2, 12, 15, 2], [3, 9, 22, 1], [3, 10, 15, 2], [4, 8, 23, 1], [4, 10, 13, 2], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [8, 8, 16, 1], [8, 14, 16, 0], [8, 21, 23, 0], [9, 8, 10, 0], [9, 23, 23, 0], [10, 8, 8, 0], [10, 23, 23, 0], [5, 23, 23, 0], [6, 23, 23, 0], [7, 23, 23, 0]],
  long: [[2, 11, 20, 1], [2, 12, 16, 2], [3, 9, 22, 1], [3, 10, 14, 2], [4, 8, 23, 1], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [8, 8, 12, 1], [8, 15, 16, 0], [8, 19, 23, 1], [5, 23, 23, 0], [6, 23, 23, 0], [7, 23, 23, 0]],
  pony: [[2, 11, 20, 1], [2, 12, 16, 2], [3, 9, 22, 1], [3, 10, 14, 2], [4, 8, 23, 1], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [8, 8, 12, 1], [8, 15, 16, 0], [8, 19, 23, 1], [9, 8, 9, 1], [10, 8, 9, 1], [11, 8, 9, 0], [9, 22, 23, 1], [10, 22, 23, 1], [11, 22, 23, 0]],
};

// ---------- the face, in sprite pixels (64 grid) ----------

/**
 * One eye, top row first. L outline, d/m/l iris dark/mid/light, W shine, . skin.
 * Both eyes use the same pattern.
 */
export const EYE_PATTERN = ['LLLL', 'LLLL', 'LmWW', 'dmWd', 'dlmd', '.dd.'];

export const FACE = {
  /** Left edge of each eye, and the eyes' top row. */
  eyes: { x: [24, 36], y: 18 },
  /** Eyebrows: [y, x0, x1]. */
  brows: [[16, 24, 26], [16, 37, 39]] as [number, number, number][],
  nose: [31, 24],
  mouth: { m: { row: [27, 29, 33], corner: [34, 26] }, f: { row: [27, 30, 32], lip: [31, 28] } },
  /** Lashes flick out from the outer corner of each eye (female). */
  lashes: [
    [-1, 0],
    [-2, -1],
  ],
  blush: { y: 25, rows: [[21, 23], [40, 42]] as [number, number][], color: '#f29a8e' },
  lips: { color: '#c4566a', lower: '#a84458' },
};

// ---------- pose: a clip frame turned into arm and hand positions ----------

type Pt = { x: number; y: number };
export interface Arm {
  rect: [number, number, number, number];
  hand: [number, number];
}

/** Weapon-arm shapes, from the shoulder `s` (body pixels). `ax` is where a drawn bow string ends. */
const RIGHT_ARM: Record<ArmRight, (s: Pt, ax: number) => Arm> = {
  down: (s) => ({ rect: [s.x, s.y, 2, 6], hand: [s.x, s.y + 6] }),
  up: (s) => ({ rect: [s.x + 1, s.y - 6, 2, 7], hand: [s.x + 1, s.y - 8] }),
  fwd: (s) => ({ rect: [s.x, s.y + 2, 5, 2], hand: [s.x + 5, s.y + 2] }),
  pull: (s, ax) => ({ rect: [ax + 2, s.y + 2, s.x - ax, 2], hand: [ax, s.y + 2] }),
};
/** Off-hand shapes. */
const LEFT_ARM: Record<ArmLeft, (s: Pt) => Arm> = {
  down: (s) => ({ rect: [s.x, s.y, 2, 6], hand: [s.x, s.y + 6] }),
  out: (s) => ({ rect: [s.x - 4, s.y + 2, 6, 2], hand: [s.x - 6, s.y + 2] }),
  up: (s) => ({ rect: [s.x - 1, s.y - 6, 2, 7], hand: [s.x - 1, s.y - 8] }),
};

export interface Pose {
  /** Frame index in the clip, for effects that alternate. */
  f: number;
  fem: boolean;
  right: ArmRight;
  left: ArmLeft;
  fx: Fx | null;
  /** Upper-body drop in sprite pixels. */
  bob: number;
  /** The foot off the ground mid-step (-1 left, 1 right), or 0. */
  step: number;
  /** Where a drawn bow string ends (x), or null. */
  drawX: number | null;
  /** Arm rects and hand positions in sprite pixels, bob included. */
  arms: { R: Arm; L: Arm };
}

export function poseFor(frame: ClipFrame, stance: ClipFrame, look: Look, f: number): Pose {
  const fr = { ...stance, ...frame },
    fem = look.sex === 'f',
    inset = fem ? BODY.shoulders.femInset : 0,
    bob = fr.bob ?? 0,
    right = fr.right ?? 'down',
    left = fr.left ?? 'down',
    RS = { x: BODY.shoulders.right[0] - inset, y: BODY.shoulders.right[1] + bob },
    LS = { x: BODY.shoulders.left[0] + inset, y: BODY.shoulders.left[1] + bob },
    lhx = LEFT_ARM.out(LS).hand[0],
    draw = fr.draw ?? null,
    up2 = (q: Arm): Arm => ({ rect: q.rect.map((v) => v * 2) as Arm['rect'], hand: q.hand.map((v) => v * 2) as Arm['hand'] });
  return {
    f,
    fem,
    right,
    left,
    fx: fr.fx ?? null,
    bob: bob * 2,
    step: fr.step ?? 0,
    drawX: draw != null ? (lhx + draw) * 2 : null,
    arms: { R: up2(RIGHT_ARM[right](RS, lhx + (draw ?? 0))), L: up2(LEFT_ARM[left](LS)) },
  };
}

// ---------- characters: what a spec can add ----------

export interface Ctx {
  P: Pose;
  look: Look;
  /** The spec's main ramp. */
  A: Ramp;
  skin: Ramp;
  hair: Ramp;
  /** Upper body, moves with the bob. */
  u: Painter;
  /** Legs and ground, no bob. */
  l: Painter;
  /** Absolute; arm and hand coordinates already include the bob. */
  w: Painter;
  /** Effects: no outline, no shading. */
  fx: Painter;
  fxu: Painter;
  /** Torso x-range at a body row y (30..45, without bob). */
  torsoRange: (y: number) => [number, number];
}

export type Layer = 'back' | 'outfit' | 'head' | 'off' | 'weapon' | 'hands';

/** A character built on the base figure. Layers paint in this order: back, body, outfit, hair, head, off, weapon, hands. */
export interface FigureSpec {
  id: string;
  /** The clip its attack plays. */
  attack: ClipId;
  /** Arm positions it holds when a clip frame doesn't say (an archer keeps the bow out). */
  stance?: ClipFrame;
  /** Main color ramp. */
  a?: Ramp;
  legs?: Ramp;
  glove?: Ramp;
  noHands?: boolean;
  hideHair?: boolean;
  shadeLayers?: boolean;
  /** Effect color for slashes and sparks. */
  glow?: string;
  layers: Partial<Record<Layer, (c: Ctx) => void>>;
}

const torsoRange = (P: Pose, y: number): [number, number] => (P.fem ? (y < 40 ? [24, 39] : [22, 41]) : [22, 41]);

// ---------- drawing ----------

function body32(P: Pose, look: Look, legsRamp: Ramp | undefined, withHead: boolean): Grid {
  const g = grid(32),
    u = painter(g, P.bob / 2),
    l = painter(g, 0),
    Sk = SKIN[look.skin],
    L = legsRamp || R.navy,
    Bt = R.leather,
    { legs, boots } = BODY;
  // Mid-step, the lifted leg's knee bends: it shows shorter and its boot rides 2 px up.
  const up = (i: number) => (P.step === (i === 0 ? -1 : 1) ? 2 : 0);
  legs.x.forEach((x, i) => {
    l.r(x, legs.y, legs.w, legs.h - up(i), L[1]);
    l.r(x + legs.w - 1, legs.y, 1, legs.h - up(i), L[0]);
  });
  l.r(legs.x[0], legs.y, 1, legs.h - up(0), L[2]);
  boots.x.forEach((x, i) => {
    l.r(x, boots.y - up(i), boots.w, boots.h, Bt[1]);
    l.row(boots.y - up(i), x, x + boots.w - 1, Bt[2]);
  });
  BODY.torso[look.sex].forEach(([x, y, w, h]) => u.r(x, y, w, h, R.cloth[1]));
  (['L', 'R'] as const).forEach((s) => {
    const [x, y, w, h] = P.arms[s].rect.map((v) => v / 2);
    l.r(x, y, w, h, Sk[1]);
  });
  if (withHead) {
    BODY.head.forEach(([y, x0, x1]) => u.row(y, x0, x1, Sk[1]));
    for (let y = BODY.headShade.y0; y <= BODY.headShade.y1; y++) u.p(BODY.headShade.x, y, Sk[0]);
  }
  return g;
}

function hair32(P: Pose, look: Look): Grid {
  const g = grid(32),
    u = painter(g, P.bob / 2),
    Hc = HAIR[look.hair];
  HAIRSTYLES[look.style].forEach(([y, a, b, t]) => u.row(y, a, b, Hc[t]));
  if (look.style === 'long') {
    for (let y = 9; y <= 19; y++) {
      u.row(y, 7, 9, Hc[1]);
      u.p(7, y, y < 15 ? Hc[2] : Hc[1]);
      u.row(y, 22, 24, Hc[1]);
      u.p(24, y, Hc[0]);
    }
    u.row(20, 8, 9, Hc[0]);
    u.row(20, 22, 23, Hc[0]);
  }
  return g;
}

function ponytail32(P: Pose, look: Look): Grid {
  const g = grid(32),
    u = painter(g, P.bob / 2),
    Hc = HAIR[look.hair],
    sw = P.f % 2;
  u.r(23, 4, 2, 2, '#c03050');
  for (let y = 6; y <= 18; y++) {
    const xo = y > 12 ? sw : 0,
      e = 26 + xo - (y > 16 ? 1 : 0);
    u.row(y, 24 + xo, e, Hc[1]);
    u.p(e, y, Hc[0]);
  }
  u.p(25 + sw, 19, Hc[0]);
  return g;
}

function face(g: Grid, P: Pose, look: Look) {
  const u = painter(g, P.bob),
    Sk = SKIN[look.skin],
    ink: Record<string, string> = { L: EYES.line, d: EYES.iris[0], m: EYES.iris[1], l: EYES.iris[2], W: EYES.shine };
  FACE.eyes.x.forEach((ex, i) => {
    EYE_PATTERN.forEach((rowStr, j) => [...rowStr].forEach((ch, k) => ink[ch] && u.p(ex + k, FACE.eyes.y + j, ink[ch])));
    if (P.fem)
      FACE.lashes.forEach(([dx, dy]) => u.p(i === 0 ? ex + dx : ex + 3 - dx, FACE.eyes.y + dy, EYES.line));
  });
  FACE.brows.forEach(([y, x0, x1]) => u.row(y, x0, x1, Sk[0]));
  if (P.fem) {
    FACE.blush.rows.forEach(([x0, x1]) => u.row(FACE.blush.y, x0, x1, FACE.blush.color));
    u.row(FACE.mouth.f.row[0], FACE.mouth.f.row[1], FACE.mouth.f.row[2], FACE.lips.color);
    u.p(FACE.mouth.f.lip[0], FACE.mouth.f.lip[1], FACE.lips.lower);
  } else {
    u.row(FACE.mouth.m.row[0], FACE.mouth.m.row[1], FACE.mouth.m.row[2], Sk[0]);
    u.p(FACE.mouth.m.corner[0], FACE.mouth.m.corner[1], Sk[0]);
  }
  u.p(FACE.nose[0], FACE.nose[1], Sk[0]);
}

/** The eyes of a look as boxes [x, y, w, h] at rest (no bob), for effects that sit on them. */
export function eyeBoxes(look: Look): [number, number, number, number][] {
  if (isManga(look)) return MANGA_FACE.eyes.x.map((x) => [x, MANGA_FACE.eyes.y, MANGA_FACE.eyes.w, MANGA_FACE.eyes.h]);
  return FACE.eyes.x.map((x) => [x, FACE.eyes.y, EYE_PATTERN[0].length, EYE_PATTERN.length]);
}

/** Draws one 64x64 frame of a character: its spec, wearing a look, in one clip frame. */
export function drawFigure(spec: FigureSpec, look: Look, frame: ClipFrame, f: number): Grid {
  const P = poseFor(frame, spec.stance ?? {}, look, f),
    out = grid(SIZE),
    fxg = grid(SIZE),
    L = spec.layers;
  const ctxFor = (g: Grid): Ctx => ({
    P,
    look,
    A: spec.a || R.cloth,
    skin: SKIN[look.skin],
    hair: HAIR[look.hair],
    torsoRange: (y) => torsoRange(P, y),
    u: painter(g, P.bob),
    l: painter(g, 0),
    w: painter(g, 0),
    fx: painter(fxg, 0),
    fxu: painter(fxg, P.bob),
  });
  const put = (g: Grid, shade = true) => stamp(out, outline(shade ? autoshade(g) : g));
  const layer = (name: Layer) => {
    const fn = L[name];
    if (!fn) return;
    const g = grid(SIZE);
    fn(ctxFor(g));
    put(g, spec.shadeLayers !== false);
  };

  const manga = isManga(look) ? mangaHair(P, look) : null;
  if (look.sex === 'f' && look.style === 'pony' && !spec.hideHair && !manga) put(scale2x(ponytail32(P, look)));
  layer('back');
  if (manga && !spec.hideHair) put(manga.back);
  const body = scale2x(body32(P, look, spec.legs, !manga));
  if (manga) mangaHead(body, P, look, spec.hideHair ? undefined : manga.front);
  else face(body, P, look);
  put(body);
  layer('outfit');
  if (!spec.hideHair) put(manga ? manga.front : scale2x(hair32(P, look)));
  layer('head');
  layer('off');
  layer('weapon');
  if (!spec.noHands) {
    const g = grid(SIZE),
      w = painter(g, 0),
      G = spec.glove || SKIN[look.skin];
    (['L', 'R'] as const).forEach((s) => {
      const [x, y] = P.arms[s].hand;
      w.r(x, y, 4, 4, G[1]);
      w.row(y, x, x + 2, G[2]);
      w.p(x + 3, y + 3, G[0]);
      w.row(y + 3, x + 1, x + 3, G[0]);
    });
    L.hands?.(ctxFor(g));
    put(g);
  }
  stamp(out, fxg);
  return out;
}

