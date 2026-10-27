/* Pixel grids and the drawing tools every sprite uses. Nothing in here knows what a character is. */

export const NIGHT = '#0b0d14';

export type Col = string | null;
export type Grid = Col[][];
/** Dark to light, usually 3 tones: [shadow, base, light]. */
export type Ramp = string[];

/** An empty w x h grid (h defaults to w). Indexed [y][x]. */
export const grid = (w: number, h = w): Grid => Array.from({ length: h }, () => Array<Col>(w).fill(null));

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

/** Drawing commands on a grid. `oy` shifts every y (used for the idle bob). Off-grid pixels are dropped. */
export function painter(gr: Grid, oy = 0): Painter {
  const h = gr.length,
    w = gr[0]?.length ?? 0;
  const inside = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h;
  const p = (x: number, y: number, c: Col) => {
    x = Math.round(x);
    y = Math.round(y) + oy;
    if (c && inside(x, y)) gr[y][x] = c;
  };
  const api: Painter = {
    p,
    erase(x, y) {
      y += oy;
      if (inside(x, y)) gr[y][x] = null;
    },
    get(x, y) {
      y += oy;
      return inside(x, y) ? gr[y][x] : null;
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

// ---------- color ----------

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (a: number[]) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const memo = new Map<string, string>();

/** Blend two #rrggbb colors; t = 0 gives a, t = 1 gives b. */
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
/** A 3-tone ramp around one color. */
export const rampOf = (col: string): Ramp => [mix(col, NIGHT, 0.5), col, mix(col, '#ffffff', 0.4)];

// ---------- whole-grid passes ----------

const copy = (gr: Grid) => gr.map((r) => r.slice());

/** A 1-px dark outline around every shape. */
export function outline(gr: Grid): Grid {
  const h = gr.length,
    w = gr[0].length,
    out = copy(gr);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (gr[y][x]) continue;
      const nb = (y < h - 1 && gr[y + 1][x]) || (y > 0 && gr[y - 1][x]) || (x > 0 && gr[y][x - 1]) || (x < w - 1 && gr[y][x + 1]);
      if (nb) out[y][x] = darker(nb);
    }
  return out;
}

/** Rim light on the top/left edges and a soft shadow on the bottom/right edges of each shape. */
export function autoshade(gr: Grid): Grid {
  const h = gr.length,
    w = gr[0].length,
    out = copy(gr);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = gr[y][x];
      if (!c) continue;
      const up = y > 0 && gr[y - 1][x],
        lf = x > 0 && gr[y][x - 1],
        dn = y < h - 1 && gr[y + 1][x],
        rt = x < w - 1 && gr[y][x + 1];
      if (!up || !lf) out[y][x] = mix(c, '#ffffff', 0.16);
      else if (!dn || !rt) out[y][x] = mix(c, NIGHT, 0.22);
    }
  return out;
}

/** Doubles a square grid while keeping diagonals smooth (the Scale2x / EPX rule). */
export function scale2x(g: Grid): Grid {
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

/** Paints `top` over `base` (non-empty pixels win). Mutates base. */
export function stamp(base: Grid, top: Grid) {
  for (let y = 0; y < base.length; y++) for (let x = 0; x < base[y].length; x++) if (top[y][x]) base[y][x] = top[y][x];
}

/** A glow around the whole silhouette, for top-tier gear. `f` makes the outer ring shimmer. */
export function aura(gr: Grid, ramp: Ramp, glow: string, level: number, f: number): Grid {
  if (level < 5) return gr;
  const h = gr.length,
    w = gr[0].length,
    out = copy(gr);
  let fill = gr.map((r) => r.map((v) => !!v));
  const ring = (src: boolean[][]) => {
    const r = src.map((row) => row.map(() => false));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (src[y][x]) continue;
        if ((y > 0 && src[y - 1][x]) || (y < h - 1 && src[y + 1][x]) || (x > 0 && src[y][x - 1]) || (x < w - 1 && src[y][x + 1])) r[y][x] = true;
      }
    return r;
  };
  const rings = level >= 10 ? 4 : level >= 8 ? 3 : 2;
  for (let k = 0; k < rings; k++) {
    const r = ring(fill);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (r[y][x]) {
          if (k >= 2 && (x + y + f) % 2) continue;
          out[y][x] = k === 0 ? (level >= 8 && f % 2 ? glow : ramp[2]) : k === 1 ? ramp[1] : k === 2 ? ramp[2] : ramp[0];
        }
    fill = fill.map((row, y) => row.map((v, x) => v || r[y][x]));
  }
  return out;
}

/** Recolors every pixel onto a ramp by brightness: the golden Echo, the dark Hollow. */
export function tint(gr: Grid, ramp: Ramp): Grid {
  return gr.map((row) =>
    row.map((c) => {
      if (!c) return c;
      const t = Math.min(0.999, luma(c) * 1.15);
      return ramp[Math.floor(t * ramp.length)];
    }),
  );
}

/** CSS color to RGBA bytes, read once per color: "#rrggbb" by hand, anything else through a canvas. */
const RGBA = new Map<string, [number, number, number, number]>();
let probe: CanvasRenderingContext2D | null = null;
function rgba(c: string): [number, number, number, number] {
  let v = RGBA.get(c);
  if (v) return v;
  const hex = /^#([0-9a-f]{6})$/i.exec(c) ?? /^#([0-9a-f]{3})$/i.exec(c);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255];
  } else {
    probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', { willReadFrequently: true });
    if (!probe) return [0, 0, 0, 0];
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = c;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    v = [d[0], d[1], d[2], d[3]];
  }
  RGBA.set(c, v);
  return v;
}

/**
 * Draws frames side by side into a PNG data URL (browser only). Pixels go straight into one
 * ImageData: a fillRect per pixel was most of the time it took to open the app or start a run.
 */
export function toSheet(frames: Grid[]): string {
  const h = frames[0].length,
    w = frames[0][0].length,
    W = w * frames.length,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(W, h),
    px = img.data;
  frames.forEach((g, f) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = g[y][x];
        if (!c) continue;
        const [r, gr, b, a] = rgba(c),
          i = (y * W + f * w + x) * 4;
        px[i] = r;
        px[i + 1] = gr;
        px[i + 2] = b;
        px[i + 3] = a;
      }
  });
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}
