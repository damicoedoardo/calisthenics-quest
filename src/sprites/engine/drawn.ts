import { R, SKIN } from '../palette';
import { grid, mix, painter, NIGHT, type Grid, type Painter, type Ramp } from './grid';
import type { Look, Pose } from './figure';

/* The hand-drawn body: an option to the block body, for a manga head. The torso is a shaped
   silhouette (broad chest, a waist, the far shoulder a touch lower), the arms bend at the elbow
   and hang a little away from the body, and the legs stand with the weight on the near leg and
   the feet turned out. Hands and weapons stay where the block body has them, so every weapon
   and item still fits. All of it is drawn straight at 64. */

/** The torso's x-range at each row y (30..47, without bob): [y, x0, x1]. */
const TORSO: Record<Look['sex'], [number, number, number][]> = {
  m: [
    [30, 24, 39],
    [31, 22, 40],
    [32, 21, 41],
    [33, 21, 42],
    [34, 21, 42],
    [35, 21, 42],
    [36, 21, 42],
    [37, 22, 41],
    [38, 23, 40],
    [39, 23, 40],
    [40, 23, 40],
    [41, 23, 40],
    [42, 22, 41],
    [43, 22, 41],
    [44, 22, 41],
    [45, 22, 41],
    [46, 22, 41],
    [47, 22, 41],
  ],
  f: [
    [30, 25, 38],
    [31, 23, 39],
    [32, 23, 40],
    [33, 23, 40],
    [34, 23, 40],
    [35, 23, 40],
    [36, 23, 40],
    [37, 24, 39],
    [38, 25, 38],
    [39, 25, 38],
    [40, 25, 38],
    [41, 24, 39],
    [42, 23, 40],
    [43, 23, 40],
    [44, 22, 41],
    [45, 22, 41],
    [46, 22, 41],
    [47, 22, 41],
  ],
};

/** The drawn torso's x-range at body row y (no bob). */
export function drawnTorso(look: Look, y: number): [number, number] {
  const rows = TORSO[look.sex],
    r = rows[Math.max(0, Math.min(rows.length - 1, y - 30))];
  return [r[1], r[2]];
}

/**
 * The legs, one character per pixel, from x 20 at y 46. Q P p trousers light/base/shadow,
 * C B b boot light/base/dark, n the sole. The near leg (left) takes the weight; the far one
 * stands a little out.
 */
const LEGS = [
  '..QPPPPPPPPPPPPPPPPPPp..',
  '..QPPPPPPPPppPPPPPPPp...',
  '..QPPPPPPPp...PPPPPPp...',
  '..QPPPPPPp....PPPPPPPp..',
  '..QPPPPPPp.....PPPPPPp..',
  '...QQPPPPp.....QPPPPPp..',
  '...QQPPPPp.....QQPPPPp..',
  '...QPPPPp.......PPPPPp..',
  '...QPPPPp.......PPPPPPp.',
  '...QPPPPp.......PPPPPPp.',
  '..pppppppp......ppppppp.',
  '..CCCCCCb.......CCCCCCCb',
  '.CBBBBBBb.......BBBBBBBb',
  'CBBBBBBBb.......BBBBBBBBb',
  'BBBBBBBBb.......BBBBBBBBb',
  'nnnnnnnnn.......nnnnnnnnn',
];
const LEGS_AT: [number, number] = [20, 46];
/** Columns of the near leg; the rest is the far leg. */
const NEAR = 12;

/** The legs mid-step: the lifted leg loses three rows of shin, so its boot rides up. */
function legRows(step: number): string[] {
  if (!step) return LEGS;
  const lifted = (i: number) => (step === -1 ? i < NEAR : i >= NEAR),
    cut = [6, 7, 8];
  return LEGS.map((row, j) =>
    [...row]
      .map((ch, i) => {
        if (!lifted(i)) return ch;
        // rows below the cut come from three rows further down
        if (j < cut[0]) return ch;
        const from = j + cut.length;
        return from < LEGS.length ? LEGS[from][i] : '.';
      })
      .join(''),
  );
}

