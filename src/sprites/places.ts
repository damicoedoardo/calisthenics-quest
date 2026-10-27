import { grid, mix, painter, toSheet, type Grid, type Painter } from './engine/grid';

/* Story backdrops, painted in code from a short description (the places themselves are listed in
   src/story/places.ts). A backdrop is a tall pixel picture: sky, two layers of land, the ground,
   and a few props. Weather is drawn over it by the Weather component. */

export const PLACE_W = 90;
export const PLACE_H = 160;
/** Where the far land meets the sky. */
const HORIZON = 98;

export type Land = 'dunes' | 'hills' | 'peaks' | 'flat' | 'village' | 'forest';
export type Prop = 'dead-trees' | 'stars' | 'moon' | 'campfire' | 'lake' | 'reeds' | 'chimneys' | 'windows' | 'rocks' | 'road' | 'lamp-tower';
export type PlaceWeather = 'none' | 'ash' | 'rain' | 'embers' | 'fog' | 'snow';

export interface PlaceSpec {
  name: string;
  /** Sky from the top down to the horizon. */
  sky: [string, string, string];
  land: Land;
  far: string;
  near: string;
  ground: string;
  props: Prop[];
  /** A light in the sky (a far fire, a lantern), as fractions of the picture. */
  glow?: { x: number; y: number; color: string; r: number };
  weather: PlaceWeather;
}

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
const threshold = (x: number, y: number) => (BAYER[y % 4][x % 4] + 0.5) / 16;

/** A tiny seeded random, so a place always looks the same. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function gradient(stops: string[], t: number) {
  const k = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1),
    i = Math.floor(k);
  return mix(stops[i], stops[i + 1], k - i);
}

function sky(p: Painter, s: PlaceSpec) {
  const bands = 9;
  for (let y = 0; y < HORIZON + 6; y++)
    for (let x = 0; x < PLACE_W; x++) {
      const v = (y / (HORIZON + 6)) * (bands - 1),
        b = Math.floor(v) + (v - Math.floor(v) > threshold(x, y) ? 1 : 0);
      p.p(x, y, gradient(s.sky, b / (bands - 1)));
    }
}

/** Soft dithered light around a point, with a bright core unless it lights something else. */
function glow(p: Painter, cx: number, cy: number, r: number, color: string, core = true) {
  for (let y = Math.floor(cy - r * 2); y <= cy + r * 2; y++)
    for (let x = Math.floor(cx - r * 2); x <= cx + r * 2; x++) {
      const d = Math.hypot(x - cx, y - cy) / (r * 2);
      if (d >= 1 || x < 0 || y < 0 || x >= PLACE_W || y >= PLACE_H) continue;
      const under = p.get(x, y);
      if (!under) continue;
      if (core && d < 0.25) p.p(x, y, mix(color, '#ffffff', 0.35));
      else if (1 - d > threshold(x, y) * 1.4) p.p(x, y, mix(under, color, 0.45 * (1 - d) + 0.1));
    }
}

/** Height of the land above the horizon at x, per kind of land. */
function ridge(land: Land, x: number, rnd: () => number, layer: 'far' | 'near'): number {
  const k = layer === 'far' ? 1 : 0.6;
  switch (land) {
    case 'dunes':
      return k * (7 + 4 * Math.sin(x / 9 + (layer === 'far' ? 0 : 2)) + 2 * Math.sin(x / 4.3));
    case 'hills':
      return k * (10 + 7 * Math.sin(x / 14 + (layer === 'far' ? 1 : 3)) + 2 * Math.sin(x / 5));
    case 'peaks': {
      const w = layer === 'far' ? 26 : 18,
        m = x % w,
        tri = 1 - Math.abs(m - w / 2) / (w / 2);
      return (layer === 'far' ? 46 : 22) * tri + 3 * rnd();
    }
    case 'flat':
      return k * (2 + (rnd() < 0.08 ? 2 : 0));
    case 'village':
      return k * (5 + 3 * Math.sin(x / 11));
    case 'forest': {
      const w = layer === 'far' ? 7 : 11,
        m = x % w,
        tri = 1 - Math.abs(m - w / 2) / (w / 2);
      return (layer === 'far' ? 14 : 26) * tri + (layer === 'far' ? 6 : 8);
    }
  }
}

