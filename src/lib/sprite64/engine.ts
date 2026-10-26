/* 64x64 chibi sprite engine, 4-frame sheets. Ported from the pixel art thread's hero64 engine.
   The base body and hair are designed at 32 and upscaled with Scale2x; faces and every layer a
   character adds are drawn natively at 64. */

export const S = 64;
const NIGHT = '#0b0d14';

export type Col = string | null;
export type Grid = Col[][];
export type Ramp = string[];

export const R: Record<string, Ramp> = {
  water: ['#143a66', '#2a6fc0', '#69b0f0'], shadow: ['#1d1430', '#3d2a63', '#7a5cb0'], fire: ['#6e1a10', '#c23b1a', '#f08a3a'], light: ['#8a6512', '#d9ad3a', '#f7e08a'],
  bronze: ['#6b4318', '#b07a2e', '#e0b060'], silver: ['#4a5260', '#9aa4b4', '#e2e8f0'], iron: ['#33383f', '#5f6773', '#9aa3af'], leather: ['#3e2614', '#6e4424', '#a06a3a'],
  white: ['#8e98ac', '#d6dde8', '#ffffff'], bone: ['#8a8270', '#d8d0b8', '#f4f0e0'], fur: ['#3a2c22', '#6e5644', '#a68c72'], furgrey: ['#3a3d48', '#6c7180', '#a9aebb'],
  dark: ['#121018', '#252233', '#3c3850'], red: ['#5e1010', '#b02828', '#e86048'], wood: ['#4a2c14', '#7a4a24', '#a8703c'], gold: ['#7a5410', '#c9921c', '#f3d36b'],
  cloth: ['#4a5266', '#7e889c', '#b8c0ce'], orange: ['#7a3a0c', '#d07018', '#f6b04a'], teal: ['#0f3b3d', '#1f6f6a', '#4fb0a0'], navy: ['#141a2e', '#232c4a', '#3a4670'],
  plum: ['#2a1238', '#4e2268', '#8a4ab0'],
};
export const HAIR: Record<string, Ramp> = {
  brown: ['#3b2516', '#6b4226', '#9a6a3c'], black: ['#14141c', '#2c2c3a', '#4a4a5e'], blonde: ['#8a6a1e', '#d9b54a', '#f6e08a'],
  red: ['#6e1a12', '#b23a22', '#e2703e'], silver: ['#6a7080', '#b4bccb', '#eef2f8'], blue: ['#1a2a6a', '#3656c0', '#7aa0f0'],
};
export const SKIN: Record<string, Ramp> = { light: ['#c98b62', '#f2c19a', '#ffdcbc'], tan: ['#9a6038', '#d49464', '#eab288'], deep: ['#4e2c1a', '#7e4a2c', '#a46a44'] };
const EYE = '#1a1420';

export interface Look {
  sex: 'm' | 'f';
  style: 'spiky' | 'swept' | 'long' | 'pony';
  hair: string;
  skin: string;
}

export type AnimKind = 'swing' | 'shoot' | 'cast' | 'punch';

export interface Painter {
  p(x: number, y: number, c: Col): void;
  erase(x: number, y: number): void;
  get(x: number, y: number): Col;
  r(x: number, y: number, w: number, h: number, c: Col): void;
  row(y: number, x0: number, x1: number, c: Col): void;
  col(x: number, y0: number, y1: number, c: Col): void;
  line(x0: number, y0: number, x1: number, y1: number, c: Col): void;
  thick(x0: number, y0: number, x1: number, y1: number, t: number, c: Col): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Col): void;
  poly(pts: [number, number][], c: Col): void;
  shade(x: number, y: number, w: number, h: number, ramp: Ramp): void;
  dither(x: number, y: number, w: number, h: number, c: Col, phase?: number): void;
}

type ArmRight = 'down' | 'up' | 'fwd' | 'pull';
type ArmLeft = 'down' | 'out' | 'upL';
type Fx = 'slash' | 'release' | 'impact' | 'charge' | 'burst' | null;
interface Arm {
  rect: [number, number, number, number];
  hand: [number, number];
}

