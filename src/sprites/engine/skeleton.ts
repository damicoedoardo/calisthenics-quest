import type { Gear, GearSlot } from '@/lib/gear';
import { NIGHT, autoshade, grid, mix, outline, rampOf, stamp, type Grid, type Ramp } from './grid';
import type { Look } from './figure';
import { HAIR, LINEN, R, SKIN, TROUSERS } from '../palette';

/* The jointed skeleton every exercise demo is drawn with: a few body lengths, two-bone IK for the
   elbows and knees, the floor and gym props, the weights in the hands, and the figure itself (your
   skin, hair and armor color). Side on, facing right; the near arm and leg go over the far ones.
   The poses live in characters/exercise.ts (the program) and characters/moves.ts (the library). */

export type P = [number, number];
export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
export const len = (a: P) => Math.hypot(a[0], a[1]);
export const unit = (a: P): P => mul(a, 1 / (len(a) || 1));
export const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** A direction from an angle in degrees: 0 is right, 90 is down (screen y grows downward). */
export const dir = (deg: number): P => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

// body lengths, in sprite pixels
export const UPPER = 8,
  FORE = 8,
  THIGH = 10,
  SHIN = 10,
  TORSO = 14,
  NECK = 6;

/** The middle joint of a two-bone limb from a to c, bent toward `toward`. */
export function ik(a: P, c: P, l1: number, l2: number, toward: P): P {
  const v = sub(c, a),
    d = Math.min(len(v), l1 + l2 - 0.01),
    u = unit(v),
    x = (l1 * l1 - l2 * l2 + d * d) / (2 * d),
    h = Math.sqrt(Math.max(0, l1 * l1 - x * x)),
    base = add(a, mul(u, x)),
    n: P = [-u[1], u[0]];
  const one = add(base, mul(n, h)),
    two = sub(base, mul(n, h));
  const score = (q: P) => (q[0] - base[0]) * toward[0] + (q[1] - base[1]) * toward[1];
  return score(one) >= score(two) ? one : two;
}

/** Where a limb's hand or foot ends up, for limbs given by joint positions. */
export interface Arm {
  shoulder: P;
  elbow: P;
  hand: P;
}
export interface Leg {
  hip: P;
  knee: P;
  foot: P;
  /** Which way the toes point. */
  toes: P;
}
export interface Pose {
  head: P;
  /** The way the face looks, and the top of the head. */
  face: P;
  up: P;
  shoulder: P;
  hip: P;
  near: { arm: Arm; leg: Leg };
  far: { arm: Arm; leg: Leg };
  /** Seen from the front (the archer push-up): two eyes, no profile. */
  front?: boolean;
  /** The head is drawn over the near arm (hanging: the arms pass beside and behind it). */
  headFront?: boolean;
  /** A bent back: the torso runs shoulder, mid, hip (a crunch, a cat stretch). */
  mid?: P;
  /** Seen from the front standing: both legs show, the torso is drawn shoulder-wide. */
  frontLegs?: boolean;
  /** Seen from the front but lying or propped (a side plank): the legs still show. */
  showLegs?: boolean;
}

export const arm = (shoulder: P, hand: P, toward: P, l1 = UPPER, l2 = FORE): Arm => ({ shoulder, hand, elbow: ik(shoulder, hand, l1, l2, toward) });
/** A locked arm's length: the hand exactly a straight arm away (no kink at the elbow). */
export const LOCKED = UPPER + FORE - 0.02;
export const leg = (hip: P, foot: P, toward: P, toes: P): Leg => ({ hip, foot, toes, knee: ik(hip, foot, THIGH, SHIN, toward) });
/** A straight leg along a direction. */
export const straight = (hip: P, d: P, toes: P): Leg => ({ hip, knee: add(hip, mul(d, THIGH)), foot: add(hip, mul(d, THIGH + SHIN)), toes });

// ---------- timing ----------

/** One rep: a beat at the top, down, a beat at the bottom, up. 0 is the start position, 1 the far end. */
export const REP = [0, 0, 0.12, 0.35, 0.6, 0.85, 1, 1, 1, 0.85, 0.6, 0.35, 0.12, 0, 0, 0];
/** A negative: jump to the top, lower slowly for five seconds' worth of frames, drop off. */
export const NEGATIVE = [0, 0.6, 1, 1, 0.94, 0.87, 0.79, 0.7, 0.61, 0.52, 0.42, 0.32, 0.22, 0.12, 0, 0];
/** Holds breathe: the body settles a pixel for half the loop. */
export const breath = (f: number) => (f % 16 >= 8 ? 0.6 : 0);

// ---------- props ----------

export const FLOOR = 56;
export const STEEL: Ramp = ['#4a5260', '#8a93a1', '#c9ced6'];
export const WOOD: Ramp = R.leather;