/**
 * The left arm hanging down, drawn by hand from x 14 at y 30 (the right arm is its mirror).
 * U S s the sleeve light/base/shadow, o the sleeve's dark edge, K k skin and its shadow, x the
 * skin's dark edge. The elbow bends out, so the waist shows between the arm and the body.
 */
export const ARM_DOWN = [
  '....UUUS.',
  '...UUSSSo',
  '..USSSSso',
  '..USSSsso',
  '.USSSsso.',
  '.USSSso..',
  'oUSSsso..',
  'ossssoo..',
  '.xKKKkx..',
  '..xKKKkx.',
  '..xKKKkx.',
  '...KKKkkx',
  '...KKKKk.',
];
const ARM_AT: [number, number] = [14, 30];

/** Paints a hanging arm with `u` (a painter with the bob) and `ink` (letter, row → color or null). */
export function paintArm(u: Painter, P: Pose, side: 'L' | 'R', ink: (ch: string, j: number) => string | null) {
  ARM_DOWN.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.') return;
      const c = ink(ch, j),
        x = ARM_AT[0] + i + (P.fem ? 1 : 0);
      if (c) u.p(side === 'L' ? x : 63 - x, ARM_AT[1] + j, c);
    }),
  );
}

/** Whether an arm hangs down, so it is drawn by hand (other poses use two bones). */
export const hangs = (P: Pose, side: 'L' | 'R') => (side === 'L' ? P.left : P.right) === 'down';

export interface Limb {
  /** Shoulder, elbow, and the hand's middle. */
  s: [number, number];
  e: [number, number];
  h: [number, number];
}

/** Each arm as two bones: the hand is where the block body puts it, the elbow bends outward. */
export function limbs(P: Pose): Record<'L' | 'R', Limb> {
  const inset = P.fem ? 1 : 0,
    one = (side: 'L' | 'R'): Limb => {
      const s: [number, number] = side === 'L' ? [20 + inset, 32 + P.bob] : [43 - inset, 32 + P.bob],
        [hx, hy] = P.arms[side].hand,
        h: [number, number] = [hx + 1, hy + 1],
        m: [number, number] = [(s[0] + h[0]) / 2, (s[1] + h[1]) / 2],
        tall = Math.abs(h[1] - s[1]) >= Math.abs(h[0] - s[0]),
        e: [number, number] = tall ? [Math.round(m[0] + (side === 'L' ? -3 : 3)), Math.round(m[1])] : [Math.round(m[0]), Math.round(m[1] + 2)];
      return { s, e, h };
    };
  return { L: one('L'), R: one('R') };
}

/** A bone `t` px thick, centered on the line from a to b. */
export function bone(g: Grid, a: [number, number], b: [number, number], t: number, c: string) {
  const p = painter(g, 0),
    o = Math.floor(t / 2);
  p.thick(a[0] - o, a[1] - o, b[0] - o, b[1] - o, t, c);
}

/** The drawn body at 64: legs, torso and arms, ready for the manga head to be painted on. */
export function drawnBody(P: Pose, look: Look, legsRamp: Ramp | undefined): Grid {
  const g = grid(64),
    u = painter(g, P.bob),
    l = painter(g, 0),
    Sk = SKIN[look.skin],
    L = legsRamp || R.navy,
    Bt = R.leather,
    ink: Record<string, string> = { Q: L[2], P: L[1], p: L[0], C: Bt[2], B: Bt[1], b: Bt[0], n: mix(Bt[0], NIGHT, 0.4) };
  legRows(P.step).forEach((row, j) => [...row].forEach((ch, i) => ink[ch] && l.p(LEGS_AT[0] + i, LEGS_AT[1] + j, ink[ch])));
  TORSO[look.sex].forEach(([y, x0, x1]) => u.row(y, x0, x1, R.cloth[1]));
  const arms = limbs(P);
  (['L', 'R'] as const).forEach((s) => {
    if (hangs(P, s)) return paintArm(u, P, s, (ch) => (ch === 'x' || ch === 'o' ? Sk[0] : Sk[1]));
    const { s: a, e, h } = arms[s];
    bone(g, a, e, 4, Sk[1]);
    bone(g, e, h, 3, Sk[1]);
  });
  return g;
}