export interface Pose {
  f: number;
  act: boolean;
  fem: boolean;
  ra: ArmRight;
  la: ArmLeft;
  fx: Fx;
  B32: number;
  /** Idle bob in 64-space (0 or 2). */
  B: number;
  apexX: number | null;
  arms: { R: Arm; L: Arm };
}

export interface Ctx {
  P: Pose;
  look: Look;
  A: Ramp;
  skin: Ramp;
  hair: Ramp;
  /** Upper body painter, with the idle bob. */
  u: Painter;
  /** Legs and ground, no bob. */
  l: Painter;
  /** Absolute, for arm and hand coordinates (they already include the bob). */
  w: Painter;
  /** Effects: no outline, no shading. */
  fx: Painter;
  fxu: Painter;
  torsoRange: (y: number) => [number, number];
  mix: typeof mix;
  darker: typeof darker;
}

type LayerFn = (c: Ctx) => void;

export interface Spec {
  id: string;
  anim: AnimKind;
  /** Main color ramp. */
  a?: Ramp;
  legs?: Ramp;
  glove?: Ramp;
  noHands?: boolean;
  hideHair?: boolean;
  shadeLayers?: boolean;
  /** Effect color for slashes and sparks. */
  glow?: string;
  layers: Partial<Record<'back' | 'outfit' | 'head' | 'off' | 'weapon' | 'hands', LayerFn>>;
}

// ---------- grids and painters ----------
export const grid = (n: number): Grid => Array.from({ length: n }, () => Array<Col>(n).fill(null));

export function painter(gr: Grid, oy = 0): Painter {
  const n = gr.length;
  const p = (x: number, y: number, c: Col) => {
    x = Math.round(x);
    y = Math.round(y) + oy;
    if (c && x >= 0 && x < n && y >= 0 && y < n) gr[y][x] = c;
  };
  const api: Painter = {
    p,
    erase(x, y) {
      y += oy;
      if (x >= 0 && x < n && y >= 0 && y < n) gr[y][x] = null;
    },
    get(x, y) {
      y += oy;
      return x >= 0 && x < n && y >= 0 && y < n ? gr[y][x] : null;
    },
    r(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(x + i, y + j, c);
    },
    row(y, x0, x1, c) {
      for (let x = x0; x <= x1; x++) p(x, y, c);
    },
    col(x, y0, y1, c) {
      for (let y = y0; y <= y1; y++) p(x, y, c);
    },
    line(x0, y0, x1, y1, c) {
      x0 = Math.round(x0);
      y0 = Math.round(y0);
      x1 = Math.round(x1);
      y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0),
        dy = -Math.abs(y1 - y0),
        sx = x0 < x1 ? 1 : -1,
        sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      for (let k = 0; k < 400; k++) {
        p(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) {
          e += dy;
          x0 += sx;
        }
        if (e2 <= dx) {
          e += dx;
          y0 += sy;
        }
      }
    },
    thick(x0, y0, x1, y1, t, c) {
      for (let i = 0; i < t; i++) for (let j = 0; j < t; j++) api.line(x0 + i, y0 + j, x1 + i, y1 + j, c);
    },
    ellipse(cx, cy, rx, ry, c) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
          const dx = (x - cx) / rx,
            dy = (y - cy) / ry;
          if (dx * dx + dy * dy <= 1) p(x, y, c);
        }
    },
    poly(pts, c) {
      let y0 = Infinity,
        y1 = -Infinity;
      pts.forEach((q) => {
        y0 = Math.min(y0, q[1]);
        y1 = Math.max(y1, q[1]);
      });
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const xs: number[] = [];
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i],
            b = pts[(i + 1) % pts.length];
          if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + ((y + 0.5 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
        xs.sort((m, k) => m - k);
        for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x <= Math.floor(xs[i + 1] - 0.5); x++) p(x, y, c);
      }
    },
    // A rect with a 3-tone ramp: light top row and left column, dark right column and bottom row.
    shade(x, y, w, h, ramp) {
      api.r(x, y, w, h, ramp[1]);
      api.row(y, x, x + w - 1, ramp[2]);
      api.col(x, y, y + h - 1, ramp[2]);
      api.col(x + w - 1, y + 1, y + h - 1, ramp[0]);
      api.row(y + h - 1, x + 1, x + w - 1, ramp[0]);
    },
    dither(x, y, w, h, c, phase = 0) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((i + j + phase) % 2 === 0) p(x + i, y + j, c);
    },
  };
  return api;
}

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (a: number[]) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const memo = new Map<string, string>();
export function mix(a: string, b: string, t: number): string {
  const k = a + b + t;
  const hit = memo.get(k);
  if (hit) return hit;
  const A = rgb(a),
    B = rgb(b);
  const out = hex(A.map((v, i) => v + (B[i] - v) * t));
  memo.set(k, out);
  return out;
}
export const darker = (c: string) => mix(c, NIGHT, 0.58);
/** Perceived brightness of a color, 0..1. */
export const luma = (c: string) => {
  const [r, g, b] = rgb(c);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

export function outline(gr: Grid): Grid {
  const n = gr.length,
    out = gr.map((r) => r.slice());
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (gr[y][x]) continue;
      const nb = (y < n - 1 && gr[y + 1][x]) || (y > 0 && gr[y - 1][x]) || (x > 0 && gr[y][x - 1]) || (x < n - 1 && gr[y][x + 1]);
      if (nb) out[y][x] = darker(nb);
    }
  return out;
}

