import type { Grid } from '../engine/grid';
import {
  FEET,
  FLOOR,
  FORE,
  LOCKED,
  NECK,
  REP,
  SHIN,
  STEEL,
  THIGH,
  TORSO,
  UPPER,
  WOOD,
  add,
  arm,
  both,
  breath,
  capsule,
  dir,
  farOf,
  leg,
  lerp,
  mul,
  standing,
  straight,
  sub,
  unit,
  type Arm,
  type Leg,
  type Line,
  type P,
  type Pose,
  type Props,
  type Weight,
} from '../engine/skeleton';

/* The exercise library's demos: one animation per movement (a squat, a hinge, a row, a stretch...),
   each drawn with whatever the exercise uses (`Kit`): a barbell's plate end on, a dumbbell, a
   kettlebell, a cable from a pulley tower, a band, a machine, a medicine ball. The 870+ exercises
   of the catalog are sorted into these movements in src/exercises/classify.ts. One rep per loop
   of the 16-frame `rep` clip; holds and stretches breathe. Side on, facing right, except the few
   that only read from the front (a lateral raise, a side bend, a jumping jack). */

export type Kit = 'none' | 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'band' | 'machine' | 'medball' | 'plate' | 'ball' | 'roller' | 'stone';

export const KITS: Kit[] = ['none', 'barbell', 'dumbbell', 'kettlebell', 'cable', 'band', 'machine', 'medball', 'plate', 'ball', 'roller', 'stone'];

export const MOVES = [
  // legs
  'squat',
  'barbell-squat',
  'front-squat',
  'overhead-squat',
  'lunge',
  'step-up',
  'leg-press',
  'leg-extension',
  'leg-curl',
  'calf-raise',
  'bridge',
  'deadlift',
  'rdl',
  'good-morning',
  'kettlebell-swing',
  'kickback-glute',
  'side-leg-raise',
  'back-extension',
  'jump',
  // push
  'bench-press',
  'chest-fly',
  'shoulder-press',
  'push-press',
  'lateral-raise',
  'front-raise',
  'rear-delt-fly',
  'upright-row',
  'shrug',
  'triceps-pushdown',
  'triceps-overhead',
  'skull-crusher',
  'triceps-kickback',
  'bench-dip',
  'handstand-pushup',
  'press-out',
  // pull
  'barbell-row',
  'inverted-row',
  'lat-pulldown',
  'seated-row',
  'straight-arm-pulldown',
  'curl',
  'pullover',
  'wrist-curl',
  'carry',
  // core
  'plank',
  'side-plank',
  'crunch',
  'sit-up',
  'leg-raise',
  'dead-bug',
  'russian-twist',
  'mountain-climber',
  'ab-rollout',
  'cable-crunch',
  'side-bend',
  'woodchop',
  'windmill',
  // power and conditioning
  'clean',
  'snatch',
  'slam',
  'battle-ropes',
  'sled-push',
  'run',
  'bike',
  'rower',
  'jump-rope',
  'star-jump',
  // stretching and mobility
  'reach-stretch',
  'toe-touch',
  'quad-stretch',
  'seated-stretch',
  'knee-hug',
  'lunge-stretch',
  'calf-stretch',
  'arm-stretch',
  'cat-cow',
  'child-pose',
  'foam-roll',
  'circles',
  'neck',
  'balance',
] as const;

export type MoveId = (typeof MOVES)[number];

/** One frame of a move, before the kit is put in the hands. */
interface Frame {
  pose: Pose;
  props?: Props;
  /** Scenery drawn behind you (a machine's seat, a box, a wall). */
  scene?: (g: Grid) => void;
  /** Drawn over you (a pad over the shins, a rope's wave). */
  over?: (g: Grid) => void;
  /** Where the kit goes: the near hand unless said otherwise. */
  hold?: P;
  /** The barbell across the back (squat, good morning): drawn behind you. */
  backBar?: boolean;
  /** Where a cable or band comes from. */
  anchor?: P;
  /** This move draws its own machine: no pulley tower for kit 'machine'. */
  ownMachine?: boolean;
}

export interface MoveDrawing {
  pose: Pose;
  props: Props;
  scene?: (g: Grid) => void;
  over?: (g: Grid) => void;
  weights: Weight[];
  lines: Line[];
}

// ---------- drawing helpers for scenery ----------

const put = (g: Grid, x: number, y: number, c: string) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < 64 && y < 64) g[y][x] = c;
};
const rect = (g: Grid, x0: number, y0: number, x1: number, y1: number, c: string) => {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) put(g, x, y, c);
};
const PAD = ['#3b2a1e', '#5a3d2a', '#7a5638'];

/** A cable machine's tower at the right edge, with the pulley at `at`. */
function tower(g: Grid, at: P) {
  // a pulley out over you hangs from a beam off the top of the tower
  if (at[0] < 56) rect(g, at[0], at[1] - 1, 60, at[1] - 1, STEEL[0]);
  rect(g, 59, 2, 61, FLOOR, STEEL[0]);
  rect(g, 60, 2, 60, FLOOR, STEEL[1]);
  // the weight stack
  rect(g, 57, FLOOR - 12, 62, FLOOR, '#2b2f3a');
  for (let y = FLOOR - 11; y < FLOOR; y += 3) rect(g, 57, y, 62, y, '#4a5260');
  capsule(g, at, at, 1.6, STEEL[2]);
}

/** A plyo box or step: x from x0 to x1, top at y. */
const box = (g: Grid, x0: number, x1: number, y: number) => {
  rect(g, x0, y, x1, FLOOR, WOOD[1]);
  rect(g, x0, y, x1, y, WOOD[2]);
  rect(g, x0, y + 1, x0, FLOOR, WOOD[0]);
};

/** A padded seat or bench top from a to b. */
const pad = (g: Grid, a: P, b: P, r = 1.8) => {
  capsule(g, a, b, r, PAD[1]);
  capsule(g, add(a, [0, -0.8]), add(b, [0, -0.8]), r * 0.5, PAD[2]);
};

const wall = (g: Grid, x: number) => {
  rect(g, x, 0, 63, FLOOR, '#2a2e3a');
  rect(g, x, 0, x, FLOOR, '#3a3f4d');
};

// ---------- body builders ----------

const STAND: P = [30, 35.5];
const hangArm = (shoulder: P, fwd = 0.5): Arm => arm(shoulder, add(shoulder, [fwd, LOCKED]), [-1, 0]);
/** Elbows pinned at the sides, the forearm at an angle (degrees: 90 hangs down, 0 points ahead). */
const forearm = (shoulder: P, deg: number, upperDeg = 88): Arm => {
  const elbow = add(shoulder, mul(dir(upperDeg), UPPER));
  return { shoulder, elbow, hand: add(elbow, mul(dir(deg), FORE)) };
};
/** A straight arm at an angle; `short` foreshortens it when it swings toward or away from you. */
const straightArm = (shoulder: P, deg: number, short = 1): Arm => {
  const hand = add(shoulder, mul(dir(deg), LOCKED * short));
  return { shoulder, hand, elbow: lerp(shoulder, hand, 0.5) };
};
const stand = (arms: (shoulder: P, along: P) => { near: Arm; far: Arm }, lean = 0.03, hip: P = STAND) => standing(hip, lean, FEET, arms);

/** Lying on your back along the floor (or a bench top at `y`), head to the right. */
function supine(shoulder: P, hip: P, arms: { near: Arm; far: Arm }, legs: { near: Leg; far: Leg }, face: P = [0, -1]): Pose {
  const along = unit(sub(shoulder, hip));
  return {
    head: add(shoulder, mul(along, NECK)),
    face,
    up: along,
    shoulder,
    hip,
    near: { arm: arms.near, leg: legs.near },
    far: { arm: arms.far, leg: legs.far },
  };
}

/** Lying face down, head to the right. */
function prone(shoulder: P, hip: P, arms: { near: Arm; far: Arm }, legs: { near: Leg; far: Leg }): Pose {
  return supine(shoulder, hip, arms, legs, [0, 1]);
}

/** Seen from the front, standing: arms from each shoulder, legs a little apart. */
function frontStand(o: { hipY?: number; spread?: number; tilt?: number; right: (s: P) => Arm; left: (s: P) => Arm; rightLeg?: (h: P) => Leg; leftLeg?: (h: P) => Leg }): Pose {
  const hipY = o.hipY ?? 35.5,
    tilt = o.tilt ?? 0,
    spread = o.spread ?? 3;
  const hip: P = [32, hipY];
  const shoulder: P = add(hip, mul(dir(-90 + tilt), TORSO));
  const side: P = dir(tilt);
  const rs = add(shoulder, mul(side, 6)),
    ls = add(shoulder, mul(side, -6));
  const rh = add(hip, [2, 0]),
    lh = add(hip, [-2, 0]);
  return {
    front: true,
    frontLegs: true,
    head: add(shoulder, mul(dir(-90 + tilt), NECK + 0.5)),
    face: [0, 1],
    up: dir(-90 + tilt),
    shoulder,
    hip,
    near: { arm: o.right(rs), leg: o.rightLeg ? o.rightLeg(rh) : leg(rh, [32 + spread, FLOOR - 1.5], [1, 0], [0.8, 0.1]) },
    far: { arm: o.left(ls), leg: o.leftLeg ? o.leftLeg(lh) : leg(lh, [32 - spread, FLOOR - 1.5], [-1, 0], [-0.8, 0.1]) },
  };
}
const mirror = (a: Arm, cx = 32): Arm => ({ shoulder: [2 * cx - a.shoulder[0], a.shoulder[1]], elbow: [2 * cx - a.elbow[0], a.elbow[1]], hand: [2 * cx - a.hand[0], a.hand[1]] });

