import type { SpWeapon } from '@/game/dungeon/content';
import type { ClipFrame, ClipId } from '../clips';
import { SIZE as S, type Ctx, type Pose } from '../engine/figure';
import type { Ramp } from '../engine/grid';
import { R } from '../palette';
import { drawBow } from './weapons';
import { BLACKWOOD, BONE, BRASS, FIRE, FOAM, GOLD, IRON, LIGHT_ROBE, PEARL, RIVER_BLUE, SEA, STEEL, VIOLET, WHITE_FUR, WHITE_PLATE, WOOD } from './spColors';

/* The SPs' own weapons, one entry each in SP_WEAPON_ART, keyed by the SP card's `weapon`
   (SP_CARDS in src/game/dungeon/content.ts). An SP draws its weapon in place of the class's.
   A held weapon is painted in its own frame: `s` runs from the grip toward the tip, `t` across it
   (positive on the lit, left side), so one drawing follows every arm pose. */

/** The color of one weapon pixel at (s, t), or nothing. */
export type Paint = (s: number, t: number) => string | null | undefined;
type Pt = [number, number];

/** Where a weapon held in the right hand points: the frame's `aim`, or its arm pose's own. */
export const aim = (P: Pose): Pt => P.aim ?? (P.right === 'up' ? [0.8, -0.6] : P.right === 'fwd' ? [0.2, 1] : P.right === 'pull' ? [1, -0.15] : P.right === 'tuck' ? [0.3, -1] : [0.12, -1]);

/** Where a weapon points with the arm hanging at rest, unless the frame says otherwise. */
export const rest = (P: Pose, dir: Pt): Pt | undefined => (!P.aim && P.right === 'down' ? dir : undefined);

/** The direction a hand's weapon points: `dir` if given, else the frame's aim for that hand. */
const dirOf = (P: Pose, hand: 'R' | 'L', dir?: Pt): Pt => dir ?? (hand === 'L' ? P.aimL : null) ?? aim(P);

/** Paints a held weapon from the hand's grip along `dir` (the right hand's aim by default). The
    right hand slides `P.grip` up the weapon when the frame says (a thrust, a spin). */
export function held(c: Ctx, paint: Paint, hand: 'R' | 'L' = 'R', dir?: Pt) {
  const [hx, hy] = c.P.arms[hand].hand,
    gx = hx + 1.5,
    gy = hy + 1.5,
    g = hand === 'R' ? c.P.grip : 0,
    [dx, dy] = dirOf(c.P, hand, dir),
    al = Math.hypot(dx, dy),
    ax = dx / al,
    ay = dy / al,
    nx = ay,
    ny = -ax;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const ox = x - gx,
        oy = y - gy,
        col = paint(ox * ax + oy * ay + g, ox * nx + oy * ny);
      if (col) c.w.p(x, y, col);
    }
}

/** The point `s` along a held weapon (for sparks and smoke at its tip). */
export function along(c: Ctx, s: number, hand: 'R' | 'L' = 'R', dir?: Pt): Pt {
  const [hx, hy] = c.P.arms[hand].hand,
    [dx, dy] = dirOf(c.P, hand, dir),
    al = Math.hypot(dx, dy),
    d = s - (hand === 'R' ? c.P.grip : 0);
  return [Math.round(hx + 1.5 + (dx / al) * d), Math.round(hy + 1.5 + (dy / al) * d)];
}

// ---------- attack effects (drawn by a weapon when its clip frame sets `fx`) ----------

/** A swoosh behind a swung weapon: an arc at `s` from the hand, over the last `sweep` degrees it
    turned (positive: it turned clockwise on screen). */
export function trail(c: Ctx, s: number, sweep: number, cols: [string, string], hand: 'R' | 'L' = 'R', dir?: Pt) {
  const [hx, hy] = c.P.arms[hand].hand,
    [dx, dy] = dirOf(c.P, hand, dir),
    a1 = Math.atan2(dy, dx),
    d = s - (hand === 'R' ? c.P.grip : 0),
    n = Math.max(6, Math.round((Math.abs(sweep) * d) / 40));
  for (let i = 0; i <= n; i++) {
    const a = a1 - (sweep * Math.PI * i) / (180 * n);
    c.fx.p(hx + 1.5 + d * Math.cos(a), hy + 1.5 + d * Math.sin(a), cols[0]);
    if (i % 2 === 0 && i > 1) c.fx.p(hx + 1.5 + (d - 2) * Math.cos(a), hy + 1.5 + (d - 2) * Math.sin(a), cols[1]);
  }
}

