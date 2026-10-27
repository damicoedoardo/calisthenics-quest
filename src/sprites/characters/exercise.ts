import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import { NIGHT, autoshade, grid, mix, outline, rampOf, stamp, type Grid, type Ramp } from '../engine/grid';
import type { Look } from '../engine/figure';
import { HAIR, LINEN, R, SKIN, TROUSERS } from '../palette';

/* Exercise demos: your own hero (skin, hair, armor color) doing each exercise of the program, side
   on, one rep per loop of the 16-frame `rep` clip (holds breathe instead). The figure is a jointed
   skeleton drawn straight at 64x64 from a few lengths, with the elbows and knees found by two-bone
   IK, so the form is exact: a straight body line in a push-up, a full hang at the bottom of a
   pull-up, legs level in an L-sit. Facing right; the near arm and leg are drawn over the far ones. */

export type ExerciseId =
  | 'incline-pushup'
  | 'pushup'
  | 'diamond-pushup'
  | 'dips'
  | 'archer-pushup'
  | 'dead-hang'
  | 'assisted-pullup'
  | 'negatives'
  | 'strict-pullup'
  | 'pullup'
  | 'lsit-pullup'
  | 'knee-raise'
  | 'tuck-lsit'
  | 'one-leg-lsit'
  | 'lsit'
  | 'toes-to-bar';

export const EXERCISES: ExerciseId[] = [
  'incline-pushup',
  'pushup',
  'diamond-pushup',
  'dips',
  'archer-pushup',
  'dead-hang',
  'assisted-pullup',
  'negatives',
  'strict-pullup',
  'pullup',
  'lsit-pullup',
  'knee-raise',
  'tuck-lsit',
  'one-leg-lsit',
  'lsit',
  'toes-to-bar',
];

export interface ExerciseOpts {
  exercise: ExerciseId;
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  look?: Look;
  /** 'front' shows the diamond push-up from the head end, so the hands' diamond shows. */
  view?: 'side' | 'front';
}

type P = [number, number];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const len = (a: P) => Math.hypot(a[0], a[1]);
const unit = (a: P): P => mul(a, 1 / (len(a) || 1));
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** A direction from an angle in degrees: 0 is right, 90 is down (screen y grows downward). */
const dir = (deg: number): P => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];

// body lengths, in sprite pixels
const UPPER = 8,
  FORE = 8,
  THIGH = 10,
  SHIN = 10,
  TORSO = 14,
  NECK = 6;