/** Seated upright: hips on a seat at `hip`, thighs ahead, shins down to the floor. */
function seated(hip: P, lean: number, arms: (shoulder: P, along: P) => { near: Arm; far: Arm }, foot?: P): Pose {
  const along: P = [Math.sin(lean), -Math.cos(lean)],
    shoulder = add(hip, mul(along, TORSO));
  const knee = add(hip, [THIGH, 0]),
    f = foot ?? add(knee, [0.5, SHIN]);
  const l = leg(hip, f, [1, -0.3], [1, 0.1]);
  const { near, far } = arms(shoulder, along);
  return {
    head: add(shoulder, add(mul(along, NECK), [1, 0])),
    face: unit([1, 0.1 + 0.4 * Math.sin(lean)]),
    up: along,
    shoulder,
    hip,
    near: { arm: near, leg: l },
    far: { arm: far, leg: { ...l, hip: add(l.hip, [-1, 0]), knee: add(l.knee, [-1, 0]), foot: add(l.foot, [-1, 0]) } },
  };
}

/** On hands and knees: knees under the hips, hands under the shoulders. */
function allFours(sag = 0): Pose {
  const knee: P = [24, FLOOR - 1.5],
    hip: P = [24.5, FLOOR - 1.5 - THIGH],
    hand: P = [39, FLOOR - 1.5];
  const shoulder: P = [39, FLOOR - 1.5 - LOCKED];
  const mid = add(lerp(hip, shoulder, 0.5), [0, sag]);
  const a = arm(shoulder, hand, [-1, 0]);
  const l: Leg = { hip, knee, foot: [14, FLOOR - 1.5], toes: [-0.3, 1] };
  return {
    head: add(shoulder, [5.5, -1 - sag * 0.5]),
    face: unit([1, 0.6 + sag * 0.1]),
    up: unit(sub(shoulder, hip)),
    shoulder,
    hip,
    mid,
    near: { arm: a, leg: l },
    far: { arm: farOf(a), leg: { ...l, knee: add(knee, [-1, 0]), foot: add(l.foot, [-1, 0]) } },
  };
}

/** The squat's body for a depth d and a torso that tips a little more as you sit back. */
function squatBody(d: number, arms: (shoulder: P, along: P) => { near: Arm; far: Arm }, extraLean = 0): Pose {
  const hip = lerp([30, FLOOR - 1.5 - THIGH - SHIN + 0.4], [21, FLOOR - 1.5 - SHIN + 1], d);
  return standing(hip, 0.08 + (0.45 + extraLean) * d, FEET, arms);
}

/** The deadlift's hinge: d = 0 standing tall, 1 at the floor, arms hanging straight. */
function hingeBody(d: number, stiff = false): Pose {
  const hip = stiff ? lerp([29, 35.5], [26, 36.5], d) : lerp([29, 35.5], [23, 40], d);
  return standing(hip, 0.06 + (stiff ? 1.2 : 1.1) * d, FEET, (shoulder) => both(hangArm(shoulder)));
}

/** A lunge's split stance; d from standing tall to both knees at 90°. */
function lungeBody(d: number, arms: (shoulder: P, along: P, hip: P) => { near: Arm; far: Arm }): Pose {
  const hip = lerp([28, 36.5], [28, 45.5], d);
  return standing(hip, 0.03, { near: [38, FLOOR - 1.5], far: [17, FLOOR - 2] }, (s, a) => arms(s, a, hip));
}

/** A run's legs at phase t (0-1): the near and far legs half a stride apart. */
function strideLeg(hip: P, t: number, size = 1): Leg {
  const a = Math.sin(t * 2 * Math.PI);
  const thigh = 90 - 35 * a * size,
    bend = 20 + 70 * Math.max(0, Math.cos(t * 2 * Math.PI + 0.6)) * size;
  const knee = add(hip, mul(dir(thigh), THIGH));
  const foot = add(knee, mul(dir(thigh + bend), SHIN));
  return { hip, knee, foot, toes: [1, 0.2] };
}

// ---------- the moves ----------

