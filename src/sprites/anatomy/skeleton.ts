/* The anatomy demos' skeleton: 3D vectors, two-bone IK, an adult's segment lengths, and
   `assemble()`, which builds a whole pose from where the pelvis, torso, hands and feet are. Poses
   live in moves.ts; drawing in body.ts. Centimeters, x forward, y up, z to the body's right, the
   floor at y = 0. */

export type V3 = [number, number, number];
export type V2 = [number, number];

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Two-bone IK: the middle joint of a limb from A to C, bending toward `pole`. */
export function ik(a: V3, c: V3, l1: number, l2: number, pole: V3): V3 {
  const d = sub(c, a);
  const dist = Math.min(Math.max(len(d), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const u = unit(d);
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const p = unit(sub(pole, mul(u, dot(pole, u))));
  return add(add(a, mul(u, along)), mul(p, h));
}

/** An adult's segment lengths (cm). */
export const L = { torso: 52, neck: 8, head: 22, upper: 30, fore: 26, thigh: 45, shin: 44, ankle: 8 };
/** Shoulder joints sit this far up the torso and out from the middle; hip joints out from it. */
export const SHOULDER_UP = 46;
export const SHOULDER_OUT = 18;
export const HIP_OUT = 9;

/** One side's joints. */
export interface Side {
  shoulder: V3;
  elbow: V3;
  wrist: V3;
  tip: V3;
  hip: V3;
  knee: V3;
  ankle: V3;
  heel: V3;
  toe: V3;
  /** Which way the top of the foot faces. */
  instep: V3;
}

/** Gear in the scene. A barbell runs side to side through `at`; dumbbells sit in each hand; a
    pull-up bar or cable handle runs side to side (`half` its half length); a box stands on `at`
    (its bottom middle) with a size; a cable runs from its pulley to the handle; dip bars run front
    to back at each side of `at`. */
export type Prop =
  | { kind: 'barbell'; at: V3 }
  | { kind: 'dumbbell'; at: V3 }
  | { kind: 'bench'; from: V3; to: V3 }
  | { kind: 'pullbar'; at: V3; half?: number }
  | { kind: 'box'; at: V3; size: V3 }
  | { kind: 'cable'; from: V3; to: V3 }
  | { kind: 'bars'; at: V3 };

export interface Pose {
  pelvis: V3;
  neck: V3;
  headBase: V3;
  headTop: V3;
  /** Which way the chest faces, and the body's right. */
  front: V3;
  side: V3;
  right: Side;
  left: Side;
  props: Prop[];
}

/** One side's hands and feet, given its side (1 right, -1 left). */
export interface Limb {
  wrist: V3;
  tip: V3;
  /** Which way the elbow bends; or `elbow` to place it. */
  elbowPole?: V3;
  elbow?: V3;
  ankle: V3;
  heel: V3;
  toe: V3;
  instep?: V3;
  /** Which way the knee bends; or `knee` to place it. */
  kneePole?: V3;
  knee?: V3;
}

/** A whole pose: the pelvis, the torso's line (`up`, toward the neck) and the chest's way
    (`front`), how the head sits (`headUp`, default along the torso), and each side's limbs. */
export function assemble(o: { pelvis: V3; up: V3; front: V3; headUp?: V3; limb: (s: number) => Limb; props?: Prop[]; side?: V3; shrug?: number }): Pose {
  const up = unit(o.up);
  // Which way is the body's right (z unless it lies on its side), and how far the shoulders lift.
  const right = unit(o.side ?? [0, 0, 1]);
  const lift = mul(up, o.shrug ?? 0);
  const neck = add(o.pelvis, mul(up, L.torso));
  const headUp = unit(o.headUp ?? up);
  const headBase = add(neck, mul(headUp, L.neck));
  const headTop = add(headBase, mul(headUp, L.head));
  const side = (s: number): Side => {
    const l = o.limb(s);
    const shoulder = add(add(add(o.pelvis, mul(up, SHOULDER_UP)), mul(right, s * SHOULDER_OUT)), lift);
    const hip = add(o.pelvis, mul(right, s * HIP_OUT));
    return {
      shoulder,
      hip,
      wrist: l.wrist,
      tip: l.tip,
      ankle: l.ankle,
      heel: l.heel,
      toe: l.toe,
      instep: unit(l.instep ?? [0, 1, 0]),
      elbow: l.elbow ?? ik(shoulder, l.wrist, L.upper, L.fore, l.elbowPole ?? [0, -1, 0]),
      knee: l.knee ?? ik(hip, l.ankle, L.thigh, L.shin, l.kneePole ?? [1, 0, 0]),
    };
  };
  return { pelvis: o.pelvis, neck, headBase, headTop, front: unit(o.front), side: right, right: side(1), left: side(-1), props: o.props ?? [] };
}

/** A torso leaning `deg` forward from upright: its line and the chest's way. */
export function lean(deg: number): { up: V3; front: V3 } {
  return { up: [Math.sin(rad(deg)), Math.cos(rad(deg)), 0], front: [Math.cos(rad(deg)), -Math.sin(rad(deg)), 0] };
}

/** Feet flat on the floor, the ankle at x, `out` from the middle, toes turned out a little. */
export function flatFoot(x: number, out: number, s: number, turn = 4): Pick<Limb, 'ankle' | 'heel' | 'toe' | 'instep'> {
  return { ankle: [x, L.ankle, s * out], heel: [x - 6, 3.5, s * (out - 1)], toe: [x + 18.5, 2.5, s * (out + turn)], instep: [0, 1, 0] };
}

/** A flat foot around an ankle anywhere (feet in the air or on a box). */
export function footAt(ankle: V3, s: number, turn = 4): Pick<Limb, 'ankle' | 'heel' | 'toe' | 'instep'> {
  return { ankle, heel: add(ankle, [-6, -4.5, -s]), toe: add(ankle, [18.5, -5.5, s * turn]), instep: [0, 1, 0] };
}

/** Ease in and out. */
export const ease = (t: number) => t * t * (3 - 2 * t);

/** Where a moment of the loop is: how deep (0 top, 1 bottom) and which way it moves. */
export function phase(t: number): { depth: number; dir: 'down' | 'up' | null } {
  const x = ((t % 1) + 1) % 1;
  if (x < 0.08) return { depth: 0, dir: null };
  if (x < 0.48) return { depth: ease((x - 0.08) / 0.4), dir: 'down' };
  if (x < 0.56) return { depth: 1, dir: null };
  if (x < 0.92) return { depth: 1 - ease((x - 0.56) / 0.36), dir: 'up' };
  return { depth: 0, dir: null };
}
