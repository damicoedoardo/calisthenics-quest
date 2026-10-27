import type { ClipFrame } from '../clips';
import { drawFigure, type Ctx, type FigureSpec, type Look } from '../engine/figure';
import type { Grid, Painter, Ramp } from '../engine/grid';
import { HAIR, LANTERN, R } from '../palette';

/* Old Vela keeps a lamp on the flat road of the Plateau and writes letters home she never sends.
   Same body and manga head as the hero, but older: silver hair up in a bun, softer half-lidded
   eyes with smile lines, a long dress, a knitted shawl pinned at the chest, a cane in one hand and
   her lamp in the other. Her "attack" is the lamp raised high (the raise clip): it flares twice. */

const VELA_LOOK: Look = { sex: 'f', style: 'long', hair: 'silver', skin: 'light', head: 'manga' };

const DRESS: Ramp = ['#262b45', '#3d4468', '#5d6590'];
const SHAWL: Ramp = ['#6e3018', '#a8522a', '#d9844a'];
const STRIPE = '#efd9b0';
const FRINGE = '#8a4020';
const PIN = R.gold;
const BRASS = R.bronze;
const H = HAIR.silver;

/** The silver hair, drawn here instead of the base hair: a center part swept back into a bun. */
function hair(c: Ctx) {
  const { u } = c;
  // the bun, with a wooden pin through it
  u.ellipse(32, 4, 6.5, 4.5, H[1]);
  u.line(26, 1, 29, 3, H[2]);
  u.line(35, 3, 37, 6, H[0]);
  u.line(23, 7, 41, 1, R.wood[1]);
  // the cap, cut off above the forehead
  for (let y = 4; y <= 11; y++)
    for (let x = 16; x <= 48; x++) {
      const dx = (x - 32) / 16,
        dy = (y - 13) / 9.5;
      if (dx * dx + dy * dy <= 1) u.p(x, y, H[1]);
    }
  // swept from a center part down over the temples and ears
  u.poly([[32, 9], [17, 9], [16, 20], [19, 22], [20, 14], [26, 11]], H[1]);
  u.poly([[32, 9], [47, 9], [48, 20], [45, 22], [44, 14], [38, 11]], H[1]);
  u.col(32, 5, 10, H[0]);
  u.line(31, 10, 22, 12, H[0]);
  u.line(33, 10, 42, 12, H[0]);
  // combed lines catching the light
  u.line(21, 7, 29, 6, H[2]);
  u.line(35, 6, 43, 8, H[2]);
  u.line(18, 13, 18, 18, H[2]);
}

/** Gentler eyes than the base face: the lids come down into a smile, with lines at the corners. */
function face(c: Ctx) {
  // On the effects layer, so these fine lines don't get an outline of their own.
  const { fxu: u, skin } = c,
    S = skin[1],
    s = skin[0],
    LINE = '#3a2a24';
  [21, 36].forEach((x0, i) => {
    // hide the top of the big manga eye, then draw a lid that curves down at both ends
    u.r(x0 - 1, 14, 9, 4, S);
    u.row(18, x0 + 1, x0 + 5, LINE);
    u.p(x0, 19, LINE);
    u.p(x0 + 6, 19, LINE);
    // smile lines at the outer corner, and a soft fold under each eye
    const out = i === 0 ? x0 - 2 : x0 + 8;
    u.p(out, 19, s);
    u.p(out + (i === 0 ? -1 : 1), 20, s);
    u.row(24, x0 + 2, x0 + 4, s);
  });
  // grey brows, a little higher and softer
  u.row(13, 22, 26, H[0]);
  u.row(13, 37, 41, H[0]);
  // the mouth turns up at the corners, with laugh lines beside it
  u.p(29, 25, '#9a4a3a');
  u.p(34, 25, '#9a4a3a');
}

function shawl(u: Painter) {
  // two ends over the shoulders, crossed and pinned at the chest
  const left: [number, number][] = [[21, 28], [29, 29], [34, 39], [31, 47], [26, 47], [18, 38], [18, 31]];
  const right: [number, number][] = [[42, 28], [34, 29], [29, 39], [32, 47], [37, 47], [45, 38], [45, 31]];
  u.poly(right, SHAWL[1]);
  // the fold where the near end crosses over
  u.line(29, 39, 33, 47, SHAWL[0]);
  u.line(34, 30, 30, 38, SHAWL[0]);
  u.poly(left, SHAWL[1]);
  // a cream stripe knitted near each edge
  u.line(19, 36, 27, 45, STRIPE);
  u.line(44, 36, 36, 45, STRIPE);
  for (let y = 32; y <= 42; y += 3) u.line(37, y + 1, 43, y, SHAWL[2]);
  // the knit: rows of stitches across the near end
  for (let y = 32; y <= 42; y += 3) u.line(20, y, 26, y + 1, SHAWL[2]);
  // fringe along the bottom of each end
  [26, 28, 30, 33, 35, 37].forEach((x) => u.col(x, 48, 49, FRINGE));
  // the pin
  u.r(31, 37, 3, 3, PIN[1]);
  u.p(31, 37, PIN[2]);
}