function frame(id: MoveId, kit: Kit, f: number): Frame {
  const d = REP[f % 16],
    b = breath(f),
    t = (f % 16) / 16,
    // a swing never stops: one smooth arc per loop
    s = (1 - Math.cos(2 * Math.PI * t)) / 2,
    // the second half of the loop is the other side
    second = f % 16 >= 8,
    half = REP[(f % 8) * 2];
  switch (id) {
    // ----- legs -----
    case 'squat': {
      if (kit === 'barbell' || kit === 'machine') return backSquat(d, kit);
      if (kit === 'dumbbell') return { pose: squatBody(d, (sh) => both(hangArm(sh, 2 + 3 * d))) };
      if (kit === 'band') return { pose: squatBody(d, (sh) => both(arm(sh, add(sh, [3, 2]), [0, 1]))), anchor: [33, FLOOR - 1] };
      if (kit !== 'none') {
        // goblet: the weight held at the chest, elbows down
        let hold: P = [0, 0];
        const pose = squatBody(d, (sh, along) => {
          hold = add(sh, add(mul(along, -3), [5, 0]));
          return both(arm(sh, add(hold, [-1, 0]), [0, 1]));
        });
        return { pose, hold, anchor: [58, FLOOR - 3] };
      }
      return { pose: squatBody(d, (sh) => both(arm(sh, add(sh, mul(dir(70 - 60 * d), LOCKED)), [0, 1]))) };
    }
    case 'barbell-squat':
      return backSquat(d, kit);
    case 'front-squat': {
      // the bar rests on the front of the shoulders, elbows high and forward
      let hold: P = [0, 0];
      const pose = squatBody(
        d,
        (sh, along) => {
          hold = add(sh, add(mul(along, 1), [3.5, 0]));
          return both(arm(sh, add(hold, [-1, 1]), [1, 0.2], 7, 6));
        },
        -0.2,
      );
      return { pose, hold, backBar: true };
    }
    case 'overhead-squat': {
      let hold: P = [0, 0];
      const pose = squatBody(
        d,
        (sh) => {
          hold = add(sh, [-1.5 - 2 * d, -LOCKED]);
          return both(arm(sh, hold, [1, 0]));
        },
        -0.1,
      );
      return { pose, hold };
    }
    case 'lunge': {
      if (kit === 'barbell' || kit === 'machine') {
        let hold: P = [0, 0];
        const pose = lungeBody(d, (sh, along) => {
          hold = add(sh, add(mul(along, 0.5), [-2.5, 0]));
          return both(arm(sh, add(hold, [1, 0]), [-0.6, 1], 6, 7));
        });
        return { pose, hold };
      }
      if (kit === 'none' || kit === 'ball') return { pose: lungeBody(d, (sh, _a, hip) => both(arm(sh, add(hip, [3, -1]), [-1, 0]))) };
      return { pose: lungeBody(d, (sh) => both(hangArm(sh, 1))), anchor: [38, FLOOR - 1] };
    }
    case 'step-up': {
      // up onto a box with the front foot, the back foot follows to stand tall, then down again
      const top: P = [42, 44.5];
      const hip = lerp([31, 37], [40.5, top[1] - THIGH - SHIN + 0.5], d);
      const farFoot = lerp([26, FLOOR - 1.5], [39, top[1]], Math.max(0, d * 1.6 - 0.6));
      const pose = standing(hip, 0.12 - 0.08 * d, { near: top, far: farFoot }, (sh) => (kit === 'none' ? both(arm(sh, add(sh, mul(dir(80 - 50 * d), LOCKED)), [-1, 0])) : both(hangArm(sh, 1))));
      return { pose, scene: (g) => box(g, 36, 50, 46), anchor: [42, 46] };
    }
    case 'leg-press': {
      // reclined in the sled, feet on the plate pushing up and away
      const hip: P = [22, 46],
        along = unit([-0.8, -0.6]),
        shoulder = add(hip, mul(along, TORSO)),
        push = unit([0.75, -0.66]);
      const foot = add(hip, mul(push, 11 + 8.3 * (1 - d)));
      const near = leg(hip, foot, [-0.2, -1], [0.66, 0.75]);
      const a = arm(shoulder, add(hip, [3, 0]), [0, 1]);
      const perp: P = [0.66, 0.75];
      return {
        pose: {
          head: add(shoulder, mul(along, NECK)),
          face: unit([0.9, -0.1]),
          up: along,
          shoulder,
          hip,
          near: { arm: a, leg: near },
          far: { arm: farOf(a), leg: { ...near, knee: add(near.knee, [-1, 0]), foot: add(near.foot, [-1, 0]) } },
        },
        ownMachine: true,
        scene: (g) => {
          pad(g, [6, 32], [21, 47], 2);
          rect(g, 10, 48, 30, FLOOR, STEEL[0]);
          // the sled's rails, up and to the right
          capsule(g, [30, 52], [60, 25], 1, STEEL[0]);
        },
        over: (g) => capsule(g, add(foot, mul(perp, -6)), add(add(foot, [1.2, 1]), mul(perp, 6)), 1.3, STEEL[1]),
        hold: kit === 'machine' ? add(foot, [4, -2]) : undefined,
      };
    }
    case 'leg-extension': {
      const hip: P = [24, 41];
      const knee: P = [34, 41];
      const foot = add(knee, mul(dir(95 - 95 * d), SHIN));
      const pose = seated(hip, -0.05, (sh) => both(arm(sh, [26, 43], [0, 1])), foot);
      pose.near.leg = { hip, knee, foot, toes: dir(5 - 95 * d) };
      pose.far.leg = { hip: add(hip, [-1, 0]), knee: add(knee, [-1, 0]), foot: add(foot, [-1, 0]), toes: dir(5 - 95 * d) };
      return {
        pose,
        ownMachine: true,
        scene: (g) => {
          pad(g, [14, 43.5], [34, 43.5], 1.6);
          pad(g, [18, 26], [17, 42], 1.8);
          rect(g, 20, 46, 22, FLOOR, STEEL[0]);
        },
        over: (g) => capsule(g, add(foot, [1.5, -1]), add(foot, [1.5, -1]), 2, PAD[1]),
        hold: kit === 'machine' ? undefined : add(foot, [1, 1]),
      };
    }
    case 'leg-curl': {
      // face down on the bench, heels curl up toward the glutes
      const shoulder: P = [44, 40.5],
        hip: P = [29, 40.5];
      const knee: P = [19, 41];
      const foot = add(knee, mul(dir(180 + 95 * d), SHIN));
      const a = arm(shoulder, [51, 45], [0, -1]);
      const l: Leg = { hip, knee, foot, toes: dir(270 + 95 * d) };
      return {
        pose: prone(shoulder, hip, both(a), { near: l, far: { ...l, hip: add(hip, [0, -1]), knee: add(knee, [0, -1]), foot: add(foot, [0, -1]) } }),
        props: 'flatbench',
        ownMachine: true,
        over: (g) => capsule(g, add(foot, [0.5, -2]), add(foot, [0.5, -2]), 1.8, PAD[1]),
        hold: kit === 'machine' ? undefined : add(foot, [0, -2]),
        anchor: [2, 42],
      };
    }
    case 'calf-raise': {
      const rise = 2.5 * d;
      const pose = standing(add(STAND, [0, -rise]), 0.03, { near: add(FEET.near, [0, -rise]), far: add(FEET.far, [0, -rise]) }, (sh, along) => {
        if (kit === 'barbell' || kit === 'machine') return both(arm(sh, add(sh, add(mul(along, 0.5), [-1.5, 0])), [-0.6, 1], 6, 7));
        return both(hangArm(sh, 1));
      }, unit([1, 0.15 + 0.9 * d]));
      return { pose, hold: kit === 'barbell' || kit === 'machine' ? add(pose.shoulder, [-2.5, 0.5]) : undefined, backBar: kit === 'barbell', anchor: [33, FLOOR - 1] };
    }
    case 'bridge': {
      // on your back, knees bent, hips drive up into one line from shoulders to knees
      const shoulder: P = [46, FLOOR - 3],
        foot: P = [22, FLOOR - 1.5];
      const hip = lerp([32, FLOOR - 3], [33, 44], d);
      const l = leg(hip, foot, [0, -1], [1, 0.1]);
      const a = arm(shoulder, [37, FLOOR - 1.5], [0, 1]);
      return {
        pose: supine(shoulder, hip, both(a), { near: l, far: { ...l, foot: add(foot, [-1, 0]) } }),
        hold: add(hip, [0, -4]),
        anchor: [20, FLOOR - 1],
      };
    }
    case 'deadlift': {
      const pose = hingeBody(d);
      const hand = pose.near.arm.hand;
      return { pose, hold: kit === 'barbell' || kit === 'stone' ? [hand[0], Math.min(hand[1], FLOOR - (kit === 'stone' ? 6 : 5.5))] : hand, anchor: [52, FLOOR - 1] };
    }
    case 'rdl': {
      const pose = hingeBody(d * 0.8, true);
      return { pose, hold: pose.near.arm.hand, anchor: [52, FLOOR - 1] };
    }
    case 'good-morning': {
      let hold: P = [0, 0];
      const pose = standing(lerp([29.5, 35.5], [25, 37], d), 0.05 + 1.15 * d, FEET, (sh, along) => {
        hold = add(sh, add(mul(along, 0.5), mul([along[1], -along[0]].map((v) => -v) as P, -2.5)));
        return both(arm(sh, add(hold, [0.5, 0.5]), [-0.6, 1], 6, 7));
      });
      return { pose, hold, backBar: true, anchor: [33, FLOOR - 1] };
    }
    case 'kettlebell-swing': {
      let hand: P = [0, 0];
      const hip = lerp([22, 38.5], [29, 35.5], s);
      const pose = standing(hip, 0.95 - 0.92 * s, FEET, (sh) => {
        hand = add(sh, mul(dir(105 - 105 * s), LOCKED));
        return both(arm(sh, hand, [0, -1]));
      });
      return { pose, hold: hand, anchor: [8, FLOOR - 2] };
    }
    case 'kickback-glute': {
      const pose = allFours();
      const hip = pose.hip;
      const th = 90 + 100 * d;
      const knee = add(hip, mul(dir(th), THIGH));
      pose.near.leg = { hip, knee, foot: add(knee, mul(dir(th + 90), SHIN)), toes: dir(th) };
      return { pose, hold: add(pose.near.leg.foot, [0, 0]), anchor: [8, FLOOR - 1] };
    }
    case 'side-leg-raise': {
      const pose = frontStand({
        right: (sh) => arm(sh, add(sh, [4, 13]), [1, 0]),
        left: (sh) => arm(sh, add(sh, [-4, 13]), [-1, 0]),
        rightLeg: (h) => straight(h, dir(85 - 45 * d), [0.8, 0.1]),
        tilt: -6 * d,
      });
      return { pose, hold: pose.near.leg.foot, anchor: [28, FLOOR - 1] };
    }
    case 'back-extension': {
      // hips on the pad, heels hooked, the torso from hanging down to one line with the legs
      const hip: P = [30, 37];
      const shoulder = add(hip, mul(dir(95 - 140 * d), TORSO));
      const along = unit(sub(shoulder, hip));
      const legs = { near: straight(hip, unit([-0.75, 0.66]), [0, 1]), far: straight(add(hip, [-1, 0]), unit([-0.75, 0.66]), [0, 1]) };
      const a = arm(shoulder, add(shoulder, mul(along, -5)), [along[1], -along[0]]);
      return {
        pose: {
          head: add(shoulder, mul(along, NECK)),
          face: unit([along[1] * -1 + along[0] * 0.3, along[0] + along[1] * 0.3]) as P,
          up: along,
          shoulder,
          hip,
          near: { arm: a, leg: legs.near },
          far: { arm: farOf(a), leg: legs.far },
        },
        ownMachine: true,
        scene: (g) => {
          pad(g, [27, 39.5], [33, 39.5], 2);
          capsule(g, [30, 41], [16, FLOOR], 1.2, STEEL[0]);
          pad(g, [13, 52], [13, 52], 1.6);
        },
        hold: add(shoulder, mul(along, -3)),
      };
    }
    case 'jump': {
      // dip, leap with the arms, land soft
      const air = f % 16 >= 6 && f % 16 <= 10 ? Math.sin(((f % 16) - 5) / 6 * Math.PI) * 9 : 0;
      const dip = f % 16 < 6 ? REP[(f % 16) + 2] * 0.6 : f % 16 > 10 ? 0.5 * (1 - ((f % 16) - 10) / 5) : 0;
      const pose = squatBody(dip, (sh) => both(straightArm(sh, air > 0 ? -70 : 110 - 60 * dip)));
      return { pose: lift(pose, air) };
    }
    // ----- push -----
    case 'bench-press': {
      const shoulder: P = [40, 40.5],
        hip: P = [26, 41];
      const top: P = kit === 'dumbbell' ? [40, shoulder[1] - LOCKED] : [39.5, shoulder[1] - LOCKED];
      const hand = lerp(top, kit === 'dumbbell' ? [38, 36] : [36.5, 34.5], d);
      const a = arm(shoulder, hand, [-0.2, 1]);
      const l = leg(hip, [14, FLOOR - 1.5], [0, -1], [1, 0.2]);
      return {
        pose: supine(shoulder, hip, { near: a, far: farOf(a, [-1, -0.5]) }, { near: l, far: leg(add(hip, [-1, 0]), [12, FLOOR - 1.5], [0, -1], [1, 0.2]) }),
        props: 'flatbench',
        hold: add(hand, [0, -0.5]),
        anchor: [40, FLOOR - 1],
      };
    }
    case 'chest-fly': {
      // arms open wide in an arc: from the side they shorten as they swing out
      const shoulder: P = [40, 40.5],
        hip: P = [26, 41];
      const a = straightArm(shoulder, -90, 1 - 0.75 * d);
      a.elbow = add(lerp(a.shoulder, a.hand, 0.5), [-1, 0]);
      const l = leg(hip, [14, FLOOR - 1.5], [0, -1], [1, 0.2]);
      return {
        pose: supine(shoulder, hip, { near: a, far: farOf(a, [-1, -0.5]) }, { near: l, far: leg(add(hip, [-1, 0]), [12, FLOOR - 1.5], [0, -1], [1, 0.2]) }),
        props: 'flatbench',
        anchor: [40, FLOOR - 1],
      };
    }
    case 'shoulder-press': {
      let hand: P = [0, 0];
      const pose = stand((sh) => {
        hand = lerp(add(sh, [6, 0.5]), add(sh, [0.8, -LOCKED]), d);
        return both(arm(sh, hand, [1, 0.4]));
      }, 0.02);
      return { pose, hold: add(hand, [0, -1]), anchor: [33, FLOOR - 1] };
    }
    case 'push-press': {
      // dip at the knees, drive the bar from the shoulders to locked arms overhead
      const dip = f % 16 < 4 ? REP[(f % 16) * 2] * 0.3 : 0;
      const up = f % 16 < 3 ? 0 : Math.min(1, REP[f % 16] * 1.4);
      let hand: P = [0, 0];
      const pose = squatBody(dip, (sh) => {
        hand = lerp(add(sh, [4, 0]), add(sh, [0.5, -LOCKED]), up);
        return both(arm(sh, hand, [1, 0.3]));
      });
      return { pose, hold: add(hand, [0, -1]), backBar: true };
    }
    case 'lateral-raise': {
      const pose = frontStand({ right: (sh) => straightArm(sh, 80 - 80 * d), left: (sh) => mirror(straightArm([64 - sh[0], sh[1]], 80 - 80 * d)) });
      return { pose, anchor: [34, FLOOR - 1] };
    }
    case 'front-raise': {
      let hand: P = [0, 0];
      const pose = stand((sh) => {
        const a = straightArm(sh, 85 - 90 * d);
        hand = a.hand;
        return both(a);
      });
      return { pose, hold: hand, anchor: [33, FLOOR - 1] };
    }
    case 'rear-delt-fly': {
      let hand: P = [0, 0];
      const pose = standing([25, 37], 1.15, FEET, (sh) => {
        const a = straightArm(sh, 90, 1 - 0.8 * d);
        hand = a.hand;
        return both(a);
      });
      return { pose, hold: hand, anchor: [33, FLOOR - 1] };
    }
    case 'upright-row': {
      let hand: P = [0, 0];
      const pose = stand((sh) => {
        hand = lerp(add(sh, [1.5, LOCKED]), add(sh, [3, 1]), d);
        return both(arm(sh, hand, [-0.6, -1]));
      });
      return { pose, hold: hand, anchor: [33, FLOOR - 1] };
    }
    case 'shrug': {
      const pose = stand((sh) => both(hangArm(add(sh, [0, -2.5 * d]), 1)));
      pose.shoulder = add(pose.shoulder, [0, -2.5 * d]);
      return { pose, hold: pose.near.arm.hand, anchor: [33, FLOOR - 1] };
    }
    case 'triceps-pushdown': {
      let hand: P = [0, 0];
      const pose = stand((sh) => {
        const a = forearm(sh, -15 + 105 * d, 85);
        hand = a.hand;
        return both(a);
      }, 0.12);
      return { pose, hold: hand, anchor: [58, 6] };
    }
    case 'triceps-overhead': {
      let hand: P = [0, 0];
      const pose = stand((sh) => {
        const elbow = add(sh, [1, -UPPER]);
        hand = add(elbow, mul(dir(-90 - 160 * (1 - d)), FORE));
        return both({ shoulder: sh, elbow, hand });
      });
      return { pose, hold: hand, anchor: [33, FLOOR - 1] };
    }
    case 'skull-crusher': {
      const shoulder: P = [40, 40.5],
        hip: P = [26, 41];
      const elbow = add(shoulder, mul(dir(-75), UPPER));
      const hand = add(elbow, mul(dir(-75 + 130 * (1 - d)), FORE));
      const a: Arm = { shoulder, elbow, hand };
      const l = leg(hip, [14, FLOOR - 1.5], [0, -1], [1, 0.2]);
      return {
        pose: supine(shoulder, hip, { near: a, far: farOf(a, [-1, -0.5]) }, { near: l, far: leg(add(hip, [-1, 0]), [12, FLOOR - 1.5], [0, -1], [1, 0.2]) }),
        props: 'flatbench',
        hold: hand,
        anchor: [58, 30],
      };
    }
    case 'triceps-kickback': {
      let hand: P = [0, 0];
      const pose = standing([25, 37], 1.1, FEET, (sh, along) => {
        const back = mul(along, -1);
        const elbow = add(sh, mul(back, UPPER));
        hand = add(elbow, mul(unit(lerp([0, 1], back, d)), FORE));
        return both({ shoulder: sh, elbow, hand });
      });
      return { pose, hold: hand, anchor: [33, FLOOR - 1] };
    }
    case 'bench-dip': {
      const hand: P = [25, 43.5];
      const shoulder = lerp([27, hand[1] - LOCKED], [28.5, hand[1] - FORE + 1], d);
      const hip = add(shoulder, [1.5, TORSO - 0.5]);
      const a = arm(shoulder, hand, [-1, -0.3]);
      const l = leg(hip, [52, FLOOR - 1.5], [0, -1], [0.3, -1]);
      return {
        pose: {
          head: add(shoulder, [2, -NECK]),
          face: [1, 0.1],
          up: [0, -1],
          shoulder,
          hip,
          near: { arm: a, leg: l },
          far: { arm: farOf(a), leg: { ...l, foot: add(l.foot, [-1, 0]) } },
        },
        scene: (g) => {
          rect(g, 10, 44, 27, 45, WOOD[2]);
          rect(g, 10, 46, 27, 47, WOOD[1]);
          rect(g, 12, 48, 14, FLOOR, WOOD[0]);
          rect(g, 23, 48, 25, FLOOR, WOOD[0]);
        },
      };
    }
    case 'handstand-pushup': {
      // upside down against the wall, head lowers to just off the floor
      const hand: P = [32, FLOOR - 1.5];
      const shoulder = lerp([32.5, hand[1] - LOCKED], [34, hand[1] - FORE + 0.5], d);
      const hip = add(shoulder, [-1, -TORSO]);
      const a = arm(shoulder, hand, [1, 0]);
      const legs = { near: straight(hip, [0, -1], [1, -0.2]), far: straight(add(hip, [1, 0]), [0, -1], [1, -0.2]) };
      return {
        pose: { head: add(shoulder, [0.5, NECK]), face: [1, 0.2], up: [0, 1], shoulder, hip, near: { arm: a, leg: legs.near }, far: { arm: farOf(a), leg: legs.far } },
        scene: (g) => {
          rect(g, 0, 0, 27, FLOOR, '#2a2e3a');
          rect(g, 27, 0, 27, FLOOR, '#3a3f4d');
        },
      };
    }
    case 'press-out': {
      let hand: P = [0, 0];
      const pose = standing(lerp(STAND, add(STAND, [-1, 2]), 0.5), 0.05, { near: [34, FLOOR - 1.5], far: [27, FLOOR - 1.5] }, (sh) => {
        hand = lerp(add(sh, [5, 5]), add(sh, [LOCKED - 0.5, 2]), d);
        return both(arm(sh, hand, [0, 1]));
      });
      return { pose, hold: add(hand, [kit === 'medball' ? 3 : 0, 0]), anchor: [58, 26] };
    }
    // ----- pull -----
    case 'barbell-row': {
      let hand: P = [0, 0];
      const pose = standing([24, 37], 1.05, FEET, (sh, along) => {
        const hip = sub(sh, mul(along, TORSO));
        hand = lerp(add(sh, [0.3, LOCKED]), add(lerp(hip, sh, 0.45), [0, 4.5]), d);
        return both(arm(sh, hand, [-0.4, -1]));
      });
      return { pose, hold: hand, anchor: [50, FLOOR - 1] };
    }
    case 'inverted-row': {
      // under a bar at chest height, heels down, the body one plank pulled up to the bar
      const hand: P = [38, 30];
      const feet: P = [6, FLOOR - 1.5];
      const shoulder = lerp([38.5, hand[1] + LOCKED - 0.5], [36, hand[1] + 5], d);
      const along = unit(sub(shoulder, feet)),
        hip = add(feet, mul(along, THIGH + SHIN));
      const a = arm(shoulder, hand, [-1, 0.6]);
      const l: Leg = { hip, knee: add(feet, mul(along, SHIN)), foot: feet, toes: [0.1, -1] };
      return {
        pose: { head: add(shoulder, mul(along, NECK)), face: [0, -1], up: along, shoulder, hip, near: { arm: a, leg: l }, far: { arm: farOf(a), leg: { ...l, foot: add(feet, [-1, 0]) } } },
        scene: (g) => {
          rect(g, 26, 29, 56, 30, STEEL[1]);
          rect(g, 26, 29, 56, 29, STEEL[2]);
          rect(g, 52, 31, 53, FLOOR, STEEL[0]);
        },
        hold: kit === 'band' ? hand : undefined,
        anchor: [40, 2],
      };
    }
    case 'lat-pulldown': {
      // seated under the pad, the bar from straight arms overhead down to the top of the chest
      let hand: P = [0, 0];
      const pose = seated([30, 44], -0.12, (sh) => {
        hand = lerp(add(sh, [1.5, -LOCKED]), add(sh, [4, -1]), d);
        return both(arm(sh, hand, [1, 0.5]));
      });
      return {
        pose,
        hold: hand,
        anchor: [33, 1],
        scene: (g) => {
          pad(g, [22, 46.5], [33, 46.5], 1.6);
          rect(g, 26, 48, 27, FLOOR, STEEL[0]);
          capsule(g, [41, 39], [41, 39], 1.8, PAD[1]);
        },
      };
    }
    case 'seated-row': {
      // sitting tall, legs soft, the handle from straight arms to the belly
      let hand: P = [0, 0];
      const pose = seated([24, 47], 0.15 - 0.2 * d, (sh) => {
        hand = lerp(add(sh, [LOCKED - 0.5, 4]), add(sh, [5, 7]), d);
        return both(arm(sh, hand, [-1, 0.2]));
      }, [43, 51]);
      return {
        pose,
        hold: hand,
        anchor: [57, 48],
        scene: (g) => {
          pad(g, [12, 49.5], [36, 49.5], 1.6);
          rect(g, 45, 46, 46, FLOOR, STEEL[0]);
        },
      };
    }
    case 'straight-arm-pulldown': {
      let hand: P = [0, 0];
      const pose = stand((sh) => {
        const a = straightArm(sh, -40 + 125 * d);
        hand = a.hand;
        return both(a);
      }, 0.3);
      return { pose, hold: hand, anchor: [58, 6] };
    }
    case 'curl': {
      let hand: P = [0, 0];
      const pose = stand((sh) => {
        const a = forearm(sh, 85 - 140 * d);
        hand = a.hand;
        return both(a);
      });
      return { pose, hold: hand, anchor: kit === 'cable' ? [58, FLOOR - 3] : [33, FLOOR - 1] };
    }
    case 'pullover': {
      const shoulder: P = [40, 40.5],
        hip: P = [26, 41];
      const a = straightArm(shoulder, -90 + 95 * d);
      const l = leg(hip, [14, FLOOR - 1.5], [0, -1], [1, 0.2]);
      return {
        pose: supine(shoulder, hip, { near: a, far: farOf(a, [-1, -0.5]) }, { near: l, far: leg(add(hip, [-1, 0]), [12, FLOOR - 1.5], [0, -1], [1, 0.2]) }),
        props: 'flatbench',
        hold: a.hand,
        anchor: [58, 30],
      };
    }
    case 'wrist-curl': {
      // forearms along the thighs, only the wrists move
      let hand: P = [0, 0];
      const pose = seated([24, 42], 0.55, (sh) => {
        const elbow: P = [29, 39.5];
        hand = [37, 39.5];
        const a = arm(sh, elbow, [-1, 1], UPPER, 6);
        return both({ shoulder: sh, elbow, hand });
      });
      const lift2 = -2.5 * d;
      return {
        pose,
        hold: add(hand, [1.5, lift2]),
        scene: (g) => {
          pad(g, [14, 44.5], [30, 44.5], 1.6);
          rect(g, 21, 46, 23, FLOOR, STEEL[0]);
        },
      };
    }
    case 'carry': {
      // walking tall with the load: short steps, arms still
      const hip = add(STAND, [0, Math.abs(Math.sin(t * 2 * Math.PI)) * -0.8]);
      const pose = stand((sh) => both(hangArm(sh, 2)), 0.03, hip);
      pose.near.leg = strideLeg(hip, t, 0.45);
      pose.far.leg = strideLeg(add(hip, [-1, 0]), t + 0.5, 0.45);
      return { pose, hold: kit === 'barbell' ? add(pose.shoulder, [-2.5, 0.5]) : pose.near.arm.hand, backBar: kit === 'barbell' };
    }
    // ----- core -----
    case 'plank': {
      const feet: P = [8, FLOOR - 3.5],
        elbow: P = [42, FLOOR - 1.5],
        shoulder: P = [42, FLOOR - 1.5 - UPPER + b * 0.5];
      const along = unit(sub(shoulder, feet)),
        hip = add(feet, mul(along, THIGH + SHIN)),
        knee = add(feet, mul(along, SHIN));
      const a: Arm = { shoulder, elbow, hand: add(elbow, [FORE, 0]) };
      const l: Leg = { hip, knee, foot: feet, toes: [0.35, 1] };
      return {
        pose: {
          head: add(shoulder, add(mul(along, NECK), [0, 0.5])),
          face: unit(add([-along[1], along[0]].map((v) => -v) as P, mul(along, 0.4))),
          up: along,
          shoulder,
          hip,
          near: { arm: a, leg: l },
          far: { arm: farOf(a, [-1, -1]), leg: { ...l, foot: add(feet, [-1, 0]) } },
        },
      };
    }
    case 'side-plank': {
      // seen from the front: propped on one forearm, the body one line from feet to head
      const feet: P = [8, FLOOR - 2],
        elbow: P = [42, FLOOR - 1.5];
      const shoulder: P = [42, FLOOR - 1.5 - UPPER];
      const along = unit(sub(shoulder, feet));
      const sag = (1 - d) * 2.5;
      const hip = add(add(feet, mul(along, THIGH + SHIN)), [0, sag]);
      const knee = add(feet, mul(unit(sub(hip, feet)), SHIN));
      const a: Arm = { shoulder, elbow, hand: add(elbow, [-1, 0]) };
      const top = arm(add(shoulder, [0, -1]), add(hip, [1, -2]), [0, -1]);
      return {
        pose: {
          front: true,
          showLegs: true,
          head: add(shoulder, mul(along, NECK)),
          face: [0, 1],
          up: along,
          shoulder,
          hip,
          near: { arm: top, leg: { hip, knee, foot: feet, toes: [0, -1] } },
          far: { arm: a, leg: { hip, knee, foot: feet, toes: [0, -1] } },
        },
      };
    }
    case 'crunch': {
      // knees bent, hands by the head, the shoulders curl up off the floor
      const hip: P = [30, FLOOR - 3];
      const shoulder = add(hip, mul(dir(-35 * d), TORSO));
      const mid = add(lerp(hip, shoulder, 0.5), [0, -1.5 * d]);
      const l = leg(hip, [20, FLOOR - 1.5], [0, -1], [1, 0.1]);
      const along = unit(sub(shoulder, hip));
      const head = add(shoulder, mul(along, NECK));
      const a = arm(shoulder, add(head, [-2, 1]), [0, -1]);
      const pose = supine(shoulder, hip, both(a), { near: l, far: { ...l, foot: add(l.foot, [-1, 0]) } });
      pose.mid = mid;
      if (kit === 'ball') {
        return { pose: lift(pose, 7), scene: (g) => ball(g, [32, FLOOR - 8]) };
      }
      return { pose, hold: add(shoulder, [2, -3]) };
    }
    case 'sit-up': {
      const hip: P = [30, FLOOR - 3];
      const shoulder = add(hip, mul(dir(-75 * d), TORSO));
      const l = leg(hip, [20, FLOOR - 1.5], [0, -1], [1, 0.1]);
      const along = unit(sub(shoulder, hip));
      const a = arm(shoulder, add(shoulder, mul(along, -3)), [along[1], -along[0]]);
      const pose = supine(shoulder, hip, both(a), { near: l, far: { ...l, foot: add(l.foot, [-1, 0]) } }, unit([along[1] * -1 + along[0] * 0.2, along[0] * 0.2 - along[1] * 0.2 - 0.6]) as P);
      return { pose, hold: add(shoulder, mul(along, -2)) };
    }
    case 'leg-raise': {
      // flat on your back, straight legs from the floor up to vertical
      const shoulder: P = [44, FLOOR - 3],
        hip: P = [30, FLOOR - 3];
      const a = arm(shoulder, [36, FLOOR - 1.5], [0, -1]);
      const dirL = dir(180 + 85 * d);
      return {
        pose: supine(shoulder, hip, both(a), { near: straight(hip, dirL, dir(270 + 85 * d)), far: straight(add(hip, [0, -1]), dirL, dir(270 + 85 * d)) }),
      };
    }
    case 'dead-bug': {
      // on your back, arms up, knees over hips; one leg and the other arm reach long, then switch
      const shoulder: P = [44, FLOOR - 3],
        hip: P = [30, FLOOR - 3];
      const k = half;
      const up = straightArm(shoulder, -90);
      const reach = straightArm(shoulder, -90 + 80 * k);
      const table = (h: P): Leg => {
        const knee = add(h, [0, -THIGH]);
        return { hip: h, knee, foot: add(knee, [-SHIN, 0]), toes: [0, -1] };
      };
      const long = (h: P): Leg => {
        const th = -90 - 80 * k;
        const knee = add(h, mul(dir(th), THIGH));
        return { hip: h, knee, foot: add(knee, mul(dir(lerp([th - 90, 0], [th, 0], k)[0]), SHIN)), toes: [0, -1] };
      };
      const near = second ? { arm: up, leg: long(hip) } : { arm: reach, leg: table(hip) };
      const far = second ? { arm: farOf(reach), leg: table(add(hip, [-1, 0])) } : { arm: farOf(up), leg: long(add(hip, [-1, 0])) };
      return { pose: supine(shoulder, hip, { near: near.arm, far: far.arm }, { near: near.leg, far: far.leg }) };
    }
    case 'russian-twist': {
      // sitting back in a V, feet up, the hands swing from one hip to the other
      const hip: P = [28, FLOOR - 3];
      const along = unit([0.55, -1]),
        shoulder = add(hip, mul(along, TORSO));
      const knee = add(hip, mul(dir(-35), THIGH)),
        foot = add(knee, mul(dir(20), SHIN));
      const sw = Math.sin(t * 2 * Math.PI);
      const hand = add(shoulder, [5 + 3 * sw, 7 - 2 * Math.abs(sw)]);
      const a = arm(shoulder, hand, [0, 1]);
      return {
        pose: {
          head: add(shoulder, mul(along, NECK)),
          face: unit([1, 0.4]),
          up: along,
          shoulder,
          hip,
          near: { arm: a, leg: { hip, knee, foot, toes: [1, 0] } },
          far: { arm: farOf(a), leg: { hip: add(hip, [-1, 0]), knee: add(knee, [-1, 0]), foot: add(foot, [-1, 0]), toes: [1, 0] } },
        },
        hold: add(hand, [1, 0]),
        anchor: [58, 40],
      };
    }
    case 'mountain-climber': {
      // a push-up's top, the knees drive to the chest one after the other
      const hand: P = [44, FLOOR - 1.5],
        shoulder: P = [43, FLOOR - 1.5 - LOCKED];
      const hip: P = [26, 40];
      const a = arm(shoulder, hand, [-1, 0]);
      const back = (h: P): Leg => ({ hip: h, knee: add(h, [-9, 6]), foot: [9, FLOOR - 2], toes: [0.35, 1] });
      const driven = (h: P, k: number): Leg => {
        const knee = lerp(add(h, [-9, 6]), add(h, [7, 6]), k);
        return { hip: h, knee, foot: lerp([9, FLOOR - 2], add(knee, [-6, 7]), k), toes: [0.5, 1] };
      };
      const k = half;
      return {
        pose: {
          head: add(shoulder, [5, -1.5]),
          face: unit([1, 0.7]),
          up: unit(sub(shoulder, hip)),
          shoulder,
          hip,
          near: { arm: a, leg: second ? back(hip) : driven(hip, k) },
          far: { arm: farOf(a), leg: second ? driven(add(hip, [-1, 0]), k) : back(add(hip, [-1, 0])) },
        },
      };
    }
    case 'ab-rollout': {
      // from the knees, roll the wheel out until the body is long, then pull it back
      const knee: P = [22, FLOOR - 1.5];
      const hand = lerp([36, FLOOR - 4], [50, FLOOR - 4], d);
      const shoulder = lerp([36, FLOOR - 4 - LOCKED + 1], [46, 46], d);
      const hip = add(knee, mul(unit(lerp([0.15, -1], unit(sub(shoulder, knee)), d)), THIGH));
      const a = arm(shoulder, hand, [0, -1]);
      const l: Leg = { hip, knee, foot: [12, FLOOR - 1.5], toes: [-0.3, 1] };
      const pose: Pose = {
        head: add(shoulder, mul(unit(sub(shoulder, hip)), NECK)),
        face: unit([1, 1]),
        up: unit(sub(shoulder, hip)),
        shoulder,
        hip,
        near: { arm: a, leg: l },
        far: { arm: farOf(a), leg: { ...l, knee: add(knee, [-1, 0]), foot: add(l.foot, [-1, 0]) } },
      };
      return { pose, hold: hand };
    }
    case 'cable-crunch': {
      // kneeling under the pulley, hands by the head, curl the ribs to the hips
      const knee: P = [22, FLOOR - 1.5];
      const hip: P = [23, FLOOR - 1.5 - THIGH];
      const lean = 0.25 + 1.0 * d;
      const along: P = [Math.sin(lean), -Math.cos(lean)];
      const shoulder = add(hip, mul(along, TORSO));
      const mid = add(lerp(hip, shoulder, 0.5), mul([-along[1], along[0]] as P, -1.5 * d));
      const head = add(shoulder, mul(along, NECK));
      const a = arm(shoulder, add(head, [0, 1.5]), [1, 0.5]);
      const l: Leg = { hip, knee, foot: [12, FLOOR - 1.5], toes: [-0.3, 1] };
      return {
        pose: { head, face: unit([1, 0.3 + lean]), up: along, shoulder, hip, mid, near: { arm: a, leg: l }, far: { arm: farOf(a), leg: { ...l, knee: add(knee, [-1, 0]) } } },
        hold: add(head, [1, 1]),
        anchor: [58, 6],
      };
    }
    case 'side-bend': {
      const pose = frontStand({
        tilt: -26 * (second ? -half : half),
        right: (sh) => straightArm(sh, 88),
        left: (sh) => mirror(straightArm([64 - sh[0], sh[1]], 88)),
      });
      return { pose, anchor: [36, FLOOR - 1] };
    }
    case 'woodchop': {
      // straight arms from high over the back shoulder down across to the front knee
      let hand: P = [0, 0];
      const pose = standing(lerp([30, 35.5], [29, 38], s), 0.05 + 0.3 * s, { near: [36, FLOOR - 1.5], far: [25, FLOOR - 1.5] }, (sh) => {
        const a = straightArm(sh, -120 + 175 * s);
        hand = a.hand;
        return both(a);
      });
      return { pose, hold: hand, anchor: [58, 6] };
    }
    case 'windmill': {
      // the bell locked overhead, hips push back and the free hand slides down to the foot
      const lean = 1.3 * d;
      let hand: P = [0, 0];
      const pose = standing(lerp([30, 35.5], [26, 37], d), lean, { near: [34, FLOOR - 1.5], far: [27, FLOOR - 1.5] }, (sh) => {
        hand = add(sh, [0, -LOCKED]);
        const up = straightArm(sh, -90);
        const down = straightArm(sh, 95);
        return { near: up, far: farOf(down) };
      });
      return { pose, hold: hand };
    }
    // ----- power and conditioning -----
    case 'clean':
    case 'snatch': {
      // pull from the floor, extend tall onto the toes, drop under and catch, stand up
      const k = f % 16;
      const snatch = id === 'snatch';
      let pose: Pose;
      let hold: P;
      if (k < 5) {
        pose = hingeBody(1 - k / 5);
        hold = pose.near.arm.hand;
      } else if (k < 7) {
        const up = (k - 4) / 3;
        pose = standing(add(STAND, [0, -1.5 * up]), -0.05, { near: add(FEET.near, [0, -1.5 * up]), far: add(FEET.far, [0, -1.5 * up]) }, (sh) => {
          const h = add(sh, [3, lerp([LOCKED - 2, 0], [snatch ? -2 : 3, 0], up)[0]]);
          return both(arm(sh, h, [-0.5, -1]));
        }, [0.6, 0.8]);
        hold = pose.near.arm.hand;
      } else {
        const dip = k < 9 ? 0.55 : k < 13 ? 0.55 * (1 - (k - 9) / 4) : 0;
        if (snatch) {
          pose = squatBody(dip, (sh) => both(arm(sh, add(sh, [-1.5, -LOCKED]), [1, 0])), -0.1);
        } else {
          pose = squatBody(dip, (sh, along) => both(arm(sh, add(sh, add(mul(along, 1), [2.5, 1])), [1, 0.2], 7, 6)), -0.2);
        }
        hold = snatch ? pose.near.arm.hand : add(pose.shoulder, [3.5, -0.5]);
      }
      return { pose, hold, backBar: k >= 5 };
    }
    case 'slam': {
      // the ball overhead on tall toes, then slammed into the floor with a hinge
      const k = s;
      let hand: P = [0, 0];
      const pose = standing(lerp([30, 35], [24, 40], 1 - k), 0.05 + 0.95 * (1 - k), FEET, (sh) => {
        const a = straightArm(sh, lerp([-85, 0], [80, 0], 1 - k)[0]);
        hand = a.hand;
        return both(a);
      });
      return { pose, hold: add(hand, [1, 0]) };
    }
    case 'battle-ropes': {
      // athletic half squat, the arms whip up and down, the rope waves to its anchor
      const sw = Math.sin(t * 4 * Math.PI);
      let hand: P = [0, 0];
      const pose = squatBody(0.35, (sh) => {
        hand = add(sh, [9, 7 - 4 * sw]);
        return both(arm(sh, hand, [0, 1]));
      });
      return {
        pose,
        over: (g) => {
          for (let x = hand[0] + 1; x < 62; x++) {
            const y = FLOOR - 4 + (hand[1] - (FLOOR - 4)) * Math.max(0, 1 - (x - hand[0]) / 24) + 2.5 * Math.sin((x - hand[0]) / 3 - t * 8 * Math.PI) * Math.min(1, (x - hand[0]) / 6);
            put(g, x, y, '#c9a46a');
            put(g, x, y + 1, '#7c5a32');
          }
        },
      };
    }
    case 'sled-push': {
      const hip: P = [24, 36];
      const pose = standing(hip, 0.95, FEET, (sh) => both(arm(sh, add(sh, [7, 3]), [0, 1])));
      pose.near.leg = strideLeg(hip, t, 0.8);
      pose.far.leg = strideLeg(add(hip, [-1, 0]), t + 0.5, 0.8);
      return {
        pose,
        scene: (g) => {
          rect(g, 44, 46, 60, FLOOR, '#2b2f3a');
          rect(g, 44, 46, 60, 46, '#4a5260');
          rect(g, 45, 30, 46, 46, STEEL[1]);
        },
      };
    }
    case 'run': {
      const hip = add(STAND, [0, -Math.abs(Math.sin(t * 2 * Math.PI)) * 1.5]);
      const sw = Math.sin(t * 2 * Math.PI);
      const pose = stand((sh) => {
        const n = forearm(sh, -20 + 30 * sw, 90 + 40 * sw);
        const fa = forearm(add(sh, [-1, 0]), -20 - 30 * sw, 90 - 40 * sw);
        return { near: n, far: fa };
      }, 0.15, hip);
      pose.near.leg = strideLeg(hip, t);
      pose.far.leg = strideLeg(add(hip, [-1, 0]), t + 0.5);
      return {
        pose: lift(pose, kit === 'machine' ? 0 : 1.5 * Math.abs(Math.cos(t * 2 * Math.PI))),
        scene:
          kit === 'machine'
            ? (g) => {
                rect(g, 6, FLOOR - 1, 54, FLOOR + 1, '#2b2f3a');
                rect(g, 50, 24, 51, FLOOR, STEEL[0]);
                rect(g, 46, 23, 52, 24, STEEL[1]);
              }
            : undefined,
        ownMachine: true,
      };
    }
    case 'bike': {
      // seated over the crank, hands on the bars, the feet turn circles
      const hip: P = [26, 38],
        crank: P = [34, 48];
      const th = t * 360;
      const along = unit([0.6, -0.8]),
        shoulder = add(hip, mul(along, TORSO));
      const nf = add(crank, mul(dir(th), 5)),
        ff = add(crank, mul(dir(th + 180), 5));
      const a = arm(shoulder, [44, 34], [0, 1]);
      return {
        pose: {
          head: add(shoulder, add(mul(along, NECK), [1, 0])),
          face: unit([1, 0.3]),
          up: along,
          shoulder,
          hip,
          near: { arm: a, leg: leg(hip, nf, [1, -0.5], [1, 0.2]) },
          far: { arm: farOf(a), leg: leg(add(hip, [-1, 0]), ff, [1, -0.5], [1, 0.2]) },
        },
        scene: (g) => {
          pad(g, [22, 40.5], [28, 40.5], 1.4);
          capsule(g, [25, 42], [32, FLOOR], 1.2, STEEL[0]);
          capsule(g, [45, 34], [40, FLOOR], 1.2, STEEL[0]);
          capsule(g, [44, 33], [47, 33], 1, STEEL[1]);
          rect(g, 20, FLOOR, 48, FLOOR, STEEL[0]);
          capsule(g, crank, crank, 2, STEEL[1]);
        },
        ownMachine: true,
      };
    }
    case 'rower': {
      // the drive: legs push, then the body swings back, then the arms pull; and back to the catch
      const leg1 = Math.min(1, s * 1.6),
        body = Math.max(0, Math.min(1, s * 2.2 - 0.6)),
        arms1 = Math.max(0, s * 2.5 - 1.5);
      const hip: P = [lerp([33, 0], [21, 0], leg1)[0], FLOOR - 7];
      const lean = 0.45 - 0.75 * body;
      let hand: P = [0, 0];
      const pose = seated(hip, lean, (sh) => {
        hand = lerp(add(sh, [LOCKED - 1, 2]), add(sh, [4, 7]), arms1);
        return both(arm(sh, hand, [-1, 0.3]));
      }, [44, FLOOR - 4]);
      return {
        pose,
        hold: hand,
        anchor: [53, 45],
        ownMachine: true,
        scene: (g) => {
          rect(g, 6, FLOOR - 4, 56, FLOOR - 3, STEEL[0]);
          capsule(g, [53, 47], [53, 47], 4.5, '#2b2f3a');
          pad(g, [hip[0] - 3, FLOOR - 5], [hip[0] + 3, FLOOR - 5], 1.2);
        },
      };
    }
    case 'jump-rope': {
      const hop = Math.abs(Math.sin(t * 4 * Math.PI)) * 2;
      const pose = lift(stand((sh) => both(arm(sh, add(sh, [3, 12]), [-1, 0]))), hop);
      const hand = pose.near.arm.hand;
      const th = t * 2 * Math.PI;
      const apex: P = [30 + 15 * Math.sin(th), 30 - 27 * Math.cos(th)];
      return {
        pose,
        over: (g) => {
          for (let i = 0; i <= 24; i++) {
            const q = i / 24,
              p = q < 0.5 ? lerp(hand, apex, q * 2) : lerp(apex, add(hand, [-1, 0]), q * 2 - 1);
            put(g, p[0], p[1], '#e5e7eb');
          }
        },
      };
    }
    case 'star-jump': {
      const k = s;
      const pose = frontStand({
        spread: 3 + 9 * k,
        right: (sh) => straightArm(sh, 80 - 150 * k),
        left: (sh) => mirror(straightArm([64 - sh[0], sh[1]], 80 - 150 * k)),
      });
      return { pose: lift(pose, 3 * Math.sin(Math.PI * k)) };
    }
    // ----- stretching and mobility -----
    case 'reach-stretch': {
      const pose = frontStand({
        tilt: -10 * b,
        right: (sh) => straightArm(sh, -95),
        left: (sh) => mirror(straightArm([64 - sh[0], sh[1]], -95)),
      });
      return { pose };
    }
    case 'toe-touch': {
      const k = 0.85 + 0.15 * (b > 0 ? 1 : 0);
      const pose = standing(lerp([29, 35.5], [24, 35.5], k), 0.06 + 1.75 * k, FEET, (sh) => both(arm(sh, add(sh, [1.5, LOCKED]), [-1, 0])));
      return { pose };
    }
    case 'quad-stretch': {
      // on one leg, the other heel held to the glute
      const pose = stand((sh) => both(arm(sh, add(sh, [-3, 14]), [1, 0])), 0.04);
      const hip = pose.hip;
      const knee = add(hip, [0.5, THIGH]);
      const bentKnee = add(hip, mul(dir(98), THIGH));
      pose.near.leg = { hip, knee: bentKnee, foot: add(hip, [-5, 1.5 - b]), toes: [-0.3, -1] };
      void knee;
      pose.near.arm = arm(pose.shoulder, add(pose.near.leg.foot, [0, 1]), [1, 0]);
      return { pose };
    }
    case 'seated-stretch': {
      // sitting tall, legs long, folding forward from the hips toward the toes
      const hip: P = [22, FLOOR - 3];
      const lean = 0.9 + 0.25 * (b > 0 ? 1 : 0);
      const along: P = [Math.sin(lean), -Math.cos(lean)],
        shoulder = add(hip, mul(along, TORSO));
      const legs = { near: straight(hip, [1, 0], [0.3, -1]), far: straight(add(hip, [-1, 0]), [1, 0], [0.3, -1]) };
      const a = arm(shoulder, [41, FLOOR - 4], [0, -1]);
      return { pose: { head: add(shoulder, mul(along, NECK)), face: unit([1, 1]), up: along, shoulder, hip, near: { arm: a, leg: legs.near }, far: { arm: farOf(a), leg: legs.far } } };
    }
    case 'knee-hug': {
      const shoulder: P = [46, FLOOR - 3],
        hip: P = [32, FLOOR - 3];
      const knee = add(hip, mul(dir(-60 - 10 * (b > 0 ? 1 : 0)), THIGH));
      const nl: Leg = { hip, knee, foot: add(knee, mul(dir(160), SHIN)), toes: [0, -1] };
      const a = arm(shoulder, add(knee, [1, 1]), [0, -1]);
      return { pose: supine(shoulder, hip, both(a), { near: nl, far: straight(add(hip, [0, 0.5]), [-1, 0], [0, -1]) }) };
    }
    case 'lunge-stretch': {
      // the back knee down, hips sink forward, hands on the front knee
      const sink = b > 0 ? 1.5 : 0;
      const hip: P = [27 + sink, 44 + sink * 0.5];
      const pose = standing(hip, 0, { near: [40, FLOOR - 1.5], far: [10, FLOOR - 1.5] }, (sh) => both(arm(sh, [37, 43], [-1, 0])));
      pose.far.leg = { hip: add(hip, [-1, 0]), knee: [20, FLOOR - 1.5], foot: [10, FLOOR - 1.5], toes: [-0.3, 1] };
      return { pose };
    }
    case 'calf-stretch': {
      // hands on the wall, the back leg long with the heel down
      const hip: P = [30, 36];
      const pose = standing(hip, 0.35, { near: [38, FLOOR - 1.5], far: [17, FLOOR - 1.5] }, (sh) => both(arm(sh, [50, sh[1] + 1 - b], [0, 1])));
      return { pose, scene: (g) => wall(g, 51) };
    }
    case 'arm-stretch': {
      // first half: an elbow up, the hand down the back of the neck; then the hands clasped behind you
      const pose = stand((sh) => {
        if (second) {
          const a = arm(sh, add(sh, [-7, 10]), [-1, -0.3]);
          return both(a);
        }
        const elbow = add(sh, [1.5, -UPPER]);
        return both({ shoulder: sh, elbow, hand: add(elbow, mul(dir(110), FORE)) });
      });
      return { pose };
    }
    case 'cat-cow': {
      return { pose: allFours(-4 + 8 * s) };
    }
    case 'child-pose': {
      // sitting back on the heels, chest to the thighs, arms long ahead on the floor
      const knee: P = [32, FLOOR - 1.5];
      const hip: P = [21, FLOOR - 5 - b * 0.5];
      const shoulder: P = [33, FLOOR - 4.5 - b * 0.5];
      const a = arm(shoulder, [49, FLOOR - 1.5], [0, -1]);
      const l: Leg = { hip, knee, foot: [14, FLOOR - 1.5], toes: [-1, 0.3] };
      return {
        pose: { head: add(shoulder, [5.5, 0]), face: [0.3, 1], up: [1, 0], shoulder, hip, near: { arm: a, leg: l }, far: { arm: farOf(a), leg: { ...l, knee: add(knee, [-1, 0]) } } },
      };
    }
    case 'foam-roll': {
      // propped on the hands, the roller under the legs, roll slowly up and down
      const slide = 5 * s;
      const hip: P = [22 + slide, FLOOR - 9];
      const shoulder = add(hip, mul(unit([-0.4, -1]), TORSO));
      const a = arm(shoulder, [14 + slide, FLOOR - 1.5], [1, 0]);
      const legs = { near: straight(hip, [1, 0.12], [0.3, -1]), far: straight(add(hip, [-1, 0]), [1, 0.12], [0.3, -1]) };
      return {
        pose: { head: add(shoulder, [1.5, -NECK]), face: [1, 0.4], up: unit([-0.4, -1]), shoulder, hip, near: { arm: a, leg: legs.near }, far: { arm: farOf(a), leg: legs.far } },
        scene: (g) => {
          capsule(g, [36, FLOOR - 3.5], [36, FLOOR - 3.5], 3.6, '#2563eb');
          capsule(g, [35, FLOOR - 4.5], [35, FLOOR - 4.5], 1.2, '#60a5fa');
        },
      };
    }
    case 'circles': {
      const pose = stand((sh) => {
        const a = straightArm(sh, t * 360);
        return { near: a, far: farOf(straightArm(sh, t * 360 + 180)) };
      });
      return { pose };
    }
    case 'neck': {
      const pose = stand((sh) => both(hangArm(sh, 1)));
      const nod = Math.sin(t * 2 * Math.PI);
      pose.face = unit([1, 0.6 * nod]);
      pose.head = add(pose.head, [0.6 * nod, 0]);
      return { pose };
    }
    case 'balance': {
      // on one leg, arms out, small corrections
      const sway = Math.sin(t * 2 * Math.PI) * 0.06;
      const pose = standing(STAND, 0.03 + sway, FEET, (sh) => both(straightArm(sh, 10)));
      const hip = pose.hip;
      const knee = add(hip, [6, 6]);
      pose.near.leg = { hip, knee, foot: add(knee, [-1, SHIN - 1]), toes: [1, 0.2] };
      return { pose };
    }
  }
}

