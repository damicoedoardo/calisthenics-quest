import { grid, luma, mix, type Grid } from '../engine/grid';

/* The regular monsters change with the zone: not just a new color but something of the place on
   them. The body is recolored onto the zone's ramp (eyes, sparks and other hot colors keep theirs,
   so a monster still reads), then dressed:
   - 1 Mirror Lake: wet glass with shine streaks, water dripping off it, a bubble rising.
   - 2 Village of Almosts (the Cold Forges): soot and iron, a riveted scrap cap, forge cracks glowing.
   - 3 Plateau: sandstone, cracks, sand trickling from it.
   - 4 The Fog: pale green ghost, its lower half thinning into mist.
   - 5 Forma (the Summit): ice, crystals on its head, frost, snow drifting past.
   - 6 the Whetstone Pass (the Ember Road): whetstone slate, its top edge honed to a bright steel
     line, grit speckled on it, sparks flying off where it was sharpened.
   Zone 0 (the Ashlands) is the monster as drawn. */

export const ZONE_RAMPS: Record<number, string[]> = {
  1: ['#10304d', '#2b78ad', '#5cc0e8', '#b4ecff', '#f2fdff'],
  2: ['#1e1b1c', '#46403c', '#7a7068', '#ada296', '#e2d9cc'],
  3: ['#2a1c0e', '#5e4024', '#9a6d3c', '#d1a868', '#f5e2b8'],
  4: ['#1d4038', '#3f7e6c', '#79bea6', '#bdeedb', '#f0fff8'],
  5: ['#1e2f4a', '#4a6c94', '#8fb3d9', '#d6e9f7', '#ffffff'],
  6: ['#1f2533', '#3b4558', '#64708a', '#9aa6bf', '#dfe6f2'],
};
export const ZONE_PLACE = ['Ashlands', 'Mirror Lake', 'Cold Forges', 'Plateau', 'Fog', 'Summit', 'Whetstone Pass'];

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
/** A warm, saturated color: eyes, sparks, fuses, embers. Those stay as drawn. */
function hot(c: string) {
  const [r, g, b] = rgb(c),
    mx = Math.max(r, g, b),
    mn = Math.min(r, g, b);
  if (mx - mn < 0.35 || mx < 0.5) return false;
  // red to yellow
  return r === mx && b < 0.6;
}

/** A small deterministic hash, so the dressing sits in the same places every frame. */
const hash = (a: number, b: number) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000;