/** A burst of light at a point: rays of length `r` and a bright core. */
export function burst(c: Ctx, x: number, y: number, r: number, cols: [string, string]) {
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4,
      len = k % 2 ? r * 0.6 : r;
    for (let i = 2; i <= len; i++) c.fx.p(x + Math.cos(a) * i, y + Math.sin(a) * i, i > len - 2 ? cols[1] : cols[0]);
  }
  c.fx.r(x - 1, y - 1, 3, 3, cols[0]);
}

/** A ring of dots round a point (a pulse, a bell's ring, a puff of smoke). */
export function ring(c: Ctx, x: number, y: number, rx: number, ry: number, col: string, step = 30) {
  for (let a = 0; a < 360; a += step) {
    const r = (a * Math.PI) / 180;
    c.fx.p(x + rx * Math.cos(r), y + ry * Math.sin(r), col);
  }
}

/** A ramp's shade for a pixel `t` across a weapon of half-width `hw`: lit left, dark right. */
export const lit = (M: Ramp, t: number, hw: number) => (t > hw * 0.4 ? M[2] : t < -hw * 0.4 ? M[0] : M[1]);

/** The grip's leather wraps, where the hand holds a shaft. */
const wrap = (s: number) => (Math.round(s) % 2 ? R.leather[1] : R.leather[2]);

/** A wooden or lacquered shaft with grip wraps where the hand holds it. */
export function shaft(s: number, t: number, from: number, to: number, Wd: Ramp, hw = 1): string | null {
  if (s < from || s > to || Math.abs(t) > hw) return null;
  if (s > -3 && s < 3) return wrap(s);
  return lit(Wd, t, hw);
}

/** Small fire tongues above a point, a new shape each frame. */
export function flames(c: Ctx, x: number, y: number, f: number, cols: [string, string, string], n = 3) {
  for (let i = 0; i < n; i++) {
    const xx = x - Math.floor(n / 2) + i,
      h = 2 + ((i + f) % 3);
    c.fx.col(xx, y - h, y, cols[1]);
    c.fx.p(xx, y - h, cols[2]);
    c.fx.p(xx, y, cols[0]);
  }
}

// ====================================================================================
// The table: each SP weapon's art and attack. To change one, edit its entry in SP_WEAPON_ART
// (and its drawing, the function it names, just below).
// ====================================================================================

export interface SpWeaponArt {
  /** Paints the weapon in the hero's weapon layer (over the clothes, under the hands). Reads the
      frame's arm pose, `aim`, `grip`, `fly` and `fx`, so it follows its attack clip. */
  draw?(c: Ctx): void;
  /** What goes over the hands (gauntlets, claws, ki), drawn after them. */
  hands?(c: Ctx): void;
  /** Its attack animation (a clip in clips.ts). */
  clip: ClipId;
  /** Arm positions it holds when a frame doesn't say (a bow, a dagger or a bomb held out). */
  stance?: ClipFrame;
}

const SPARK: [string, string] = ['#ffffff', '#fde68a'];

/** A great axe taller than you: one wide bit facing out, edged with fire, a spike behind. */
function greataxe(c: Ctx) {
  const dir = rest(c.P, [0.3, -1]);
  held(
    c,
    (s, t) => {
      const sh = shaft(s, t, -14, 34, WOOD);
      if (sh) return sh;
      const d = Math.abs(s - 27),
        a = -t;
      if (a > 1 && a <= 11 && d <= 2.5 + a * 0.55 - (a > 10 ? (a - 10) * 4 : 0)) return a > 9.6 ? FIRE[a > 10.4 ? 2 : 1] : d > 1.5 + a * 0.55 ? IRON[0] : IRON[a < 4 ? 1 : 2];
      if (t > 1 && t <= 4 && d <= 1.6 - t * 0.3) return IRON[1];
      if (s > 34 && s <= 37 && Math.abs(t) <= 1.4 - (s - 34) * 0.4) return IRON[2];
      return null;
    },
    'R',
    dir,
  );
  const [x, y] = along(c, 27, 'R', dir);
  flames(c, x + 9, y - 3, c.P.f, FIRE, 2);
  // the chop: a trail of fire behind the bit, and the ground bursting where it lands
  if (c.P.fx === 'slash') trail(c, 30, 70, [FIRE[2], FIRE[1]]);
  if (c.P.fx === 'impact') {
    const [ix, iy] = along(c, 32);
    burst(c, ix, Math.min(iy, 60), 6, [FIRE[2], FIRE[0]]);
  }
}

