import { SIZE as S, type Ctx, type Pose } from '../engine/figure';
import type { Ramp } from '../engine/grid';
import { R } from '../palette';

/* The SPs' own weapons (characters/spLooks.ts): an SP draws its weapon in place of the class's.
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

/** A wooden or lacquered shaft with grip wraps where the hand holds it. */
export function shaft(s: number, t: number, from: number, to: number, Wd: Ramp, hw = 1): string | null {
  if (s < from || s > to || Math.abs(t) > hw) return null;
  if (s > -3 && s < 3) return Math.round(s) % 2 ? R.leather[1] : R.leather[2];
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