export function dress(src: Grid, zone: number, f: number): Grid {
  const ramp = ZONE_RAMPS[zone];
  if (!ramp) return src;
  const n = src.length,
    w = src[0].length,
    on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < n && !!src[y][x];
  // recolor by brightness onto the zone's ramp. Hot accents (eyes, sparks, a fuse) keep their
  // color, but a hot color that covers a lot of the body (the ram's ember fleece) is body, not accent.
  const count = new Map<string, number>();
  for (const row of src) for (const c of row) if (c) count.set(c, (count.get(c) ?? 0) + 1);
  const accent = (c: string) => hot(c) && (count.get(c) ?? 0) <= 40;
  const g: Grid = src.map((row) =>
    row.map((c) => {
      if (!c || accent(c)) return c;
      const t = Math.min(0.999, luma(c) * 1.2);
      return ramp[Math.floor(t * ramp.length)];
    }),
  );
  const put = (x: number, y: number, c: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < w && y < n) g[y][x] = c;
  };
  // the silhouette's top edge (first pixel down each column) and bottom edge
  const tops: [number, number][] = [],
    bottoms: [number, number][] = [];
  let y0 = n,
    y1 = 0;
  for (let x = 0; x < w; x++) {
    let t = -1,
      b = -1;
    for (let y = 0; y < n; y++)
      if (src[y][x]) {
        if (t < 0) t = y;
        b = y;
      }
    if (t >= 0) {
      tops.push([x, t]);
      bottoms.push([x, b]);
      y0 = Math.min(y0, t);
      y1 = Math.max(y1, b);
    }
  }
  const inside = (x: number, y: number, r: number) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (!on(x + i, y + j)) return false;
    return true;
  };
  /** A few spots well inside the body, the same each frame. */
  const spots = (count: number, r: number) => {
    const out: [number, number][] = [];
    for (let k = 0; k < 400 && out.length < count; k++) {
      const x = hash(k, 7) % w,
        y = hash(k, 13) % n;
      if (inside(x, y, r) && out.every(([a, b]) => Math.abs(a - x) + Math.abs(b - y) > 12)) out.push([x, y]);
    }
    return out;
  };

  if (zone === 1) {
    // glass: two shine streaks across the upper body, a bright wet rim along the top, drips falling
    // off the bottom, a bubble rising
    const xs = tops.map(([x]) => x),
      x0 = xs.length ? Math.min(...xs) : 0,
      mid = y0 + (y1 - y0) * 0.6,
      // only over body mid-tones: eye whites and pupils stay clear
      mids = (x: number, y: number) => {
        const c = src[y][x]!;
        return !accent(c) && luma(c) > 0.18 && luma(c) < 0.72;
      };
    for (let y = y0; y < mid; y++)
      for (let x = 0; x < w; x++) {
        const d = x - x0 - (y - y0) - 6;
        if ((d === 0 || d === 1 || d === 5) && inside(x, y, 1) && mids(x, y)) g[y][x] = d === 5 ? ramp[3] : ramp[4];
      }
    tops.forEach(([x, y], i) => i % 3 === 0 && put(x, y + 1, ramp[4]));
    bottoms.forEach(([x, y], i) => {
      if (i % 7 !== 3) return;
      const len = 1 + ((f + i) % 4);
      for (let k = 1; k <= len; k++) put(x, y + k, k === len ? ramp[4] : ramp[3]);
    });
    const bx = tops.length ? tops[Math.floor(tops.length * 0.7)][0] : 32,
      by = y0 - 2 - (f % 8) * 2;
    if (f % 8 < 6) {
      put(bx, by, ramp[3]);
      put(bx + 1, by, ramp[4]);
      put(bx, by + 1, ramp[4]);
      put(bx + 1, by + 1, ramp[3]);
    }
  } else if (zone === 2) {
    // a scrap-iron cap hammered over its head, riveted, and forge cracks glowing through the body
    tops.forEach(([x, y], i) => {
      const band = ['#c9ced6', '#7b8492', '#5f6773', '#3a3f48'];
      band.forEach((c, k) => {
        const cur = g[y + k]?.[x];
        if (cur && !accent(cur)) put(x, y + k, c);
      });
      if (i % 5 === 2 && g[y + 1]?.[x] && !accent(g[y + 1][x]!)) put(x, y + 1, '#f1f5f9');
    });
    const glow = f % 4 < 2 ? '#fde047' : '#fdba74';
    spots(3, 2).forEach(([x, y], i) => {
      const path = i % 2 ? [[0, 0], [1, 1], [1, 2], [2, 3], [1, 4], [2, 5], [2, 6]] : [[0, 0], [-1, 1], [0, 2], [-1, 3], [-2, 4], [-2, 5], [-3, 6]];
      path.forEach(([dx, dy], k) => {
        put(x + dx, y + dy, k === 2 || k === 4 ? glow : '#f97316');
        put(x + dx + 1, y + dy, '#7c2d12');
      });
    });
    // a spark spitting off the cap now and then
    if (tops.length && f % 6 < 2) {
      const [x, y] = tops[Math.floor(tops.length * 0.3)];
      put(x - 1, y - 2 - (f % 6), '#fde047');
    }
  } else if (zone === 3) {
    // cracks across the stone, sand trickling from underneath, grit on top
    spots(2, 2).forEach(([x, y]) => {
      put(x - 2, y - 2, ramp[0]);
      put(x - 1, y - 1, ramp[0]);
      put(x, y, ramp[0]);
      put(x + 1, y, ramp[0]);
      put(x + 2, y + 1, ramp[0]);
      put(x, y + 1, ramp[0]);
    });
    tops.forEach(([x, y], i) => i % 5 === 2 && put(x, y, ramp[4]));
    bottoms.forEach(([x, y], i) => {
      if (i % 9 !== 4) return;
      for (let k = 0; k < 3; k++) put(x + (k % 2), y + 2 + ((f * 2 + k * 3) % 8), ramp[3]);
    });
  } else if (zone === 4) {
    // the lower body thins into mist: thinner the lower it is, drifting with f
    const span = Math.max(1, y1 - y0);
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / span;
      if (t < 0.65) continue;
      for (let x = 0; x < w; x++) {
        if (!g[y][x] || accent(g[y][x]!)) continue;
        const keep = t < 0.8 ? (x + y + f) % 4 !== 0 : t < 0.92 ? (x + y + f) % 2 === 0 : (x + 2 * y + f) % 3 === 0;
        if (!keep) g[y][x] = null;
      }
    }
    // a wisp of mist trailing off to the side
    for (let k = 0; k < 6; k++) put(w / 2 + 10 + k * 3, y1 - 4 - k - ((f + k) % 3), k % 2 ? ramp[3] : ramp[2]);
  } else if (zone === 5) {
    // ice crystals growing on its head, frost on the body, snow drifting past
    tops.forEach(([x, y], i) => {
      if (i % 6 !== 2) return;
      const h = 2 + (hash(x, 3) % 3);
      for (let k = 1; k <= h; k++) put(x, y - k, k === h ? '#ffffff' : ramp[3]);
      put(x - 1, y - 1, ramp[3]);
      put(x + 1, y - 1, ramp[3]);
    });
    spots(4, 1).forEach(([x, y]) => put(x, y, '#ffffff'));
    [
      [6, 10, 0],
      [56, 18, 3],
      [12, 40, 5],
      [52, 46, 6],
    ].forEach(([x, y, ph]) => {
      const k = (f + ph) % 8,
        sx = x + (k % 3) - 1,
        sy = y + k * 2;
      if (on(sx, sy)) return;
      put(sx, sy, '#ffffff');
      if (k % 2) put(sx + 1, sy, ramp[3]);
    });
  } else if (zone === 6) {
    // the honed edge: a bright steel line along the top, grit specks, sparks spitting off one side
    tops.forEach(([x, y]) => {
      const cur = g[y]?.[x];
      if (cur && !accent(cur)) put(x, y, ramp[4]);
    });
    spots(4, 1).forEach(([x, y], i) => put(x, y, i % 2 ? '#9c8f7a' : ramp[4]));
    if (tops.length) {
      const [x, y] = tops[Math.floor(tops.length * 0.8)],
        k = f % 6;
      if (k < 4) {
        put(x + 1 + k, y - 1 - k, k % 2 ? '#fbbf24' : '#fef3c7');
        put(x + 2 + k, y + 1 - k, '#f97316');
      }
    }
  }
  return g;
}

/** A grid outlined again after dressing, so added bits sit inside a dark edge too. */
export function edged(g: Grid, zone: number): Grid {
  if (!ZONE_RAMPS[zone]) return g;
  const n = g.length,
    out = grid(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out[y][x] = g[y][x];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (g[y][x]) continue;
      const nb = g[y - 1]?.[x] || g[y + 1]?.[x] || g[y][x - 1] || g[y][x + 1];
      if (nb && luma(nb) > 0.5) out[y][x] = mix(nb, '#0b0d14', 0.7);
    }
  return out;
}
