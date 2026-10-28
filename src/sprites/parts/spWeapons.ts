import type { SpWeapon } from '@/game/dungeon/content';
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

/** Where a weapon held in the right hand points in each arm pose. */
export const aim = (P: Pose): Pt => (P.right === 'up' ? [0.8, -0.6] : P.right === 'fwd' ? [0.2, 1] : P.right === 'pull' ? [1, -0.15] : [0.12, -1]);

/** Paints a held weapon from the hand's grip along `dir` (the right hand's aim by default). */
export function held(c: Ctx, paint: Paint, hand: 'R' | 'L' = 'R', dir?: Pt) {
  const [hx, hy] = c.P.arms[hand].hand,
    gx = hx + 1.5,
    gy = hy + 1.5,
    [dx, dy] = dir ?? aim(c.P),
    al = Math.hypot(dx, dy),
    ax = dx / al,
    ay = dy / al,
    nx = ay,
    ny = -ax;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const ox = x - gx,
        oy = y - gy,
        col = paint(ox * ax + oy * ay, ox * nx + oy * ny);
      if (col) c.w.p(x, y, col);
    }
}

/** The point `s` along a held weapon (for sparks and smoke at its tip). */
export function along(c: Ctx, s: number, hand: 'R' | 'L' = 'R', dir?: Pt): Pt {
  const [hx, hy] = c.P.arms[hand].hand,
    [dx, dy] = dir ?? aim(c.P),
    al = Math.hypot(dx, dy);
  return [Math.round(hx + 1.5 + (dx / al) * s), Math.round(hy + 1.5 + (dy / al) * s)];
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
// The table: each SP weapon's art. To redraw one, edit its entry.
// ====================================================================================

export interface SpWeaponArt {
  /** Paints the weapon in the hero's weapon layer (over the clothes, under the hands). */
  draw?(c: Ctx): void;
  /** What goes over the hands (gauntlets, claws, ki), drawn after them. */
  hands?(c: Ctx): void;
}

/** A great axe taller than you: one wide bit facing out, edged with fire, a spike behind. */
function greataxe(c: Ctx) {
  const dir: Pt | undefined = c.P.right === 'down' ? [0.3, -1] : undefined;
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
}

/** A long bow of blue arrows (the class bow, drawn in rain-grey and steel). */
function longbow(c: Ctx) {
  drawBow(c, ['#1e3a5a', '#3a7aa8', '#9ad0f0'], '#93c5fd', { trim: STEEL, gem: ['#1e3a8a', '#60a5fa', '#e0f2fe'] });
}

/** A hand cannon on the shoulder, smoke curling from its mouth, and a bomb in the left hand, its fuse lit. */
function cannon(c: Ctx) {
  const dir: Pt | undefined = c.P.right === 'down' ? [0.45, -1] : undefined;
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
    f = c.P.f % 3;
  c.fx.p(x + f, y - 1 - f, '#9ca3af');
  c.fx.p(x - 1 + f, y - 3 - f, '#d1d5db');
  const [lx, ly] = c.P.arms.L.hand;
  c.w.ellipse(lx + 1, ly - 2, 3, 3, '#1c1917');
  c.w.p(lx, ly - 3, '#57534e');
  c.w.line(lx + 2, ly - 5, lx + 3, ly - 7, BRASS[0]);
  c.fx.p(lx + 3 + (c.P.f % 2), ly - 8, c.P.f % 2 ? '#fde047' : '#ffffff');
}

/** A boomerang in the left hand. */
function boomerang(c: Ctx) {
  const { w, P } = c,
    [lx, ly] = P.arms.L.hand;
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
  held(c, dagger, 'R', c.P.right === 'down' ? [0.25, 1] : undefined);
  held(c, dagger, 'L', [0.5, -1]);
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
  const [x, y] = along(c, 37);
  flames(c, x, y, c.P.f, FIRE);
}

/** An orb of water above the right hand, drops going round it. */
function waterorb(c: Ctx) {
  const [hx, hy] = c.P.arms.R.hand,
    cx = hx + 3,
    cy = hy - 8,
    f = c.P.f;
  c.w.ellipse(cx, cy, 4.5, 4.5, '#0891b2');
  c.w.ellipse(cx - 0.5, cy - 0.5, 3.5, 3.5, '#22d3ee');
  c.w.r(cx - 2, cy - 2, 2, 2, '#ecfeff');
  for (let i = 0; i < 3; i++) {
    const a = ((f + i * 4) / 12) * Math.PI * 2;
    c.fx.p(cx + Math.round(Math.cos(a) * 7), cy + Math.round(Math.sin(a) * 4), '#a5f3fc');
  }
  c.fx.p(cx, cy + 6 + (f % 3), '#67e8f9');
}

/** A white staff with a gold ring at the top, a bell hanging in it. */
function bellstaff(c: Ctx) {
  held(c, (s, t) => {
    const sh = shaft(s, t, -14, 28, LIGHT_ROBE);
    if (sh) return sh;
    const d = Math.hypot(s - 33, t);
    if (d >= 3.6 && d <= 5) return lit(GOLD, t, 5);
    if (s >= 30 && s <= 33 && Math.abs(t) <= (s - 29) * 0.7) return GOLD[s > 32 ? 0 : 2];
    return null;
  });
  if (c.P.f % 2) {
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
}

/** Red metal gauntlets with gold knuckles, fire licking up from them. */
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
}

/** Three white claws from each hand. */
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
}

/** A long bo staff, lacquered blue, with silver caps and rings. */
function bo(c: Ctx) {
  held(c, (s, t) => {
    const a = Math.abs(t);
    if (s < -22 || s > 36 || a > 1) return null;
    if (s < -20 || s > 34 || Math.abs(s + 10) < 1 || Math.abs(s - 24) < 1) return PEARL[s > 0 ? 1 : 0];
    return s > -3 && s < 3 ? wrap(s) : lit(RIVER_BLUE, t, 1);
  });
}

/** A ball of ki in each palm. */
function kipalms(c: Ctx) {
  (['L', 'R'] as const).forEach((side, i) => {
    const [x, y] = c.P.arms[side].hand,
      cx = x + 1,
      cy = y - 2;
    c.w.ellipse(cx, cy, 3, 3, '#7c3aed');
    c.w.ellipse(cx, cy, 1.5, 1.5, '#1e1b4b');
    c.fx.p(cx + ((c.P.f + i) % 2 ? 4 : -4), cy - 2, '#e9d5ff');
  });
}

/** Every SP weapon's art. */
export const SP_WEAPON_ART: Record<SpWeapon, SpWeaponArt> = {
  greataxe: { draw: greataxe },
  hammer: { draw: hammer },
  lance: { draw: lance },
  scythe: { draw: scythe },
  longbow: { draw: longbow },
  cannon: { draw: cannon },
  boomerang: { draw: boomerang },
  daggers: { draw: daggers },
  flamestaff: { draw: flamestaff },
  waterorb: { draw: waterorb },
  bellstaff: { draw: bellstaff },
  hexblade: { draw: hexblade },
  gauntlets: { hands: gauntlets },
  claws: { hands: claws },
  bo: { draw: bo },
  kipalms: { hands: kipalms },
};