/** A war hammer in the right hand, a tower shield in the left: white, gold rim, a sun in the middle. */
function hammer(c: Ctx) {
  held(c, (s, t) => {
    const sh = shaft(s, t, -6, 13, WOOD);
    if (sh) return sh;
    const a = Math.abs(t);
    if (s >= 13 && s <= 20 && a <= 5.5) {
      if (a < 1.4 && s > 15 && s < 18) return '#ffffff';
      return s < 14 || s > 19 || a > 4.6 ? GOLD[0] : lit(GOLD, t, 5.5);
    }
    return null;
  });
  const { w } = c,
    [hx, hy] = c.P.arms.L.hand,
    x0 = hx - 9,
    y0 = hy - 15;
  w.r(x0, y0, 13, 23, GOLD[0]);
  w.r(x0 + 1, y0 + 1, 11, 21, WHITE_PLATE[1]);
  w.col(x0 + 1, y0 + 1, y0 + 21, '#ffffff');
  w.col(x0 + 11, y0 + 1, y0 + 21, WHITE_PLATE[0]);
  w.row(y0 + 22, x0 + 3, x0 + 9, GOLD[0]);
  w.ellipse(x0 + 6, y0 + 10, 3, 3, GOLD[1]);
  w.p(x0 + 5, y0 + 9, '#ffffff');
  [[x0 + 6, y0 + 4], [x0 + 6, y0 + 16], [x0 + 2, y0 + 10], [x0 + 10, y0 + 10]].forEach(([x, y]) => w.p(x, y, GOLD[2]));
  // the smash: a gold trail, and a ring of light on the ground where the head lands
  if (c.P.fx === 'slash') trail(c, 18, 80, ['#ffffff', GOLD[1]]);
  if (c.P.fx === 'impact') {
    const [ix, iy] = along(c, 20);
    burst(c, ix, iy, 7, ['#ffffff', GOLD[1]]);
    ring(c, ix, iy + 2, 11, 3, GOLD[2], 20);
  }
}

/** A long lance: a steel head, a guard, a ribbon that ripples. */
function lance(c: Ctx) {
  held(c, (s, t) => {
    const a = Math.abs(t);
    if (s >= -16 && s <= 30 && a <= 0.9) return s > -3 && s < 3 ? wrap(s) : lit(FOAM, t, 0.9);
    if (s > 29 && s <= 31 && a <= 2.6) return STEEL[1];
    if (s > 31 && s <= 41 && a <= (2.6 * (41 - s)) / 10 + 0.3) return lit(STEEL, t, 2.6);
    return null;
  });
  const [x, y] = along(c, 28);
  const f = c.P.f % 2;
  c.fx.line(x + 1, y, x + 5, y + 1 + f, SEA[2]);
  c.fx.line(x + 1, y + 1, x + 4, y + 3 - f, FOAM[1]);
  // the thrust: streaks of water along the shaft, a splash at the point
  if (c.P.fx === 'slash' || c.P.fx === 'impact')
    [-3, 3].forEach((o, i) => {
      const [ax, ay] = along(c, 6 + i * 4),
        [bx, by] = along(c, 22 + i * 4);
      c.fx.line(ax, ay + o, bx, by + o, i ? SEA[2] : FOAM[1]);
    });
  if (c.P.fx === 'impact') {
    const [tx, ty] = along(c, 42);
    burst(c, Math.min(tx, 61), ty, 4, ['#ffffff', SEA[2]]);
  }
}