/** The middle joint of a two-bone limb from a to c, bent toward `toward`. */
function ik(a: P, c: P, l1: number, l2: number, toward: P): P {
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
interface Arm {
  shoulder: P;
  elbow: P;
  hand: P;
}
interface Leg {
  hip: P;
  knee: P;
  foot: P;
  /** Which way the toes point. */
  toes: P;
}
interface Pose {
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
}

const arm = (shoulder: P, hand: P, toward: P, l1 = UPPER, l2 = FORE): Arm => ({ shoulder, hand, elbow: ik(shoulder, hand, l1, l2, toward) });
/** A locked arm's length: the hand exactly a straight arm away (no kink at the elbow). */
const LOCKED = UPPER + FORE - 0.02;
const leg = (hip: P, foot: P, toward: P, toes: P): Leg => ({ hip, foot, toes, knee: ik(hip, foot, THIGH, SHIN, toward) });
/** A straight leg along a direction. */
const straight = (hip: P, d: P, toes: P): Leg => ({ hip, knee: add(hip, mul(d, THIGH)), foot: add(hip, mul(d, THIGH + SHIN)), toes });

// ---------- timing ----------

/** One rep: a beat at the top, down, a beat at the bottom, up. 0 is the start position, 1 the far end. */
const REP = [0, 0, 0.12, 0.35, 0.6, 0.85, 1, 1, 1, 0.85, 0.6, 0.35, 0.12, 0, 0, 0];
/** A negative: jump to the top, lower slowly for five seconds' worth of frames, drop off. */
const NEGATIVE = [0, 0.6, 1, 1, 0.94, 0.87, 0.79, 0.7, 0.61, 0.52, 0.42, 0.32, 0.22, 0.12, 0, 0];
/** Holds breathe: the body settles a pixel for half the loop. */
const breath = (f: number) => (f % 16 >= 8 ? 0.6 : 0);

// ---------- props ----------

const FLOOR = 56;
const STEEL: Ramp = ['#4a5260', '#8a93a1', '#c9ced6'];
const WOOD: Ramp = R.leather;

function props(g: Grid, kind: 'floor' | 'bench' | 'bar' | 'dipbar' | 'parallettes', band?: { from: P; to: P }) {
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

interface Colors {
  skin: Ramp;
  hair: Ramp;
  shirt: Ramp;
  pants: Ramp;
  shoe: string;
}

function colorsFor(o: ExerciseOpts): Colors {
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
function capsule(g: Grid, a: P, b: P, r: number, c: string) {
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

function drawLeg(g: Grid, l: Leg, c: Colors, dim: boolean) {
  const pants = dim ? c.pants[0] : c.pants[1],
    shoe = dim ? mix(c.shoe, NIGHT, 0.4) : c.shoe;
  capsule(g, l.hip, l.knee, 2.2, pants);
  capsule(g, l.knee, l.foot, 1.8, pants);
  capsule(g, l.foot, add(l.foot, mul(l.toes, 2.5)), 1.4, shoe);
}

function drawArm(g: Grid, a: Arm, c: Colors, dim: boolean) {
  const shirt = dim ? c.shirt[0] : c.shirt[1],
    skin = dim ? c.skin[0] : c.skin[1];
  capsule(g, a.elbow, a.hand, 1.4, skin);
  capsule(g, a.hand, a.hand, 1.7, skin);
  capsule(g, a.shoulder, lerp(a.shoulder, a.elbow, 0.4), 1.8, shirt);
  capsule(g, lerp(a.shoulder, a.elbow, 0.4), a.elbow, 1.5, skin);
}

function drawHead(g: Grid, p: Pose, c: Colors, look?: Look) {
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
  if (look && !p.front && (look.style === 'long' || look.style === 'pony')) {
    const back = add(p.head, add(mul(p.face, -3.5), mul(p.up, 2)));
    capsule(g, back, add(back, [-p.face[0] * 2, 7]), 1.6, c.hair[0]);
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
  }
}

function drawFigure(p: Pose, c: Colors, look?: Look): Grid {
  const g = grid(64);
  drawArm(g, p.far.arm, c, true);
  if (!p.front) {
    drawLeg(g, p.far.leg, c, true);
    drawLeg(g, p.near.leg, c, false);
  }
  // the torso: shirt from shoulders to hips, a belt line at the hip
  capsule(g, p.shoulder, p.hip, 3.3, c.shirt[1]);
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

// ---------- the exercises ----------

/** A push-up with the hands on a surface `handY` high, feet on the floor: the body stays one rigid
    line from heels to shoulders and pivots on the toes. d = 0 arms straight, 1 chest near the hands. */
function pushup(d: number, handY: number, feetX: number, elbowsIn: boolean): Pose {
  const handBack = elbowsIn ? 3 : 0;
  // the body line runs through the ankles, lifted on the toes
  const feet: P = [feetX, FLOOR - 3.5],
    body = THIGH + SHIN + TORSO;
  const reach = LOCKED;
  // top: shoulder straight above the hand
  const topRise = handY - reach;
  const topX = feetX + Math.sqrt(body * body - (feet[1] - topRise) ** 2);
  const hand: P = [topX - handBack, handY];
  // bottom: elbows at about 90°, forearms upright, so the shoulders sit a forearm above the hands
  // and the chest stays a few pixels off the floor; the hips never drop out of the line
  const bottomY = handY - FORE,
    bottomX = feetX + Math.sqrt(body * body - (feet[1] - bottomY) ** 2);
  const shoulder = lerp([topX, topRise], [bottomX, bottomY], d);
  const along = unit(sub(shoulder, feet)),
    hip = add(feet, mul(along, THIGH + SHIN)),
    knee = add(feet, mul(along, SHIN));
  const down: P = [along[1], -along[0]].map((v) => -v) as P;
  const faceDown: P = unit(add(down, mul(along, 0.4)));
  const head = add(shoulder, add(mul(along, NECK), mul(down, 0.5)));
  // elbows travel back along the ribs (diamond) or out at 45° (seen from the side, back and up)
  const towardElbow: P = elbowsIn ? unit(add(mul(along, -1), mul(down, -0.2))) : unit(add(mul(along, -0.7), [0, -1]));
  const a = arm(shoulder, hand, towardElbow);
  const l: Leg = { hip, knee, foot: feet, toes: [0.35, 1] };
  return {
    head,
    face: faceDown,
    up: along,
    shoulder,
    hip,
    near: { arm: a, leg: l },
    far: { arm: { ...a, shoulder: add(a.shoulder, [-1, -1]), elbow: add(a.elbow, [-1, -1]), hand: add(a.hand, [-2, 0]) }, leg: { ...l, foot: add(l.foot, [-1, 0]) } },
  };
}

/** Hanging from the bar at y = 9, hands at x = 32. `pull` 0 is a full dead hang, 1 is the chin over
    the bar. `legs` places the legs from the hip. */
function hang(pull: number, legs: (hip: P, shoulder: P) => { near: Leg; far: Leg }, lean = 0): Pose {
  const hand: P = [32, 9.5];
  // bottom: arms locked straight; top: shoulders up at the bar, chest toward it
  const shoulder = lerp([32, hand[1] + LOCKED], [27.5, hand[1] + 1.5], pull);
  const torso = unit([Math.sin(lean), Math.cos(lean)]);
  const hip = add(shoulder, mul(torso, TORSO));
  // the head clears the bar in front of it at the top (chin over), the elbows go down and back
  const head = add(shoulder, [2.5 + pull * 2.5, -NECK - pull]);
  // the forearms stay upright under the bar the whole rep, so the elbow hardly moves while the body
  // rises past it: straight overhead at the bottom, down by the ribs at the top (a wide grip pulls
  // the elbows out to the sides, so from the side the upper arm only looks shorter)
  const a: Arm = { shoulder, hand, elbow: [32 - pull, hand[1] + FORE - 0.5 * pull] };
  const { near, far } = legs(hip, shoulder);
  return {
    head,
    face: [1, 0],
    up: [0, -1],
    shoulder,
    hip,
    near: { arm: a, leg: near },
    far: { arm: { ...a, shoulder: add(a.shoulder, [-1, 0]), elbow: add(a.elbow, [-1, 0]), hand: add(a.hand, [-2, 0]) }, leg: far },
    // low in the hang the arms pass behind the head (the far side of it, by the ears); high up the
    // head is in front of the bar and the near forearm only brushes the back of it
    headFront: pull < 0.35,
  };
}

const hangingLegs = (hip: P): { near: Leg; far: Leg } => ({ near: straight(hip, [0.05, 1], [1, 0.3]), far: straight(add(hip, [-1, 0]), [0.05, 1], [1, 0.3]) });

/** Pressed up on the parallettes (seen end on, hands at y = 47): arms locked straight, shoulders
    pushed down and a little ahead of the hands, hips between the hands at hand height. */
function support(b: number, legs: (hip: P) => { near: Leg; far: Leg }): Pose {
  const hand: P = [33.5, 46.5];
  // shoulders lean ahead of the hands and the hips sit back behind them, clear of the grips
  const shoulder: P = add(hand, [2.2, -Math.sqrt(LOCKED * LOCKED - 2.2 * 2.2) + b]);
  const hip = add(shoulder, mul(unit([-7, 12.5]), TORSO));
  const a = arm(shoulder, hand, [-1, 0]);
  const { near, far } = legs(hip);
  return {
    head: add(shoulder, [1.5, -NECK]),
    face: [1, 0],
    up: [0, -1],
    shoulder,
    hip,
    near: { arm: a, leg: near },
    far: { arm: { ...a, shoulder: add(a.shoulder, [-1, 0]), elbow: add(a.elbow, [-1, 0]), hand: add(a.hand, [-1, 0]) }, leg: far },
  };
}

const levelLeg = (hip: P): Leg => straight(hip, [1, 0], [0.4, -1]);
const tuckLeg = (hip: P): Leg => {
  const knee = add(hip, mul(unit([1, -0.45]), THIGH));
  return { hip, knee, foot: add(knee, [0.5, SHIN]), toes: [1, 0.3] };
};

/** Front view of the archer push-up: hands wide on the floor, the shoulders slide over one hand
    while that arm bends and the other stays straight. s from -1 (over the left hand) to 1. */
function archer(s: number, depth: number): Pose {
  // seen from the front the arms don't foreshorten: 11 + 11 pixels, hands very wide
  const top: P = [32, 37.5],
    low: P = [32 + s * 8, 48];
  const c = lerp(top, low, depth);
  const ls: P = add(c, [-6, 0]),
    rs: P = add(c, [6, 0]);
  const lh: P = [14, FLOOR - 1],
    rh: P = [50, FLOOR - 1];
  const left = arm(ls, lh, [-1, -0.8], 11, 11),
    right = arm(rs, rh, [1, -0.8], 11, 11);
  // legs run away from the camera: a short, low shape behind the shoulders
  const hip = add(c, [0, -3]);
  const far = (x: number): Leg => ({ hip, knee: [32 + x, 50], foot: [32 + x * 1.2, FLOOR - 1], toes: [0, 1] });
  return {
    front: true,
    head: add(c, [0, 1]),
    face: [0, 1],
    up: [0, -1],
    shoulder: c,
    hip: add(c, [0, -2]),
    near: { arm: s < 0 ? right : left, leg: far(2) },
    far: { arm: s < 0 ? left : right, leg: far(-2) },
  };
}

/** Front view of the diamond push-up: the hands together under the chest, thumbs and fingers
    touching; the elbows bend back along the ribs, so from the front they only edge out a little
    and the upper arms look short. d = 0 arms straight, 1 chest just above the hands. */
function diamondFront(d: number): Pose {
  const c = lerp([32, 37.5], [32, 47], d);
  const ls: P = add(c, [-6, 0]),
    rs: P = add(c, [6, 0]);
  const lh: P = [30, FLOOR - 1],
    rh: P = [34, FLOOR - 1];
  // upper arms foreshortened (they point back, away from us), forearms seen full length
  const left = arm(ls, lh, [-1, -0.6], 7, 11),
    right = arm(rs, rh, [1, -0.6], 7, 11);
  const hip = add(c, [0, -3]);
  const far = (x: number): Leg => ({ hip, knee: [32 + x, 50], foot: [32 + x * 1.2, FLOOR - 1], toes: [0, 1] });
  return {
    front: true,
    // the head held in line with the back: from the front it sits just over the shoulders, so the
    // hands stay in view under the chest
    head: add(c, [0, -3.5]),
    face: [0, 1],
    up: [0, -1],
    shoulder: c,
    hip: add(c, [0, -2]),
    near: { arm: left, leg: far(2) },
    far: { arm: right, leg: far(-2) },
  };
}

function poseFor(id: ExerciseId, f: number, view: ExerciseOpts['view'] = 'side'): { pose: Pose; props: Parameters<typeof props>[1]; band?: { from: P; to: P } } {
  const d = REP[f % 16],
    b = breath(f);
  switch (id) {
    case 'incline-pushup':
      return { pose: pushup(d, 44, 4, false), props: 'bench' };
    case 'pushup':
      return { pose: pushup(d, FLOOR - 1, 8, false), props: 'floor' };
    case 'diamond-pushup':
      return { pose: view === 'front' ? diamondFront(d) : pushup(d, FLOOR - 1, 8, true), props: 'floor' };
    case 'archer-pushup': {
      const half = f % 16 < 8 ? -1 : 1,
        k = REP[(f % 8) * 2];
      return { pose: archer(half, k), props: 'floor' };
    }
    case 'dips': {
      // straight-arm support on the bars down to elbows at 90°, leaning a little forward
      const hand: P = [32, 30];
      // bottom: upper arms about level with the floor, elbows back, forearms upright over the hands
      const shoulder = lerp([32, hand[1] - LOCKED], [36, hand[1] - FORE + 1], d);
      const lean = 0.18 + 0.15 * d;
      const hip = add(shoulder, mul([-Math.sin(lean), Math.cos(lean)], TORSO));
      const a = arm(shoulder, hand, [-1, -0.4]);
      // knees bent, feet crossed behind
      const knee = add(hip, [1.5, THIGH - 0.5]),
        foot = add(knee, mul(unit([-1, 0.35]), SHIN));
      const l: Leg = { hip, knee, foot, toes: [-0.3, 1] };
      return {
        pose: {
          head: add(shoulder, [2 + d, -NECK + 0.5]),
          face: [1, 0.15],
          up: [0, -1],
          shoulder,
          hip,
          near: { arm: a, leg: l },
          far: { arm: { ...a, shoulder: add(a.shoulder, [-1, 0]), elbow: add(a.elbow, [-1, 0]), hand: add(a.hand, [-1, 0]) }, leg: { ...l, foot: add(foot, [1, 1]) } },
        },
        props: 'dipbar',
      };
    }
    case 'dead-hang':
      return { pose: hang(0.04 * b, hangingLegs), props: 'bar' };
    case 'strict-pullup':
    case 'pullup':
      return { pose: hang(d, hangingLegs), props: 'bar' };
    case 'negatives':
      return { pose: hang(NEGATIVE[f % 16], hangingLegs), props: 'bar' };
    case 'assisted-pullup': {
      const pose = hang(d, (hip) => {
        // knees bent at 90° into a band, shins back
        const knee = add(hip, [1, THIGH]);
        const l: Leg = { hip, knee, foot: add(knee, [-SHIN, 0.5]), toes: [0, 1] };
        return { near: l, far: { ...l, foot: add(l.foot, [0, 1]) } };
      });
      return { pose, props: 'bar', band: { from: [29, 10], to: add(pose.near.leg.knee, [-1, 2]) } };
    }
    case 'lsit-pullup':
      return { pose: hang(d, (hip) => ({ near: levelLeg(hip), far: levelLeg(add(hip, [-1, 0])) })), props: 'bar' };
    case 'knee-raise':
      return {
        pose: hang(0, (hip) => {
          // thighs from hanging straight down to above level; shins hang below the knees
          const knee = add(hip, mul(dir(90 - 105 * d), THIGH));
          const foot = add(knee, mul(unit([0.15 + 0.5 * d, 1]), SHIN));
          const l: Leg = { hip, knee, foot, toes: [1, 0] };
          return { near: l, far: { ...l, knee: add(knee, [-1, 0]), foot: add(foot, [-1, 0]) } };
        }),
        props: 'bar',
      };
    case 'toes-to-bar': {
      // the body swings its hips forward and the straight legs rise until the toes reach the bar
      const lean = 0.95 * d;
      const pose = hang(0.08 * d, (hip) => {
        const a = 90 - 168 * d;
        return { near: straight(hip, dir(a), dir(a - 90)), far: straight(add(hip, [-1, 0]), dir(a), dir(a - 90)) };
      }, lean);
      return { pose, props: 'bar' };
    }
    case 'tuck-lsit':
      return { pose: support(b, (hip) => ({ near: tuckLeg(hip), far: tuckLeg(add(hip, [-1, 0])) })), props: 'parallettes' };
    case 'one-leg-lsit':
      return { pose: support(b, (hip) => ({ near: levelLeg(hip), far: tuckLeg(add(hip, [-1, 0])) })), props: 'parallettes' };
    case 'lsit':
      return { pose: support(b, (hip) => ({ near: levelLeg(hip), far: levelLeg(add(hip, [-1, 0])) })), props: 'parallettes' };
  }
}

/** One frame of an exercise demo: the props, then you on them. */
export function drawExercise(o: ExerciseOpts, f: number): Grid {
  const { pose, props: kind, band } = poseFor(o.exercise, f, o.view);
  const g = grid(64);
  props(g, kind);
  const fig = drawFigure(pose, colorsFor(o), o.look);
  stamp(g, fig);
  // the band goes in front of the shins, over the figure
  if (band) props(g, 'bar', band);
  return g;
}