export type Props = 'floor' | 'bench' | 'flatbench' | 'bar' | 'dipbar' | 'parallettes';

export function props(g: Grid, kind: Props, band?: { from: P; to: P }) {
  const put = (x: number, y: number, c: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < 64 && y < 64) g[y][x] = c;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c);
  };
  // the floor: a band of stone, darker underneath
  if (kind !== 'bar') {
    rect(0, FLOOR + 1, 63, FLOOR + 1, '#3a3f4d');
    rect(0, FLOOR + 2, 63, 63, '#232733');
    for (let x = 3; x < 64; x += 9) put(x, FLOOR + 3, '#2c3140');
  }
  if (kind === 'bench') {
    rect(18, 44, 44, 45, WOOD[2]);
    rect(18, 46, 44, 47, WOOD[1]);
    rect(20, 48, 22, FLOOR, WOOD[0]);
    rect(40, 48, 42, FLOOR, WOOD[0]);
  }
  if (kind === 'bar') {
    rect(4, 8, 59, 9, STEEL[1]);
    rect(4, 8, 59, 8, STEEL[2]);
    rect(2, 4, 3, 63, STEEL[0]);
    rect(60, 4, 61, 63, STEEL[0]);
  }
  if (kind === 'flatbench') {
    // a long weight bench under the back, its feet at both ends
    rect(16, 44, 50, 45, WOOD[2]);
    rect(16, 46, 50, 47, WOOD[1]);
    rect(18, 48, 20, FLOOR, STEEL[0]);
    rect(46, 48, 48, FLOOR, STEEL[0]);
  }
  if (kind === 'dipbar') {
    rect(14, 30, 50, 31, STEEL[1]);
    rect(14, 30, 50, 30, STEEL[2]);
    rect(16, 32, 17, FLOOR, STEEL[0]);
    rect(47, 32, 48, FLOOR, STEEL[0]);
  }
  if (kind === 'parallettes') {
    // seen end on: the round grip, one post, the foot
    rect(32, 47, 35, 48, STEEL[1]);
    rect(32, 47, 35, 47, STEEL[2]);
    rect(33, 49, 34, FLOOR, STEEL[0]);
    rect(30, FLOOR, 37, FLOOR, STEEL[0]);
  }
  if (band) {
    // a resistance band looped over the bar and under the knee
    const n = Math.ceil(len(sub(band.to, band.from)));
    for (let i = 0; i <= n; i++) {
      const q = lerp(band.from, band.to, i / n);
      put(q[0], q[1], '#ef4444');
      put(q[0] + 2, q[1], '#b91c1c');
    }
  }
}

// ---------- the figure ----------

export interface Colors {
  skin: Ramp;
  hair: Ramp;
  shirt: Ramp;
  pants: Ramp;
  shoe: string;
}

export function colorsFor(o: { gear: Record<GearSlot, Gear>; look?: Look }): Colors {
  const look = o.look;
  const tier = o.gear.armor.tier;
  return {
    skin: SKIN[look?.skin ?? 'light'],
    hair: HAIR[look?.hair ?? 'brown'],
    shirt: tier === 0 ? LINEN : rampOf(o.gear.armor.color),
    pants: tier >= 3 ? [mix(o.gear.armor.color, NIGHT, 0.6), mix(o.gear.armor.color, NIGHT, 0.4), o.gear.armor.color] : TROUSERS,
    shoe: '#3e2614',
  };
}

/** A filled capsule: every pixel within r of the segment a-b. */
export function capsule(g: Grid, a: P, b: P, r: number, c: string) {
  const x0 = Math.floor(Math.min(a[0], b[0]) - r),
    x1 = Math.ceil(Math.max(a[0], b[0]) + r),
    y0 = Math.floor(Math.min(a[1], b[1]) - r),
    y1 = Math.ceil(Math.max(a[1], b[1]) + r);
  const ab = sub(b, a),
    l2 = ab[0] * ab[0] + ab[1] * ab[1] || 1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * ab[0] + (y - a[1]) * ab[1]) / l2)),
        q = add(a, mul(ab, t));
      if (Math.hypot(x - q[0], y - q[1]) <= r) g[y][x] = c;
    }
}

export function drawLeg(g: Grid, l: Leg, c: Colors, dim: boolean) {
  const pants = dim ? c.pants[0] : c.pants[1],
    shoe = dim ? mix(c.shoe, NIGHT, 0.4) : c.shoe;
  capsule(g, l.hip, l.knee, 2.2, pants);
  capsule(g, l.knee, l.foot, 1.8, pants);
  capsule(g, l.foot, add(l.foot, mul(l.toes, 2.5)), 1.4, shoe);
}

