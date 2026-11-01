/* Key poses for the anatomy demos: moves too big for one formula (a clean, a box jump) are a few
   poses in a row, blended. Blending keeps bone lengths: the torso, shoulders and hips are rebuilt
   from the blended pelvis and torso line, and elbows and knees are solved again with IK. Also:
   moving a pose, and its mirror image (left and right swapped). */

import { HIP_OUT, L, SHOULDER_OUT, SHOULDER_UP, add, cross, dot, ik, lerp, mix, mul, sub, unit, type Pose, type Prop, type Side, type V3 } from './skeleton';

const mixDir = (a: V3, b: V3, k: number): V3 => unit(mix(a, b, k));

function mixProp(a: Prop, b: Prop | undefined, k: number): Prop {
  if (!b || a.kind !== b.kind) return k < 0.5 || !b ? a : b;
  const m = (x: V3, y: V3) => mix(x, y, k);
  if ('at' in a && 'at' in b) return { ...a, at: m(a.at, b.at) } as Prop;
  if ('from' in a && 'from' in b) return { ...a, from: m(a.from, b.from), to: m(a.to, (b as typeof a).to) } as Prop;
  return a;
}

/** A pose between two others (k from 0 to 1). */
export function blend(a: Pose, b: Pose, k: number): Pose {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const pelvis = mix(a.pelvis, b.pelvis, k);
  const up = mixDir(sub(a.neck, a.pelvis), sub(b.neck, b.pelvis), k);
  let front = mixDir(a.front, b.front, k);
  front = unit(sub(front, mul(up, dot(front, up))));
  let side = mixDir(a.side, b.side, k);
  side = unit(sub(sub(side, mul(up, dot(side, up))), mul(front, dot(side, front))));
  const neck = add(pelvis, mul(up, L.torso));
  const headUp = mixDir(sub(a.headTop, a.headBase), sub(b.headTop, b.headBase), k);
  const headBase = add(neck, mul(headUp, L.neck));
  const limb = (s: number): Side => {
    const p = s > 0 ? a.right : a.left;
    const q = s > 0 ? b.right : b.left;
    const lift = mix(sub(p.shoulder, add(a.pelvis, mul(unit(sub(a.neck, a.pelvis)), SHOULDER_UP))), sub(q.shoulder, add(b.pelvis, mul(unit(sub(b.neck, b.pelvis)), SHOULDER_UP))), k);
    // The shoulder keeps how far it was lifted (a shrug) along the torso.
    const sh = add(add(add(pelvis, mul(up, SHOULDER_UP)), mul(side, s * SHOULDER_OUT)), mul(up, dot(lift, up)));
    const hip = add(pelvis, mul(side, s * HIP_OUT));
    const wrist = mix(p.wrist, q.wrist, k);
    const ankle = mix(p.ankle, q.ankle, k);
    const elbowPole = sub(mix(p.elbow, q.elbow, k), mix(sh, wrist, 0.5));
    const kneePole = sub(mix(p.knee, q.knee, k), mix(hip, ankle, 0.5));
    return {
      shoulder: sh,
      hip,
      wrist,
      tip: mix(p.tip, q.tip, k),
      ankle,
      heel: mix(p.heel, q.heel, k),
      toe: mix(p.toe, q.toe, k),
      instep: mixDir(p.instep, q.instep, k),
      elbow: ik(sh, wrist, L.upper, L.fore, elbowPole),
      knee: ik(hip, ankle, L.thigh, L.shin, kneePole),
    };
  };
  return {
    pelvis,
    neck,
    headBase,
    headTop: add(headBase, mul(headUp, L.head)),
    front,
    side,
    arch: lerp(a.arch, b.arch, k),
    right: limb(1),
    left: limb(-1),
    props: a.props.map((p, i) => mixProp(p, b.props[i], k)),
  };
}

/** Where a depth from 0 to 1 falls among key poses spaced evenly, eased between each pair. */
export function keyed(keys: Pose[], d: number): Pose {
  const x = Math.min(Math.max(d, 0), 1) * (keys.length - 1);
  const i = Math.min(Math.floor(x), keys.length - 2);
  const t = x - i;
  return blend(keys[i], keys[i + 1], t * t * (3 - 2 * t));
}

const moveSide = (s: Side, f: (v: V3) => V3): Side => ({
  shoulder: f(s.shoulder),
  elbow: f(s.elbow),
  wrist: f(s.wrist),
  tip: f(s.tip),
  hip: f(s.hip),
  knee: f(s.knee),
  ankle: f(s.ankle),
  heel: f(s.heel),
  toe: f(s.toe),
  instep: s.instep,
});

function moveProp(p: Prop, f: (v: V3) => V3): Prop {
  if ('at' in p) return { ...p, at: f(p.at) } as Prop;
  if ('from' in p) return { ...p, from: f(p.from), to: f(p.to) } as Prop;
  return p;
}

/** A pose moved by an offset. */
export function shift(p: Pose, by: V3): Pose {
  const f = (v: V3) => add(v, by);
  return { ...p, pelvis: f(p.pelvis), neck: f(p.neck), headBase: f(p.headBase), headTop: f(p.headTop), right: moveSide(p.right, f), left: moveSide(p.left, f), props: p.props.map((q) => moveProp(q, f)) };
}

/** A pose's mirror image across the middle (right and left swapped). */
export function mirror(p: Pose): Pose {
  const f = (v: V3): V3 => [v[0], v[1], -v[2]];
  const flipSide = (s: Side): Side => ({ ...moveSide(s, f), instep: f(s.instep) });
  const front = f(p.front);
  const up = unit(sub(f(p.neck), f(p.pelvis)));
  return {
    ...p,
    pelvis: f(p.pelvis),
    neck: f(p.neck),
    headBase: f(p.headBase),
    headTop: f(p.headTop),
    front,
    side: unit(cross(front, up)),
    right: flipSide(p.left),
    left: flipSide(p.right),
    props: p.props.map((q) => moveProp(q, f)),
  };
}

/** A pose turned half round where it stands (facing the other way along x). */
export function turn(p: Pose): Pose {
  const f = (v: V3): V3 => [-v[0], v[1], -v[2]];
  const turnSide = (s: Side): Side => ({ ...moveSide(s, f), instep: f(s.instep) });
  return {
    ...p,
    pelvis: f(p.pelvis),
    neck: f(p.neck),
    headBase: f(p.headBase),
    headTop: f(p.headTop),
    front: f(p.front),
    side: f(p.side),
    right: turnSide(p.right),
    left: turnSide(p.left),
    props: p.props.map((q) => moveProp(q, f)),
  };
}