// Rim light on the top/left edges and a soft shadow on the bottom/right edges of each layer's shapes.
export function autoshade(gr: Grid): Grid {
  const n = gr.length,
    out = gr.map((r) => r.slice());
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const c = gr[y][x];
      if (!c) continue;
      const up = y > 0 && gr[y - 1][x],
        lf = x > 0 && gr[y][x - 1],
        dn = y < n - 1 && gr[y + 1][x],
        rt = x < n - 1 && gr[y][x + 1];
      if (!up || !lf) out[y][x] = mix(c, '#ffffff', 0.16);
      else if (!dn || !rt) out[y][x] = mix(c, NIGHT, 0.22);
    }
  return out;
}

function scale2x(g: Grid): Grid {
  const n = g.length,
    o = grid(n * 2),
    at = (x: number, y: number) => (x < 0 || y < 0 || x >= n || y >= n ? null : g[y][x]);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const P = g[y][x],
        A = at(x, y - 1),
        B = at(x + 1, y),
        C = at(x - 1, y),
        D = at(x, y + 1);
      let e0 = P,
        e1 = P,
        e2 = P,
        e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      o[2 * y][2 * x] = e0;
      o[2 * y][2 * x + 1] = e1;
      o[2 * y + 1][2 * x] = e2;
      o[2 * y + 1][2 * x + 1] = e3;
    }
  return o;
}