function land(p: Painter, s: PlaceSpec, rnd: () => number, lake: boolean) {
  const nearBase = HORIZON + 10;
  for (let x = 0; x < PLACE_W; x++) {
    const top = Math.round(HORIZON - ridge(s.land, x, rnd, 'far'));
    for (let y = top; y < PLACE_H; y++) p.p(x, y, s.far);
  }
  if (lake) {
    // Still water from the horizon down, holding the sky upside down, with a few glints.
    for (let y = HORIZON; y < 136; y++) {
      const mirrored = Math.max(0, 2 * HORIZON - y - 20),
        c = mix(gradient(s.sky, mirrored / HORIZON), s.near, 0.45);
      p.row(y, 0, PLACE_W - 1, c);
      if (y % 2 === 0 && rnd() < 0.8) {
        const len = 2 + Math.floor(rnd() * (2 + (y - HORIZON) / 5)),
          x = Math.floor(rnd() * (PLACE_W - len));
        p.row(y, x, x + len, mix(c, '#ffffff', 0.2));
      }
    }
  }
  const BANK = 26;
  for (let x = 0; x < PLACE_W; x++) {
    // With a lake, the near land only frames the sides, sloping down into the water.
    const edge = Math.min(x, PLACE_W - 1 - x);
    if (lake && edge > BANK) continue;
    const slope = lake ? Math.pow(edge / BANK, 1.6) * 36 : 0,
      top = Math.round(nearBase - ridge(s.land, x, rnd, 'near') - (lake ? 6 : 0) + slope);
    for (let y = top; y < PLACE_H; y++) p.p(x, y, s.near);
  }
  const groundTop = lake ? 136 : nearBase + 12;
  for (let y = groundTop; y < PLACE_H; y++)
    for (let x = 0; x < PLACE_W; x++) p.p(x, y, rnd() < 0.06 ? mix(s.ground, '#ffffff', 0.08) : rnd() < 0.06 ? mix(s.ground, '#000000', 0.2) : s.ground);
  // A soft edge where the ground starts.
  for (let x = 0; x < PLACE_W; x++) if ((x + groundTop) % 2 === 0) p.p(x, groundTop - 1, s.ground);
}

function village(p: Painter, s: PlaceSpec, rnd: () => number) {
  const lit = s.props.includes('windows');
  let x = -4;
  while (x < PLACE_W) {
    const w = 10 + Math.floor(rnd() * 8),
      h = 10 + Math.floor(rnd() * 10),
      base = HORIZON + 14,
      top = base - h;
    p.r(x, top, w, h + 2, s.near);
    // the roof
    for (let i = 0; i <= w / 2 + 1; i++) p.row(top - i, x + i - 1, x + w - i, s.near);
    if (s.props.includes('chimneys') && rnd() < 0.7) {
      const cx = x + 2 + Math.floor(rnd() * (w - 5));
      p.r(cx, top - 7, 3, 7, s.near);
      if (lit) {
        p.p(cx + 1, top - 9, '#9ca3af');
        p.p(cx + 2, top - 11, '#6b7280');
      }
    }
    const win = lit ? '#fbbf24' : mix(s.near, '#000000', 0.35);
    if (w > 11) p.r(x + 3, top + 4, 2, 3, win);
    if (w > 14) p.r(x + w - 5, top + 4, 2, 3, win);
    x += w + 2 + Math.floor(rnd() * 4);
  }
}

function deadTree(p: Painter, x: number, base: number, h: number, c: string) {
  p.r(x, base - h, 2, h, c);
  p.line(x, base - h + 4, x - 4, base - h - 1, c);
  p.line(x + 1, base - h + 7, x + 6, base - h + 2, c);
  p.line(x - 3, base - h, x - 4, base - h - 4, c);
  p.line(x + 5, base - h + 3, x + 7, base - h - 1, c);
}

/** A dirt road running straight to the horizon, narrowing as it goes. */
function road(p: Painter, s: PlaceSpec) {
  const top = HORIZON + 10,
    c = mix(s.ground, '#ffffff', 0.1),
    rut = mix(s.ground, '#000000', 0.18);
  for (let y = top; y < PLACE_H; y++) {
    const k = (y - top) / (PLACE_H - top),
      half = 2 + k * 30,
      x0 = Math.round(45 - half),
      x1 = Math.round(45 + half);
    p.row(y, x0, x1, c);
    // two wheel ruts, and a ragged edge
    p.p(Math.round(45 - half * 0.45), y, rut);
    p.p(Math.round(45 + half * 0.45), y, rut);
    if (y % 3 === 0) p.p(x0 - 1, y, c);
    if (y % 4 === 1) p.p(x1 + 1, y, c);
  }
}

/** Vela's tower: a thin stone tower beside the road, with her lamp lit at the top. Off to the
    right, so the person speaking stands clear of it. */