/** A scythe: a long black shaft, the blade curving out over the right. */
function scythe(c: Ctx) {
  held(c, (s, t) => {
    const sh = shaft(s, t, -14, 32, BLACKWOOD);
    if (sh) return sh;
    if (s > 30 && s <= 33 && Math.abs(t) <= 1.8) return BONE[1];
    const tt = -t;
    if (tt < 0.5 || tt > 18) return null;
    const sc = 31 - (tt * tt) / 22,
      th = 2.8 * (1 - tt / 19) + 0.7;
    if (Math.abs(s - sc) > th) return null;
    return s < sc - th + 1.2 ? VIOLET[2] : s > sc + th - 1 ? IRON[0] : IRON[1];
  });
  // the reap: a wide violet arc where the blade went
  if (c.P.fx === 'slash') trail(c, 30, 75, [VIOLET[2], VIOLET[1]]);
}

/** A long bow of blue arrows (the class bow, drawn in rain-grey and steel). */
function longbow(c: Ctx) {
  drawBow(c, ['#1e3a5a', '#3a7aa8', '#9ad0f0'], '#93c5fd', { trim: STEEL, gem: ['#1e3a8a', '#60a5fa', '#e0f2fe'] });
}

/** A hand cannon on the shoulder, smoke curling from its mouth, and a bomb in the left hand, its fuse lit. */
function cannon(c: Ctx) {
  const dir = rest(c.P, [0.45, -1]);
  held(
    c,
    (s, t) => {
      const a = Math.abs(t);
      if (s >= -8 && s < 1 && a <= 2.4) return a > 1.8 ? WOOD[0] : lit(WOOD, t, 2.4);
      if (s >= 1 && s < 19 && a <= 2.4) return Math.round(s) === 5 || Math.round(s) === 12 ? BRASS[1] : lit(IRON, t, 2.4);
      if (s >= 19 && s <= 23 && a <= 3.4) return a < 1.2 && s > 22 ? '#0b0d14' : lit(BRASS, t, 3.4);
      return null;
    },
    'R',
    dir,
  );
  const [x, y] = along(c, 26, 'R', dir),
    f = c.P.f % 3,
    fx = c.P.fx;
  if (fx === 'charge') c.fx.p(x - 1, y, '#fde047');
  else if (fx === 'burst') {
    // the shot: a flash at the mouth
    burst(c, x + 2, y, 6, ['#ffffff', '#f97316']);
    c.fx.r(x, y - 1, 4, 3, '#fde047');
  } else if (fx === 'release') {
    // and the smoke rolling out after it
    ring(c, x + 3, y - 1, 3, 2.5, '#d1d5db', 45);
    ring(c, x + 6, y - 4, 2, 2, '#9ca3af', 60);
    c.fx.p(x + 3, y - 1, '#9ca3af');
  } else {
    c.fx.p(x + f, y - 1 - f, '#9ca3af');
    c.fx.p(x - 1 + f, y - 3 - f, '#d1d5db');
  }
  const [lx, ly] = c.P.arms.L.hand;
  c.w.ellipse(lx + 1, ly - 2, 3, 3, '#1c1917');
  c.w.p(lx, ly - 3, '#57534e');
  c.w.line(lx + 2, ly - 5, lx + 3, ly - 7, BRASS[0]);
  c.fx.p(lx + 3 + (c.P.f % 2), ly - 8, c.P.f % 2 ? '#fde047' : '#ffffff');
}