// ---------- pose (computed in 32-space, exposed in 64-space) ----------
export function pose(spec: Spec, look: Look, mode: 'idle' | 'action', f: number): Pose {
  const fem = look.sex === 'f',
    sx = fem ? 1 : 0,
    kind = spec.anim,
    act = mode === 'action';
  let B = act ? 0 : [0, 0, 1, 1][f],
    ra: ArmRight = 'down',
    la: ArmLeft = 'down',
    apex: number | null = null,
    fx: Fx = null;
  if (kind === 'shoot') la = 'out';
  if (act) {
    if (kind === 'swing') {
      ra = (['down', 'up', 'fwd', 'down'] as const)[f];
      fx = f === 2 ? 'slash' : null;
    }
    if (kind === 'shoot') {
      apex = [5, 8, 11, null][f];
      ra = apex != null ? 'pull' : 'down';
      fx = f === 3 ? 'release' : null;
    }
    if (kind === 'punch') {
      ra = (['down', 'down', 'fwd', 'down'] as const)[f];
      B = [0, 1, 0, 0][f];
      fx = f === 2 ? 'impact' : null;
    }
    if (kind === 'cast') {
      la = (['down', 'upL', 'upL', 'down'] as const)[f];
      fx = ([null, 'charge', 'burst', 'charge'] as const)[f];
    }
  }
  const RS = { x: 21 - sx, y: 15 + B },
    LS = { x: 9 + sx, y: 15 + B },
    lhx = LS.x - 6;
  let aR: Arm, aL: Arm;
  if (ra === 'up') aR = { rect: [RS.x + 1, RS.y - 6, 2, 7], hand: [RS.x + 1, RS.y - 8] };
  else if (ra === 'fwd') aR = { rect: [RS.x, RS.y + 2, 5, 2], hand: [RS.x + 5, RS.y + 2] };
  else if (ra === 'pull') {
    const ax = lhx + (apex ?? 0);
    aR = { rect: [ax + 2, RS.y + 2, RS.x - ax, 2], hand: [ax, RS.y + 2] };
  } else aR = { rect: [RS.x, RS.y, 2, 6], hand: [RS.x, RS.y + 6] };
  if (la === 'out') aL = { rect: [LS.x - 4, LS.y + 2, 6, 2], hand: [lhx, LS.y + 2] };
  else if (la === 'upL') aL = { rect: [LS.x - 1, LS.y - 6, 2, 7], hand: [LS.x - 1, LS.y - 8] };
  else aL = { rect: [LS.x, LS.y, 2, 6], hand: [LS.x, LS.y + 6] };
  const d = (v: number) => v * 2,
    arm = (q: Arm): Arm => ({ rect: q.rect.map(d) as Arm['rect'], hand: q.hand.map(d) as Arm['hand'] });
  return { f, act, fem, ra, la, fx, B32: B, B: B * 2, apexX: apex != null ? d(lhx + apex) : null, arms: { R: arm(aR), L: arm(aL) } };
}

// Torso x-range at 64 (inclusive) for a body row y (y without bob, 30..45).
const torsoRange = (P: Pose, y: number): [number, number] => (P.fem ? (y < 40 ? [24, 39] : [22, 41]) : [22, 41]);

// ---------- base body (32 design -> Scale2x) ----------
const HAIRSTYLES: Record<Look['style'], [number, number, number, number][]> = {
  spiky: [[1, 11, 11, 2], [1, 15, 15, 2], [1, 19, 19, 1], [2, 10, 12, 2], [2, 14, 16, 2], [2, 18, 20, 1], [3, 9, 22, 1], [3, 9, 13, 2], [4, 8, 23, 1], [4, 9, 12, 2], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [5, 23, 23, 0], [6, 23, 23, 0], [7, 23, 23, 0], [8, 8, 11, 0], [8, 13, 14, 0], [8, 17, 18, 0], [8, 21, 23, 0], [9, 8, 8, 0], [10, 8, 8, 0], [11, 8, 8, 0], [9, 23, 23, 0], [10, 23, 23, 0], [11, 23, 23, 0]],
  swept: [[2, 11, 20, 1], [2, 12, 15, 2], [3, 9, 22, 1], [3, 10, 15, 2], [4, 8, 23, 1], [4, 10, 13, 2], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [8, 8, 16, 1], [8, 14, 16, 0], [8, 21, 23, 0], [9, 8, 10, 0], [9, 23, 23, 0], [10, 8, 8, 0], [10, 23, 23, 0], [5, 23, 23, 0], [6, 23, 23, 0], [7, 23, 23, 0]],
  long: [[2, 11, 20, 1], [2, 12, 16, 2], [3, 9, 22, 1], [3, 10, 14, 2], [4, 8, 23, 1], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [8, 8, 12, 1], [8, 15, 16, 0], [8, 19, 23, 1], [5, 23, 23, 0], [6, 23, 23, 0], [7, 23, 23, 0]],
  pony: [[2, 11, 20, 1], [2, 12, 16, 2], [3, 9, 22, 1], [3, 10, 14, 2], [4, 8, 23, 1], [5, 8, 23, 1], [6, 8, 23, 1], [7, 8, 23, 1], [8, 8, 12, 1], [8, 15, 16, 0], [8, 19, 23, 1], [9, 8, 9, 1], [10, 8, 9, 1], [11, 8, 9, 0], [9, 22, 23, 1], [10, 22, 23, 1], [11, 22, 23, 0]],
};