export function drawArm(g: Grid, a: Arm, c: Colors, dim: boolean) {
  const shirt = dim ? c.shirt[0] : c.shirt[1],
    skin = dim ? c.skin[0] : c.skin[1];
  capsule(g, a.elbow, a.hand, 1.4, skin);
  capsule(g, a.hand, a.hand, 1.7, skin);
  capsule(g, a.shoulder, lerp(a.shoulder, a.elbow, 0.4), 1.8, shirt);
  capsule(g, lerp(a.shoulder, a.elbow, 0.4), a.elbow, 1.5, skin);
}

export function drawHead(g: Grid, p: Pose, c: Colors, look?: Look) {
  const [cx, cy] = p.head,
    r = 5.2;
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++)
    for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      if (x < 0 || y < 0 || x >= 64 || y >= 64) continue;
      const d: P = [x - cx, y - cy];
      if (Math.hypot(d[0], d[1]) > r) continue;
      const along = d[0] * p.face[0] + d[1] * p.face[1],
        upward = d[0] * p.up[0] + d[1] * p.up[1];
      // hair over the top and back of the head; the face stays clear in front
      const hair = p.front ? upward > 1.2 : upward > 2 || along < -0.5;
      g[y][x] = hair ? c.hair[1] : c.skin[1];
    }
  // a long tail of hair falls with gravity from the back of the head
  if (look && !p.front && (look.style === 'long' || look.style === 'hime' || look.style === 'pony' || look.style === 'twin')) {
    // long hair falls past the shoulders; a pony tail flicks out from higher on the head
    const pony = look.style === 'pony' || look.style === 'twin',
      back = add(p.head, add(mul(p.face, -3.5), mul(p.up, pony ? 3 : 1.5)));
    const end = add(back, pony ? [-p.face[0] * 4, 6] : [-p.face[0] * 1.5, 9]);
    capsule(g, back, end, pony ? 1.5 : 2, c.hair[1]);
    capsule(g, back, lerp(back, end, 0.5), 0.8, c.hair[2]);
  }
  const put = (q: P, col: string) => {
    const x = Math.round(q[0]),
      y = Math.round(q[1]);
    if (x >= 0 && y >= 0 && x < 64 && y < 64) g[y][x] = col;
  };
  if (p.front) {
    put([cx - 2, cy], '#1c1917');
    put([cx + 2, cy], '#1c1917');
  } else {
    // one eye in profile, a bright highlight above it
    const eye = add(p.head, add(mul(p.face, 2.6), mul(p.up, 0.4)));
    put(eye, '#1c1917');
    put(add(eye, mul(p.up, 1)), '#1c1917');
    // a girl's lashes flick out past the eye; her lips catch a touch of color
    if (look?.sex === 'f') {
      put(add(eye, add(mul(p.up, 1.6), mul(p.face, 0.8))), '#1c1917');
      put(add(p.head, add(mul(p.face, 4.2), mul(p.up, -2.6))), '#c4566a');
    }
  }
}

export function drawFigure(p: Pose, c: Colors, look?: Look): Grid {
  const g = grid(64);
  drawArm(g, p.far.arm, c, !p.frontLegs);
  if (!p.front || p.frontLegs || p.showLegs) {
    drawLeg(g, p.far.leg, c, !p.frontLegs);
    drawLeg(g, p.near.leg, c, false);
  }
  // the torso: shirt from shoulders to hips, a belt line at the hip
  if (p.frontLegs) {
    // from the front the chest is shoulder-wide and narrows to the hips
    capsule(g, add(p.shoulder, [-3, 0.5]), add(p.hip, [-1.5, -1]), 3, c.shirt[1]);
    capsule(g, add(p.shoulder, [3, 0.5]), add(p.hip, [1.5, -1]), 3, c.shirt[1]);
  } else if (p.mid) {
    capsule(g, p.shoulder, p.mid, 3.3, c.shirt[1]);
    capsule(g, p.mid, p.hip, 3.3, c.shirt[1]);
  } else capsule(g, p.shoulder, p.hip, 3.3, c.shirt[1]);
  // the near arm is its own outlined layer, so it reads over the torso and head
  const armLayer = grid(64);
  drawArm(armLayer, p.near.arm, c, false);
  const armDone = outline(autoshade(armLayer));
  if (p.headFront) {
    const body = outline(autoshade(g));
    stamp(body, armDone);
    const head = grid(64);
    drawHead(head, p, c, look);
    stamp(body, outline(autoshade(head)));
    return body;
  }
  drawHead(g, p, c, look);
  const body = outline(autoshade(g));
  stamp(body, armDone);
  return body;
}


// ---------- the gym moves: standing, hinging, lying on a bench ----------

/** What you're lifting, seen side on: a barbell's plate end on, a dumbbell's end, a kettlebell. */
export interface Weight {
  kind: 'barbell' | 'dumbbell' | 'kettlebell' | 'medball' | 'plate' | 'stone' | 'wheel' | 'handle';
  at: P;
  /** Drawn behind you (the bar across your back in a squat). */
  behind?: boolean;
}