/** A boomerang in the left hand; thrown (`fly`), it spins out in front of you and comes back. */
function boomerang(c: Ctx) {
  const { w, P } = c;
  if (P.fly > 0) {
    // out of the hand: it arcs out past your shoulder, turning as it goes
    const k = P.fly,
      cx = 40 + k * 0.5,
      cy = 32 - Math.sin((k / 42) * Math.PI) * 10,
      a = k * 0.35,
      arm = (da: number, len: number) => [Math.round(cx + Math.cos(a + da) * len), Math.round(cy + Math.sin(a + da) * len)] as Pt;
    const [ax, ay] = arm(0, 6),
      [bx, by] = arm(Math.PI / 2, 6);
    w.thick(cx - 1, cy - 1, ax, ay, 3, WOOD[1]);
    w.thick(cx - 1, cy - 1, bx, by, 3, WOOD[1]);
    w.line(cx, cy, ax, ay, GOLD[2]);
    w.line(cx, cy, bx, by, GOLD[1]);
    // a whirl of light behind it
    const [tx, ty] = arm(Math.PI * 1.25, 8);
    c.fx.p(tx, ty, '#fde68a');
    c.fx.p(Math.round(cx - 6), Math.round(cy + 1), '#fffbeb');
    return;
  }
  const [lx, ly] = P.arms.L.hand;
  w.thick(lx - 2, ly - 10, lx + 1, ly, 3, WOOD[1]);
  w.thick(lx + 1, ly, lx + 10, ly - 4, 3, WOOD[1]);
  w.line(lx - 2, ly - 10, lx, ly - 1, GOLD[2]);
  w.line(lx + 2, ly - 1, lx + 10, ly - 5, GOLD[1]);
  w.p(lx + 1, ly, GOLD[2]);
}

/** A dagger in each hand: the right held point down, the left out. */
function daggers(c: Ctx) {
  const dagger: Paint = (s, t) => {
    const a = Math.abs(t);
    if (s >= -2 && s < 1 && a <= 0.9) return R.leather[1];
    if (s >= 1 && s < 2 && a <= 2) return IRON[2];
    if (s >= 2 && s <= 10 && a <= (1.8 * (10 - s)) / 8 + 0.4) return lit(STEEL, t, 1.8);
    return null;
  };
  held(c, dagger, 'R', rest(c.P, [0.25, 1]));
  held(c, dagger, 'L', c.P.aimL ?? [0.5, -1]);
  // a stab: a short violet streak past the point
  if (c.P.fx === 'slash') {
    const [ax, ay] = along(c, 11),
      [bx, by] = along(c, 15);
    c.fx.line(ax, ay - 2, bx, by - 2, VIOLET[2]);
    c.fx.line(ax - 1, ay + 2, bx - 1, by + 2, VIOLET[1]);
  }
}

/** A black staff, iron claws at the top holding a ball of fire. */
function flamestaff(c: Ctx) {
  held(c, (s, t) => {
    const sh = shaft(s, t, -14, 30, BLACKWOOD);
    if (sh) return sh;
    const a = Math.abs(t);
    if (s > 29 && s <= 33 && a >= 1.6 && a <= 3) return IRON[1];
    const d = Math.hypot(s - 34, t);
    if (d <= 3) return d < 1.4 ? '#fef3c7' : d < 2.3 ? FIRE[2] : FIRE[1];
    return null;
  });
  const [x, y] = along(c, 37),
    fx = c.P.fx;
  // the flame grows as it gathers, bursts on the thrust
  flames(c, x, y, c.P.f, FIRE, fx === 'charge' ? 5 : 3);
  if (fx === 'charge') ring(c, x, y - 2, 6, 6, FIRE[2], 45);
  if (fx === 'burst') burst(c, x, y - 1, 8, ['#fef3c7', FIRE[1]]);
  if (fx === 'release') ring(c, x + 3, y - 2, 9, 7, FIRE[1], 24);
}

/** An orb of water above the right hand, drops going round it; it swells and pulses in an attack. */
function waterorb(c: Ctx) {
  const [hx, hy] = c.P.arms.R.hand,
    cx = hx + 3,
    cy = hy - 8,
    f = c.P.f,
    fx = c.P.fx,
    big = fx === 'burst' ? 1.5 : fx === 'charge' ? 0.8 : 0;
  c.w.ellipse(cx, cy, 4.5 + big, 4.5 + big, '#0891b2');
  c.w.ellipse(cx - 0.5, cy - 0.5, 3.5 + big, 3.5 + big, '#22d3ee');
  c.w.r(cx - 2, cy - 2, 2, 2, '#ecfeff');
  for (let i = 0; i < 3; i++) {
    const a = ((f + i * 4) / 12) * Math.PI * 2;
    c.fx.p(cx + Math.round(Math.cos(a) * 7), cy + Math.round(Math.sin(a) * 4), '#a5f3fc');
  }
  c.fx.p(cx, cy + 6 + (f % 3), '#67e8f9');
  if (fx === 'charge') ring(c, cx, cy, 8, 8, '#a5f3fc', 30);
  if (fx === 'burst') ring(c, cx, cy, 10, 10, '#ecfeff', 20);
  if (fx === 'release')
    // a wave let go forward
    for (let y = -6; y <= 6; y++) c.fx.p(cx + 8 + Math.round(Math.abs(y) / 2.5), cy + y, Math.abs(y) < 3 ? '#ecfeff' : '#67e8f9');
}