function backSquat(d: number, kit: Kit): Frame {
  let hold: P = [0, 0];
  const pose = squatBody(d, (sh, along) => {
    // the bar sits across the upper back, hands just outside the shoulders, elbows down and back
    hold = add(sh, add(mul(along, 0.5), [-2.5, 0]));
    return both(arm(sh, add(hold, [1, 0]), [-0.6, 1], 6, 7));
  });
  return { pose, hold, backBar: kit === 'machine', ownMachine: false };
}

/** The whole figure raised off the floor (a jump). */
function lift(p: Pose, by: number): Pose {
  if (!by) return p;
  const up = (q: P): P => [q[0], q[1] - by];
  const a = (x: Arm): Arm => ({ shoulder: up(x.shoulder), elbow: up(x.elbow), hand: up(x.hand) });
  const l = (x: Leg): Leg => ({ ...x, hip: up(x.hip), knee: up(x.knee), foot: up(x.foot) });
  return { ...p, head: up(p.head), shoulder: up(p.shoulder), hip: up(p.hip), mid: p.mid && up(p.mid), near: { arm: a(p.near.arm), leg: l(p.near.leg) }, far: { arm: a(p.far.arm), leg: l(p.far.leg) } };
}

function ball(g: Grid, at: P) {
  capsule(g, at, at, 8, '#2563eb');
  capsule(g, add(at, [-3, -3]), add(at, [-3, -3]), 2, '#60a5fa');
}