/** Her lamp: a brass oil lamp with a glass chimney. Hangs from her hand, or held up high. */
function lamp(c: Ctx) {
  const { w, fx, P } = c,
    [hx, hy] = P.arms.L.hand,
    up = P.left === 'up',
    // held by the base over her head, or hanging by its handle at her side
    y = up ? hy - 15 : hy + 3,
    x = hx - 1;
  if (!up) {
    w.line(x + 1, y + 1, x + 3, y - 1, R.iron[1]);
    w.line(x + 6, y + 1, x + 4, y - 1, R.iron[1]);
  }
  w.row(y + 2, x + 1, x + 6, BRASS[1]);
  w.row(y + 3, x, x + 7, BRASS[0]);
  w.r(x, y + 4, 8, 7, LANTERN.bright);
  w.col(x, y + 4, y + 10, BRASS[1]);
  w.col(x + 7, y + 4, y + 10, BRASS[0]);
  w.r(x + 3, y + 5, 2, 5, LANTERN.light);
  w.r(x + 3, y + 7, 2, 2, LANTERN.hot);
  w.row(y + 11, x, x + 7, BRASS[1]);
  w.row(y + 12, x + 1, x + 6, BRASS[0]);
  // the light: a soft ring that twinkles, wider when she raises it
  const cx = x + 3.5,
    cy = y + 7,
    r = P.fx === 'burst' ? 15 : P.fx === 'charge' ? 12 : 7.5,
    step = P.fx ? 20 : 45;
  for (let a = 0; a < 360; a += step) {
    const t = (a * Math.PI) / 180;
    if ((a / step + P.f) % 2) fx.p(cx + r * Math.cos(t), cy + r * Math.sin(t), P.fx === 'burst' ? LANTERN.bright : LANTERN.ember);
  }
  if (P.fx === 'burst')
    for (let a = 15; a < 360; a += 30) {
      const t = (a * Math.PI) / 180;
      fx.p(cx + 7 * Math.cos(t), cy + 7 * Math.sin(t), LANTERN.light);
    }
  fx.p(cx, cy - 1, '#ffffff');
}

/** A short cane with a crook, through her right hand down to the road. */
function cane(c: Ctx) {
  const { w, P } = c,
    [hx, hy] = P.arms.R.hand,
    Wd = R.wood,
    x = hx + 1;
  w.r(x, hy - 1, 2, 63 - hy, Wd[1]);
  w.col(x, hy - 1, 61, Wd[2]);
  w.line(x, hy - 2, x + 2, hy - 4, Wd[1]);
  w.line(x + 1, hy - 2, x + 3, hy - 4, Wd[1]);
  w.row(hy - 4, x + 3, x + 5, Wd[2]);
  w.r(x + 5, hy - 3, 2, 3, Wd[1]);
  w.p(x + 6, hy - 1, Wd[0]);
}

const VELA: FigureSpec = {
  id: 'vela',
  attack: 'raise',
  a: DRESS,
  legs: DRESS,
  hideHair: true,
  glow: LANTERN.light,
  layers: {
    outfit(c) {
      const { u, l, w, P } = c;
      for (let y = 30; y <= 45; y++) {
        const [x0, x1] = c.torsoRange(y);
        u.row(y, x0, x1, DRESS[1]);
        u.p(x0, y, DRESS[2]);
        u.p(x1, y, DRESS[0]);
      }
      u.r(30, 30, 4, 2, c.skin[1]);
      // a long skirt down to the ankles, a little fuller at the hem
      for (let y = 44; y <= 58; y++) {
        const k = (y - 44) / 14,
          x0 = Math.round(22 - 3 * k),
          x1 = Math.round(41 + 3 * k);
        l.row(y, x0, x1, DRESS[1]);
        l.p(x0, y, DRESS[2]);
        l.p(x1, y, DRESS[0]);
      }
      [27, 32, 37].forEach((x) => l.line(x, 48, x + (x - 32) * 0.25, 58, DRESS[0]));
      l.row(58, 20, 43, DRESS[0]);
      // long sleeves, down to the wrist
      (['L', 'R'] as const).forEach((s) => {
        const [x, y, ww, hh] = P.arms[s].rect;
        w.r(x, y, ww, hh, DRESS[1]);
        w.col(x, y, y + hh - 1, DRESS[2]);
      });
      shawl(u);
    },
    head(c) {
      hair(c);
      face(c);
    },
    off: lamp,
    weapon: cane,
  },
};

export function drawVela(_o: unknown, frame: ClipFrame, f: number): Grid {
  return drawFigure(VELA, VELA_LOOK, frame, f);
}