/** A white staff with a gold ring at the top, a bell hanging in it; rung, its light goes out in rings. */
function bellstaff(c: Ctx) {
  held(c, (s, t) => {
    const sh = shaft(s, t, -14, 28, LIGHT_ROBE);
    if (sh) return sh;
    const d = Math.hypot(s - 33, t);
    if (d >= 3.6 && d <= 5) return lit(GOLD, t, 5);
    if (s >= 30 && s <= 33 && Math.abs(t) <= (s - 29) * 0.7) return GOLD[s > 32 ? 0 : 2];
    return null;
  });
  const fx = c.P.fx;
  if (fx === 'charge' || fx === 'burst') {
    const [x, y] = along(c, 33),
      r = fx === 'burst' ? 10 : 7;
    ring(c, x, y, r, r * 0.8, fx === 'burst' ? '#ffffff' : GOLD[2], fx === 'burst' ? 20 : 30);
    if (fx === 'burst') burst(c, x, y, 4, ['#ffffff', GOLD[2]]);
  } else if (c.P.f % 2) {
    const [x, y] = along(c, 39);
    c.fx.p(x, y, '#ffffff');
  }
}

/** A sword of violet light with a dark guard. */
function hexblade(c: Ctx) {
  held(c, (s, t) => {
    const a = Math.abs(t);
    if (s >= -6 && s < -3.5 && a <= 1.6) return VIOLET[1];
    if (s >= -3.5 && s < 3 && a <= 1.1) return '#16121e';
    if (s >= 3 && s <= 5 && a <= 4.5) return a < 1.2 ? VIOLET[2] : IRON[0];
    if (s > 5 && s <= 25) {
      const hw = 2 * Math.min(1, (25 - s) / 4) + 0.3;
      if (a <= hw) return a < 0.7 ? '#ffffff' : t > 0 ? VIOLET[2] : VIOLET[1];
    }
    return null;
  });
  const [x, y] = along(c, 12 + (c.P.f % 3) * 4);
  c.fx.p(x + 2, y, VIOLET[2]);
  // the slash: a wide shadow arc
  if (c.P.fx === 'slash') {
    trail(c, 24, 80, ['#ffffff', VIOLET[1]]);
    trail(c, 20, 60, [VIOLET[2], '#d946ef']);
  }
}

/** The hand in front for a punch's hit: the one further out to the right. */
const fist = (c: Ctx): Pt => {
  const [rx, ry] = c.P.arms.R.hand,
    [lx, ly] = c.P.arms.L.hand;
  return rx >= lx ? [rx, ry] : [lx, ly];
};

/** Red metal gauntlets with gold knuckles, fire licking up from them; a punch lands in fire. */
function gauntlets(c: Ctx) {
  (['L', 'R'] as const).forEach((side) => {
    const [x, y] = c.P.arms[side].hand;
    c.w.r(x - 2, y - 4, 8, 7, GOLD[0]);
    c.w.r(x - 1, y - 3, 6, 5, GOLD[1]);
    c.w.row(y - 3, x - 1, x + 4, GOLD[2]);
    c.w.r(x + 1, y - 1, 2, 2, '#dc2626');
    c.w.p(x + 1, y - 1, '#fca5a5');
    flames(c, x + 2, y - 5, c.P.f + (side === 'L' ? 1 : 0), FIRE, 2);
  });
  const [x, y] = fist(c);
  if (c.P.fx === 'impact') burst(c, x + 8, y, 4, [FIRE[2], FIRE[1]]);
  if (c.P.fx === 'burst') {
    burst(c, x + 8, y, 6, ['#ffffff', FIRE[1]]);
    flames(c, x + 8, y - 4, c.P.f, FIRE, 4);
  }
}