/** Which kit each move is drawn with when the exercise doesn't say. */
const DEFAULT_KIT: Partial<Record<MoveId, Kit>> = {
  'barbell-squat': 'barbell',
  'front-squat': 'barbell',
  'overhead-squat': 'barbell',
  deadlift: 'barbell',
  rdl: 'barbell',
  'good-morning': 'barbell',
  'kettlebell-swing': 'kettlebell',
  'bench-press': 'barbell',
  'chest-fly': 'dumbbell',
  'shoulder-press': 'dumbbell',
  'push-press': 'barbell',
  'lateral-raise': 'dumbbell',
  'front-raise': 'dumbbell',
  'rear-delt-fly': 'dumbbell',
  'upright-row': 'barbell',
  shrug: 'barbell',
  'triceps-pushdown': 'cable',
  'triceps-overhead': 'dumbbell',
  'skull-crusher': 'barbell',
  'triceps-kickback': 'dumbbell',
  'barbell-row': 'barbell',
  'lat-pulldown': 'cable',
  'seated-row': 'cable',
  'straight-arm-pulldown': 'cable',
  curl: 'dumbbell',
  pullover: 'dumbbell',
  'wrist-curl': 'dumbbell',
  carry: 'dumbbell',
  'ab-rollout': 'none',
  'cable-crunch': 'cable',
  'side-bend': 'dumbbell',
  woodchop: 'cable',
  windmill: 'kettlebell',
  clean: 'barbell',
  snatch: 'barbell',
  slam: 'medball',
  'leg-press': 'machine',
  'leg-extension': 'machine',
  'leg-curl': 'machine',
  rower: 'machine',
  bike: 'machine',
  'foam-roll': 'roller',
};