interface Pose32 {
  B: number;
  fem: boolean;
  f: number;
  arms: { R: Arm; L: Arm };
}

function body32(P32: Pose32, look: Look, legsRamp?: Ramp): Grid {
  const g = grid(32),
    u = painter(g, P32.B),
    l = painter(g, 0),
    w = painter(g, 0),
    Sk = SKIN[look.skin],
    L = legsRamp || R.navy;
  l.r(12, 23, 3, 6, L[1]);
  l.r(17, 23, 3, 6, L[1]);
  l.r(12, 23, 1, 6, L[2]);
  l.r(14, 23, 1, 6, L[0]);
  l.r(19, 23, 1, 6, L[0]);
  const Bt = R.leather;
  l.r(11, 29, 4, 2, Bt[1]);
  l.r(17, 29, 4, 2, Bt[1]);
  l.row(29, 11, 14, Bt[2]);
  l.row(29, 17, 20, Bt[2]);
  if (P32.fem) {
    u.r(12, 15, 8, 5, R.cloth[1]);
    u.r(11, 20, 10, 3, R.cloth[1]);
  } else u.r(11, 15, 10, 8, R.cloth[1]);
  (['L', 'R'] as const).forEach((s) => {
    const q = P32.arms[s].rect;
    w.r(q[0], q[1], q[2], q[3], Sk[1]);
  });
  u.row(3, 11, 20, Sk[1]);
  u.row(4, 10, 21, Sk[1]);
  for (let y = 5; y <= 13; y++) u.row(y, 9, 22, Sk[1]);
  u.row(14, 10, 21, Sk[1]);
  for (let y = 6; y <= 13; y++) u.p(22, y, Sk[0]);
  return g;
}