/** Three white claws from each hand; a swipe leaves three light streaks. */
function claws(c: Ctx) {
  (['L', 'R'] as const).forEach((side) => {
    const [x, y] = c.P.arms[side].hand,
      out = side === 'R' ? 1 : -1;
    for (let k = 0; k < 3; k++) {
      const bx = x + k * 2;
      c.w.line(bx, y + 2, bx + out, y + 7, WHITE_FUR[2]);
      c.w.p(bx + out, y + 8, WHITE_FUR[0]);
    }
  });
  if (c.P.fx === 'slash') {
    const [x, y] = c.P.arms.R.hand,
      up = c.P.right === 'up';
    for (let k = 0; k < 3; k++) {
      const ox = x + 2 + k * 3;
      // down a swipe falls from above the hand, up it rises past it
      if (up) c.fx.line(ox - 4, y + 16, ox + 2, y + 4, k === 1 ? '#ffffff' : GOLD[2]);
      else c.fx.line(ox - 2, y - 10, ox + 3, y + 1, k === 1 ? '#ffffff' : GOLD[2]);
    }
  }
}

/** A long bo staff, lacquered blue, with silver caps and rings; spun, the air rings round it. */
function bo(c: Ctx) {
  held(c, (s, t) => {
    const a = Math.abs(t);
    if (s < -22 || s > 36 || a > 1) return null;
    if (s < -20 || s > 34 || Math.abs(s + 10) < 1 || Math.abs(s - 24) < 1) return PEARL[s > 0 ? 1 : 0];
    return s > -3 && s < 3 ? wrap(s) : lit(RIVER_BLUE, t, 1);
  });
  if (c.P.fx === 'slash') {
    // both ends leave a trail: the staff turns on the hand
    trail(c, 34, 45, ['#ffffff', '#bae6fd']);
    trail(c, -20, 45, ['#ffffff', '#bae6fd']);
  }
}

/** A ball of ki in each palm; pushed out, it flares in front of you. */
function kipalms(c: Ctx) {
  (['L', 'R'] as const).forEach((side, i) => {
    const [x, y] = c.P.arms[side].hand,
      cx = x + 1,
      cy = y - 2;
    c.w.ellipse(cx, cy, 3, 3, '#7c3aed');
    c.w.ellipse(cx, cy, 1.5, 1.5, '#1e1b4b');
    c.fx.p(cx + ((c.P.f + i) % 2 ? 4 : -4), cy - 2, '#e9d5ff');
  });
  const [x, y] = c.P.arms.R.hand,
    fx = c.P.fx;
  if (fx === 'charge') ring(c, x + 1, y - 2, 6, 6, '#a855f7', 45);
  if (fx === 'burst') {
    c.fx.ellipse(x + 8, y, 4, 6, '#a855f7');
    c.fx.ellipse(x + 8, y, 2, 4, '#f3e8ff');
    burst(c, x + 8, y, 9, ['#e9d5ff', '#7c3aed']);
  }
  if (fx === 'release') ring(c, x + 6, y, 6, 9, '#d946ef', 24);
}

/** Every SP weapon's art and attack, keyed by the SP card's `weapon`. */
export const SP_WEAPON_ART: Record<SpWeapon, SpWeaponArt> = {
  greataxe: { draw: greataxe, clip: 'chop' },
  hammer: { draw: hammer, clip: 'smash' },
  lance: { draw: lance, clip: 'thrust' },
  scythe: { draw: scythe, clip: 'reap' },
  longbow: { draw: longbow, clip: 'longdraw', stance: { left: 'out' } },
  cannon: { draw: cannon, clip: 'blast', stance: { left: 'out' } },
  boomerang: { draw: boomerang, clip: 'throw', stance: { left: 'out' } },
  daggers: { draw: daggers, clip: 'stab', stance: { left: 'out' } },
  flamestaff: { draw: flamestaff, clip: 'flare' },
  waterorb: { draw: waterorb, clip: 'pulse' },
  bellstaff: { draw: bellstaff, clip: 'ring' },
  hexblade: { draw: hexblade, clip: 'hexslash' },
  gauntlets: { hands: gauntlets, clip: 'combo' },
  claws: { hands: claws, clip: 'swipe' },
  bo: { draw: bo, clip: 'spin' },
  kipalms: { hands: kipalms, clip: 'palms' },
};