export const defaultKit = (id: MoveId): Kit => DEFAULT_KIT[id] ?? 'none';

/** The barbell plate, dumbbell or kettlebell a kit puts in the hands. */
const WEIGHT: Partial<Record<Kit, Weight['kind']>> = { barbell: 'barbell', dumbbell: 'dumbbell', kettlebell: 'kettlebell', medball: 'medball', plate: 'plate', stone: 'stone' };

/** One frame of a library demo with its kit in place. */
export function drawMove(id: MoveId, kitIn: Kit | undefined, f: number): MoveDrawing {
  const kit = kitIn ?? defaultKit(id);
  const fr = frame(id, kit, f);
  const weights: Weight[] = [];
  const lines: Line[] = [];
  const hold = fr.hold ?? fr.pose.near.arm.hand;
  const scenes: ((g: Grid) => void)[] = [];
  if (fr.scene) scenes.push(fr.scene);
  const w = WEIGHT[kit];
  if (id === 'ab-rollout') weights.push({ kind: 'wheel', at: hold });
  else if (w) weights.push({ kind: w, at: hold, behind: fr.backBar && w === 'barbell' });
  if (kit === 'cable' || (kit === 'machine' && !fr.ownMachine)) {
    const anchor = fr.anchor ?? [58, 30];
    // a pulley high over you hangs off a beam; anything else sits on the tower
    const at: P = anchor[1] <= 3 ? [anchor[0], 3] : [Math.max(anchor[0], 56), anchor[1]];
    scenes.unshift((g) => tower(g, at));
    lines.push({ from: at, to: hold, kind: 'cable' });
    weights.push({ kind: 'handle', at: hold });
  }
  if (kit === 'band') lines.push({ from: fr.anchor ?? [33, FLOOR - 1], to: hold, kind: 'band' });
  if (kit === 'ball' && id !== 'crunch') scenes.push((g) => ball(g, [14, FLOOR - 8]));
  if (kit === 'machine' && (id === 'squat' || id === 'barbell-squat' || id === 'calf-raise')) {
    // a Smith machine: the bar rides between two rails
    scenes.unshift((g) => {
      rect(g, 8, 2, 9, FLOOR, STEEL[0]);
      rect(g, 50, 2, 51, FLOOR, STEEL[0]);
    });
    if (!weights.length) weights.push({ kind: 'barbell', at: hold, behind: true });
  }
  return {
    pose: fr.pose,
    props: fr.props ?? 'floor',
    scene: scenes.length ? (g) => scenes.forEach((sc) => sc(g)) : undefined,
    over: fr.over,
    weights,
    lines,
  };
}