function hair32(P32: Pose32, look: Look): Grid {
  const g = grid(32),
    u = painter(g, P32.B),
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

function ponytail32(P32: Pose32, look: Look): Grid {
  const g = grid(32),
    u = painter(g, P32.B),
    Hc = HAIR[look.hair],
    sw = P32.f % 2;
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

function pose32(P: Pose): Pose32 {
  const h = (v: number) => v / 2,
    arm = (q: Arm): Arm => ({ rect: q.rect.map(h) as Arm['rect'], hand: q.hand.map(h) as Arm['hand'] });
  return { B: P.B32, fem: P.fem, f: P.f, arms: { R: arm(P.arms.R), L: arm(P.arms.L) } };
}

function face64(g: Grid, P: Pose, look: Look) {
  const u = painter(g, P.B),
    Sk = SKIN[look.skin];
  // Eyes: 4x6 each at x 24..27 and 36..39, y 18..23.
  [24, 36].forEach((ex, i) => {
    const I0 = '#2a1a10',
      I1 = '#6a4428',
      I2 = '#9a6a3c';
    u.row(18, ex, ex + 3, EYE);
    u.row(19, ex, ex + 3, EYE);
    u.p(ex, 20, EYE);
    u.p(ex + 1, 20, I1);
    u.p(ex + 2, 20, '#ffffff');
    u.p(ex + 3, 20, '#ffffff');
    u.p(ex, 21, I0);
    u.p(ex + 1, 21, I1);
    u.p(ex + 2, 21, '#ffffff');
    u.p(ex + 3, 21, I0);
    u.p(ex, 22, I0);
    u.p(ex + 1, 22, I2);
    u.p(ex + 2, 22, I1);
    u.p(ex + 3, 22, I0);
    u.p(ex + 1, 23, I0);
    u.p(ex + 2, 23, I0);
    if (P.fem) {
      u.p(i === 0 ? ex - 1 : ex + 4, 18, EYE);
      u.p(i === 0 ? ex - 2 : ex + 5, 17, EYE);
    }
  });
  u.row(16, 24, 26, Sk[0]);
  u.row(16, 37, 39, Sk[0]);
  if (P.fem) {
    u.row(25, 21, 23, '#f29a8e');
    u.row(25, 40, 42, '#f29a8e');
    u.row(27, 30, 32, '#c4566a');
    u.p(31, 28, '#a84458');
  } else {
    u.row(27, 29, 33, Sk[0]);
    u.p(34, 26, Sk[0]);
  }
  u.p(31, 24, Sk[0]);
}

// ---------- composition ----------
export function frame(spec: Spec, look: Look, mode: 'idle' | 'action', f: number): Grid {
  const P = pose(spec, look, mode, f),
    P32 = pose32(P),
    out = grid(S),
    fxg = grid(S);
  const L = spec.layers;
  const ctxFor = (g: Grid): Ctx => ({
    P,
    look,
    A: spec.a || R.cloth,
    skin: SKIN[look.skin],
    hair: HAIR[look.hair],
    torsoRange: (y) => torsoRange(P, y),
    u: painter(g, P.B),
    l: painter(g, 0),
    w: painter(g, 0),
    fx: painter(fxg, 0),
    fxu: painter(fxg, P.B),
    mix,
    darker,
  });
  const put = (g: Grid, shade = true) => {
    const o = outline(shade ? autoshade(g) : g);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (o[y][x]) out[y][x] = o[y][x];
  };
  const layer = (name: keyof Spec['layers']) => {
    const fn = L[name];
    if (!fn) return;
    const g = grid(S);
    fn(ctxFor(g));
    put(g, spec.shadeLayers !== false);
  };

  if (look.sex === 'f' && look.style === 'pony' && !spec.hideHair) put(scale2x(ponytail32(P32, look)));
  layer('back');
  const body = scale2x(body32(P32, look, spec.legs));
  face64(body, P, look);
  put(body);
  layer('outfit');
  if (!spec.hideHair) put(scale2x(hair32(P32, look)));
  layer('head');
  layer('off');
  layer('weapon');
  if (!spec.noHands) {
    const g = grid(S),
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
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (fxg[y][x]) out[y][x] = fxg[y][x];
  return out;
}

/** A glow around the whole silhouette, for top-tier gear. */
export function aura(gr: Grid, ramp: Ramp, glow: string, level: number, f: number): Grid {
  if (level < 5) return gr;
  const n = gr.length,
    out = gr.map((r) => r.slice());
  let fill = gr.map((r) => r.map((v) => !!v));
  const ring = (src: boolean[][]) => {
    const r = src.map((row) => row.map(() => false));
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        if (src[y][x]) continue;
        if ((y > 0 && src[y - 1][x]) || (y < n - 1 && src[y + 1][x]) || (x > 0 && src[y][x - 1]) || (x < n - 1 && src[y][x + 1])) r[y][x] = true;
      }
    return r;
  };
  const rings = level >= 10 ? 4 : level >= 8 ? 3 : 2;
  for (let k = 0; k < rings; k++) {
    const r = ring(fill);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (r[y][x]) {
          if (k >= 2 && (x + y + f) % 2) continue;
          out[y][x] = k === 0 ? (level >= 8 && f % 2 ? glow : ramp[2]) : k === 1 ? ramp[1] : k === 2 ? ramp[2] : ramp[0];
        }
    fill = fill.map((row, y) => row.map((v, x) => v || r[y][x]));
  }
  return out;
}

/** Recolor every pixel onto a ramp by brightness: the golden Echo, the dark Hollow. */
export function tint(gr: Grid, ramp: Ramp): Grid {
  return gr.map((row) =>
    row.map((c) => {
      if (!c) return c;
      const t = Math.min(0.999, luma(c) * 1.15);
      return ramp[Math.floor(t * ramp.length)];
    }),
  );
}

/** Draws 4 frames side by side into a PNG data URL (browser only). */
export function toSheet(frames: Grid[]): string {
  const cv = document.createElement('canvas');
  cv.width = S * frames.length;
  cv.height = S;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  frames.forEach((g, f) => {
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const c = g[y][x];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(f * S + x, y, 1, 1);
      }
  });
  return cv.toDataURL();
}