function lampTower(p: Painter, s: PlaceSpec) {
  const cx = 70,
    base = HORIZON + 16,
    top = base - 40,
    stone = mix(s.far, '#d6c8a8', 0.45),
    light = mix(stone, '#ffffff', 0.25),
    dark = mix(stone, '#000000', 0.35);
  glow(p, cx, top - 6, 9, '#fbbf24', false);
  // the shaft, wider at the foot, with a lit edge, a shaded edge and courses of stone
  for (let y = top; y <= base; y++) {
    const half = 2 + Math.round(((y - top) / (base - top)) * 2.4),
      x0 = cx - half,
      x1 = cx + half;
    p.row(y, x0, x1, stone);
    p.p(x0, y, light);
    p.p(x1, y, dark);
    if ((y - top) % 5 === 0) p.row(y, x0 + 1, x1 - 1, dark);
    else if ((y - top) % 5 === 2) p.p(cx + ((y - top) % 10 === 2 ? -1 : 1), y, dark);
  }
  // a door at the foot and a slit window halfway up
  p.r(cx - 1, base - 5, 3, 5, '#1a140e');
  p.p(cx, base - 6, '#1a140e');
  p.r(cx, top + 15, 1, 3, '#3a2a10');
  // the gallery, the lamp room and its cap
  p.row(top - 1, cx - 4, cx + 4, dark);
  p.row(top - 2, cx - 4, cx + 4, light);
  p.r(cx - 2, top - 7, 5, 5, '#fde68a');
  p.r(cx - 1, top - 6, 3, 3, '#fff7d6');
  p.col(cx - 3, top - 7, top - 3, '#2a2420');
  p.col(cx + 3, top - 7, top - 3, '#2a2420');
  p.row(top - 8, cx - 3, cx + 3, '#2a2420');
  p.row(top - 9, cx - 2, cx + 2, '#2a2420');
  p.p(cx, top - 10, '#2a2420');
  p.p(cx, top - 11, '#2a2420');
  // a bench and the box of letters at the foot
  p.row(base + 2, cx - 9, cx - 5, '#5b3a24');
  p.p(cx - 9, base + 3, '#3b2414');
  p.p(cx - 5, base + 3, '#3b2414');
  p.r(cx + 5, base + 1, 3, 2, '#e8dcc0');
}

function props(p: Painter, s: PlaceSpec, rnd: () => number) {
  const has = (q: Prop) => s.props.includes(q);
  if (has('road')) road(p, s);
  if (has('stars'))
    for (let i = 0; i < 46; i++) {
      const x = Math.floor(rnd() * PLACE_W),
        y = Math.floor(rnd() * HORIZON * 0.6),
        c = rnd() < 0.3 ? '#fde68a' : '#e2e8f0';
      p.p(x, y, mix(c, s.sky[0], rnd() * 0.5));
      if (rnd() < 0.12) {
        p.p(x + 1, y, mix(c, s.sky[0], 0.5));
        p.p(x, y + 1, mix(c, s.sky[0], 0.5));
      }
    }
  if (has('moon')) {
    glow(p, 66, 26, 7, '#e0e7ff');
    p.ellipse(66, 26, 5, 5, '#f1f5f9');
    p.p(64, 25, '#cbd5e1');
    p.p(67, 28, '#cbd5e1');
  }
  if (s.glow) glow(p, s.glow.x * PLACE_W, s.glow.y * PLACE_H, s.glow.r, s.glow.color);
  if (has('dead-trees')) {
    deadTree(p, 14, HORIZON + 8, 16, s.near);
    deadTree(p, 71, HORIZON + 6, 12, s.near);
  }
  if (has('rocks'))
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(rnd() * PLACE_W),
        y = 124 + Math.floor(rnd() * 30);
      p.r(x, y, 3 + Math.floor(rnd() * 3), 2, mix(s.ground, '#ffffff', 0.12));
      p.row(y + 2, x, x + 3, mix(s.ground, '#000000', 0.3));
    }
  if (has('reeds'))
    for (const x of [3, 5, 8, 10, 79, 82, 84, 87]) {
      const h = 8 + (x % 5);
      p.col(x, 136 - h, 137, mix(s.near, '#000000', 0.2));
      p.p(x, 136 - h - 1, '#5b4a3a');
    }
  if (has('lamp-tower')) lampTower(p, s);
  if (has('campfire')) {
    // Off to the left, where the text box doesn't cover it and nobody stands in front of it.
    const cx = 22,
      cy = 120;
    glow(p, cx, cy - 4, 12, '#f97316', false);
    p.thick(cx - 7, cy + 2, cx + 6, cy - 1, 2, '#5b3a24');
    p.thick(cx - 6, cy - 1, cx + 7, cy + 2, 2, '#4a2f1d');
    p.poly([[cx - 4, cy], [cx + 4, cy], [cx + 1, cy - 9], [cx - 1, cy - 5]], '#f97316');
    p.poly([[cx - 2, cy], [cx + 2, cy], [cx, cy - 6]], '#fde047');
  }
}

export function drawPlace(s: PlaceSpec): Grid {
  const g = grid(PLACE_W, PLACE_H),
    p = painter(g),
    rnd = seeded(s.name);
  sky(p, s);
  land(p, s, rnd, s.props.includes('lake'));
  if (s.land === 'village') village(p, s, rnd);
  props(p, s, rnd);
  return g;
}

const cache = new Map<string, string>();

/** The backdrop as an image URL, drawn once (browser only). */
export function placeImage(s: PlaceSpec): string {
  const hit = cache.get(s.name);
  if (hit) return hit;
  const url = toSheet([drawPlace(s)]);
  cache.set(s.name, url);
  return url;
}