/** A cable or a band, from where it's anchored to the hand. */
export interface Line {
  from: P;
  to: P;
  kind: 'cable' | 'band' | 'rope';
}

export function drawLine(g: Grid, l: Line) {
  const n = Math.ceil(len(sub(l.to, l.from))) || 1;
  const col = l.kind === 'band' ? ['#ef4444', '#b91c1c'] : l.kind === 'rope' ? ['#c9a46a', '#7c5a32'] : ['#c9ced6', '#6b7280'];
  for (let i = 0; i <= n; i++) {
    const [x, y] = lerp(l.from, l.to, i / n).map(Math.round);
    if (x >= 0 && y >= 0 && x < 64 && y < 64) g[y][x] = col[0];
    if (l.kind !== 'cable' && x + 1 < 64 && y >= 0 && y < 64 && x >= 0) g[y][x + 1] = col[1];
  }
}
export const IRON: Ramp = ['#1f232c', '#353b48', '#5b6373'];

export function drawWeight(g: Grid, w: Weight) {
  const layer = grid(64);
  if (w.kind === 'barbell') {
    // the plate, end on: a dark disc, a raised rim, the bright sleeve in the middle
    capsule(layer, w.at, w.at, 6, IRON[1]);
    capsule(layer, add(w.at, [-0.5, -0.5]), add(w.at, [-0.5, -0.5]), 4.2, IRON[0]);
    capsule(layer, w.at, w.at, 1.2, STEEL[2]);
  } else if (w.kind === 'dumbbell') {
    capsule(layer, w.at, w.at, 2.6, IRON[1]);
    capsule(layer, w.at, w.at, 0.8, STEEL[1]);
  } else if (w.kind === 'medball') {
    capsule(layer, w.at, w.at, 3.6, '#7c3f1d');
    capsule(layer, add(w.at, [-1, -1]), add(w.at, [-1, -1]), 1.2, '#b86b3a');
  } else if (w.kind === 'plate') {
    capsule(layer, w.at, w.at, 4.5, IRON[1]);
    capsule(layer, w.at, w.at, 2.8, IRON[0]);
    capsule(layer, w.at, w.at, 0.8, STEEL[2]);
  } else if (w.kind === 'stone') {
    capsule(layer, w.at, w.at, 6, '#6b6a66');
    capsule(layer, add(w.at, [-2, -2]), add(w.at, [-2, -2]), 2, '#8e8c86');
  } else if (w.kind === 'wheel') {
    capsule(layer, w.at, w.at, 3.2, IRON[0]);
    capsule(layer, w.at, w.at, 1, STEEL[1]);
  } else if (w.kind === 'handle') {
    capsule(layer, add(w.at, [-1, 0]), add(w.at, [1, 0]), 1, STEEL[1]);
  } else {
    // the handle in the hand, the round bell hanging under it
    const down = add(w.at, [0, 4]);
    capsule(layer, add(w.at, [-1.5, 0.5]), add(w.at, [1.5, 0.5]), 0.8, IRON[2]);
    capsule(layer, down, down, 3.4, IRON[1]);
    capsule(layer, add(down, [-1, -1]), add(down, [-1, -1]), 1, IRON[2]);
  }
  stamp(g, outline(layer));
}

/** A standing (or hinging) body from the feet up: the hip placed, the torso tipped `lean`
    radians forward, both legs to the feet by IK, knees bending forward. */
export function standing(hip: P, lean: number, feet: { near: P; far: P }, arms: (shoulder: P, along: P) => { near: Arm; far: Arm }, toes: P = [1, 0.15]): Pose {
  const along: P = [Math.sin(lean), -Math.cos(lean)],
    shoulder = add(hip, mul(along, TORSO));
  const l = leg(hip, feet.near, [1, 0], toes),
    lf = leg(add(hip, [-1, 0]), feet.far, [1, 0], toes);
  const { near, far } = arms(shoulder, along);
  // the head on the neck, looking ahead and a little down as the torso tips
  const face: P = unit(add([1, 0], mul(along, -0.15 + 0.5 * Math.sin(lean)))) as P;
  return {
    head: add(shoulder, add(mul(along, NECK), [1.2, 0])),
    face,
    up: along,
    shoulder,
    hip,
    near: { arm: near, leg: l },
    far: { arm: far, leg: lf },
  };
}

/** The far arm: the near one nudged back a pixel. */
export const farOf = (a: Arm, by: P = [-1, 0]): Arm => ({ shoulder: add(a.shoulder, by), elbow: add(a.elbow, by), hand: add(a.hand, by) });
export const both = (a: Arm, by?: P) => ({ near: a, far: farOf(a, by) });
export const FEET = { near: [32, FLOOR - 1.5] as P, far: [31, FLOOR - 1.5] as P };
