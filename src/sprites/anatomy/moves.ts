/* The anatomy demos' moves: for each exercise, its pose at any depth of the rep (0 = start,
   1 = the far end), the muscles it works, where the cameras look from, the floor under it, and
   which point the arrow follows. The body and its drawing live in body.ts. */

import type { MuscleId } from './body';
import { L, SHOULDER_OUT, SHOULDER_UP, add, assemble, cross, flatFoot, footAt, ik, lean, lerp, mix, mul, rad, sub, unit, type Limb, type Pose, type Prop, type V3 } from './skeleton';

export const ANATOMY_DEMOS = [
  'pushup',
  'barbell-squat',
  'squat',
  'lunge',
  'deadlift',
  'bench-press',
  'shoulder-press',
  'barbell-row',
  'pullup',
  'plank',
  'curl',
  'bridge',
  'rdl',
  'good-morning',
  'step-up',
  'calf-raise',
  'lateral-raise',
  'rear-delt-fly',
  'shrug',
  'triceps-pushdown',
  'lat-pulldown',
  'seated-row',
  'inverted-row',
  'dips',
  'crunch',
  'side-plank',
  'knee-raise',
  'triceps-overhead',
  'skull-crusher',
  'triceps-kickback',
  'front-raise',
  'upright-row',
  'wrist-curl',
  'chest-fly',
  'pullover',
  'straight-arm-pulldown',
  'leg-press',
  'leg-curl',
  'leg-extension',
  'front-squat',
  'overhead-squat',
  'back-extension',
  'kickback-glute',
  'kettlebell-swing',
  'leg-raise',
  'sit-up',
  'russian-twist',
  'cable-crunch',
  'dead-bug',
  'ab-rollout',
  'side-bend',
  'mountain-climber',
  'incline-pushup',
  'bench-dip',
  'dead-hang',
  'carry',
  'standing-quad-stretch',
  'wall-calf-stretch',
  'seated-hamstring-stretch',
  'forward-fold',
  'childs-pose',
  'knees-to-chest',
  'hip-flexor-stretch',
  'triceps-stretch',
  'cross-body-stretch',
  'chest-opener',
  'side-reach',
  'neck-side-stretch',
] as const;
export type AnatomyId = (typeof ANATOMY_DEMOS)[number];
export const hasAnatomy = (id: string): id is AnatomyId => (ANATOMY_DEMOS as readonly string[]).includes(id);

export type View = 'side' | 'front';

/** How an exercise differs from its demo's plain version, read from its name. */
export interface Variant {
  /** Dumbbells instead of a barbell, or the other way round. */
  gear?: 'barbell' | 'dumbbell';
  /** A bench raised at the head end. */
  incline?: boolean;
  /** One weight held at the chest (goblet squat). */
  goblet?: boolean;
}

export interface Demo {
  pose: (d: number, v: Variant) => Pose;
  /** Which gear it can swap to. */
  swaps?: ('barbell' | 'dumbbell')[];
  /** Which exercise names it shows, when its movement also holds look-alikes it doesn't. */
  fits?: RegExp;
  /** The main movers, then the helpers. */
  works: { main: MuscleId[]; help: MuscleId[] };
  /** Where each view looks from (toward the camera). */
  cameras: Record<View, V3>;
  /** A variant's own cameras, when the plain ones don't suit it. */
  camerasFor?: (v: Variant) => Partial<Record<View, V3>>;
  /** What to call the second view when it is not the front. */
  names?: Partial<Record<View, string>>;
  /** The floor under it: its middle and how far it reaches; none for a hanging move. */
  floor?: { x: number; r: number };
  /** The point the arrow follows; none for a hold. */
  mover?: (p: Pose) => V3;
  /** Which side of the body the arrow stands on. */
  arrow: 'left' | 'right';
}

/** The hand, straight on from the forearm's line (shoulder to wrist when the elbow is unknown). */
const handOut = (from: V3, wrist: V3, length = 17): V3 => add(wrist, mul(unit(sub(wrist, from)), length));

/** Where a shoulder is for a pelvis and torso line. */
const shoulderOf = (pelvis: V3, up: V3, s: number): V3 => add(add(pelvis, mul(unit(up), SHOULDER_UP)), [0, 0, s * SHOULDER_OUT]);

/** Toes tucked on the floor, heels up (push-up, plank). */
const tucked = (ankle: V3, s: number): Pick<Limb, 'ankle' | 'heel' | 'toe' | 'instep'> => ({
  ankle: add(ankle, [0, 0, s * 10]),
  heel: [ankle[0] - 2.5, ankle[1] + 3.5, s * 10],
  toe: [ankle[0] + 9, 1, s * 10],
  instep: unit([18, 13, 0]),
});

/** A body in one straight line from the ankles, rising at `deg` (push-up, plank). */
function plankLine(ankle: V3, deg: number) {
  const dir: V3 = [Math.cos(rad(deg)), Math.sin(rad(deg)), 0];
  return { dir, front: [Math.sin(rad(deg)), -Math.cos(rad(deg)), 0] as V3, pelvis: add(ankle, mul(dir, L.shin + L.thigh)) };
}

const SIDE: V3 = [0, 0, 1];

/** A foot around its ankle, any way round: which way the toes point and the top of the foot faces. */
function footFrom(ankle: V3, toes: V3, instep: V3): Pick<Limb, 'ankle' | 'heel' | 'toe' | 'instep'> {
  const t = unit(toes);
  const i = unit(instep);
  return { ankle, heel: sub(sub(ankle, mul(t, 6)), mul(i, 4.5)), toe: sub(add(ankle, mul(t, 18.5)), mul(i, 5.5)), instep: i };
}

/** Where the weight is: the barbell, or between the dumbbells. */
const barOf = (p: Pose): V3 => {
  for (const g of p.props) if (g.kind === 'barbell') return g.at;
  const bells = p.props.flatMap((g) => (g.kind === 'dumbbell' ? [g.at] : []));
  return bells.length ? mix(bells[0], bells[bells.length - 1], 0.5) : p.pelvis;
};

export const DEMOS: Record<AnatomyId, Demo> = {
  /** Hands under the shoulders, a bit wider; one straight line from heels to head; elbows back at
      about 45 degrees; chest to a fist from the floor. */
  pushup: {
    pose: (d) => {
      const ankle: V3 = [-103, 13, 0];
      const shoulderY = lerp(4 + L.upper + L.fore - 1, 17, d);
      const deg = (Math.asin((shoulderY - ankle[1]) / (L.shin + L.thigh + SHOULDER_UP)) * 180) / Math.PI;
      const { dir, front, pelvis } = plankLine(ankle, deg);
      return assemble({
        pelvis,
        up: dir,
        front,
        headUp: add(dir, [0, 0.1, 0]),
        limb: (s) => ({
          wrist: [27, 4, s * 23],
          tip: [44, 1, s * 25],
          elbowPole: [-0.75, 0.25, s * 0.6],
          ...tucked(ankle, s),
          knee: add(add(ankle, [0, 0, s * 10]), mul(dir, L.shin)),
        }),
      });
    },
    works: { main: ['chest', 'triceps', 'frontDelt'], help: ['abs', 'obliques'] },
    cameras: { side: SIDE, front: unit([0.8, 0.12, 0.7]) },
    floor: { x: -35, r: 88 },
    mover: (p) => p.neck,
    arrow: 'right',
  },

  /** Bar on the upper back, feet a bit wider than the hips, hips back and down until the thighs
      are level, the bar over the middle of the foot, knees out over the toes. */
  'barbell-squat': {
    pose: (d) => {
      const pelvis: V3 = [lerp(-3, -20, d), lerp(94, 47, d), 0];
      const t = lean(lerp(6, 40, d));
      const neck = add(pelvis, mul(t.up, L.torso));
      const bar = add(add(neck, mul(t.front, -9)), mul(t.up, -4));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(6, 40, d) * 0.5).up,
        limb: (s) => ({
          wrist: add(bar, [-1, -5, s * 27]),
          tip: add(bar, [4, 3, s * 27]),
          elbowPole: add(mul(t.front, -0.45), [0, -1, s * 0.25]),
          ...flatFoot(0, 15, s, 4.5),
          kneePole: [1, 0.1, s * 0.5],
        }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    works: { main: ['quads', 'glutes'], help: ['adductors', 'hamstrings', 'lowerBack', 'calves'] },
    cameras: { side: SIDE, front: unit([1, 0.32, 0.4]) },
    floor: { x: 0, r: 46 },
    mover: (p) => p.pelvis,
    arrow: 'left',
  },

  /** Bodyweight squat: arms forward for balance, hips back and down to level thighs. */
  squat: {
    pose: (d, v) => {
      const pelvis: V3 = [lerp(-2, -18, d), lerp(94, 48, d), 0];
      const t = lean(lerp(4, 34, d));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(4, 34, d) * 0.4).up,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const legs = { ...flatFoot(0, 13, s), kneePole: [1, 0.1, s * 0.45] as V3 };
          // Goblet: one weight held at the chest, elbows down. Dumbbells: arms hang at the sides.
          if (v.goblet) {
            const wrist = add(add(sh, mul(t.front, 22)), [0, -16, -s * 12]);
            return { wrist, tip: add(wrist, [0, 9, -s * 4]), elbowPole: [0.3, -1, s * 0.6], ...legs };
          }
          if (v.gear === 'dumbbell') {
            const wrist = add(sh, [3, -54, s * 3]);
            return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0], ...legs };
          }
          const wrist = add(sh, [lerp(24, 52, d), lerp(-48, -6, d), -s * 5]);
          return { wrist, tip: handOut(sh, wrist), elbowPole: [0, -1, s * 0.3], ...legs };
        },
        props: v.goblet
          ? [{ kind: 'dumbbell', at: add(add(shoulderOf(pelvis, t.up, 0), mul(t.front, 24)), [0, -10, 0]) }]
          : [],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['quads', 'glutes'], help: ['adductors', 'hamstrings', 'lowerBack'] },
    cameras: { side: SIDE, front: unit([1, 0.32, 0.4]) },
    floor: { x: 0, r: 46 },
    mover: (p) => p.pelvis,
    arrow: 'left',
  },

  /** Split squat: right foot forward, left on its toes behind; straight down until the back knee
      nearly touches the floor, the body upright. */
  lunge: {
    pose: (d) => {
      const pelvis: V3 = [-4, lerp(85, 52, d), 0];
      const t = lean(lerp(2, 6, d));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const wrist = add(sh, [4, -54, s * 5]);
          const arm = { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0] as V3 };
          if (s > 0) return { ...arm, ...flatFoot(36, 10, s, 2), kneePole: [1, 0, 0.1] };
          return { ...arm, ankle: [-52, 13, -10], heel: [-57, 15, -10], toe: [-35, 1, -10], instep: unit([14, 21, 0]), kneePole: [1, -0.4, 0] };
        },
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['quads', 'glutes'], help: ['hamstrings', 'adductors', 'calves'] },
    cameras: { side: SIDE, front: unit([1, 0.3, 0.55]) },
    floor: { x: -8, r: 60 },
    mover: (p) => p.pelvis,
    arrow: 'left',
  },

  /** Conventional deadlift: from standing tall with the bar at the thighs down to the bar on the
      floor over the middle of the foot, back flat, shins near the bar. */
  deadlift: {
    pose: (d) => {
      const pelvis = mix([-3, 94, 0], [-26, 56, 0], d);
      const t = lean(lerp(2, 56, d));
      const bar = mix([0, 82, 0], [5, 22.5, 0], d);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(2, 56, d) * 0.6).up,
        limb: (s) => ({
          wrist: add(bar, [0, 4, s * 24]),
          tip: add(bar, [4, -3, s * 24]),
          elbowPole: [-0.3, -1, s * 0.2],
          ...flatFoot(-4, 14, s),
          kneePole: [1, 0, s * 0.35],
        }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['glutes', 'hamstrings', 'lowerBack'], help: ['quads', 'traps', 'lats', 'forearm'] },
    cameras: { side: SIDE, front: unit([1, 0.32, 0.5]) },
    floor: { x: 0, r: 50 },
    mover: barOf,
    arrow: 'left',
  },

  /** Lying on a bench, feet flat on the floor: the bar from straight arms over the shoulders down
      to the lower chest, elbows tucked a little. */
  'bench-press': {
    pose: (d, v) => {
      const pelvis: V3 = [-22, 54, 0];
      // Flat, or the back raised about 35 degrees on an incline bench.
      const tilt = rad(v.incline ? 35 : 3.4);
      const up: V3 = [Math.cos(tilt), Math.sin(tilt), 0];
      const front: V3 = [-Math.sin(tilt), Math.cos(tilt), 0];
      const over = add(shoulderOf(pelvis, up, 0), mul(front, 6));
      // The press goes straight up over the shoulders.
      const bar = mix(add(over, [0, 52, 0]), add(over, mul(front, 14)), d);
      const back = add(pelvis, mul(up, 6));
      return assemble({
        pelvis,
        up,
        front,
        headUp: unit(add(up, [0, -0.12, 0])),
        limb: (s) => ({
          wrist: add(bar, [0, -2, s * 38]),
          tip: add(bar, [1, 5, s * 38]),
          elbowPole: [-0.3, -1, s * 0.6],
          ...flatFoot(-64, 22, s, 6),
          kneePole: [0, 1, s * 0.3],
        }),
        props: [
          ...(v.incline
            ? [
                { kind: 'bench' as const, from: [-40, 44, 0] as V3, to: [-14, 44, 0] as V3 },
                { kind: 'bench' as const, from: add(back, [0, -10, 0]), to: add(add(back, mul(up, 66)), [0, -10, 0]) },
              ]
            : [{ kind: 'bench' as const, from: [-40, 44, 0] as V3, to: [62, 44, 0] as V3 }]),
          { kind: 'barbell', at: bar },
        ],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['chest', 'triceps', 'frontDelt'], help: [] },
    cameras: { side: SIDE, front: unit([1, 0.5, 0.3]) },
    camerasFor: (v) => (v.incline ? { front: unit([0.45, 0.4, 0.8]) } : {}),
    names: { front: 'Head end' },
    floor: { x: -15, r: 85 },
    mover: barOf,
    arrow: 'right',
  },

  /** Standing overhead press: the bar from the front of the shoulders to straight arms overhead,
      the head moving back out of its way. */
  'shoulder-press': {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(-3);
      const bar = mix([13, 142, 0], [2, 197, 0], d);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(-10, -2, d)).up,
        limb: (s) => ({
          wrist: add(bar, [0, -3, s * 24]),
          tip: add(bar, [-1, 6, s * 24]),
          elbowPole: [0.5, -1, s * 0.8],
          ...flatFoot(0, 12, s),
          kneePole: [1, 0, s * 0.2],
        }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['frontDelt', 'sideDelt', 'triceps'], help: ['traps', 'abs', 'chest'] },
    cameras: { side: SIDE, front: unit([1, 0.15, 0.45]) },
    floor: { x: 0, r: 46 },
    mover: barOf,
    arrow: 'left',
  },

  /** Bent-over row: hips back, back flat at about 50 degrees, the bar from hanging arms up to the
      belly, elbows driving back. */
  'barbell-row': {
    pose: (d) => {
      const pelvis: V3 = [-22, 82, 0];
      const t = lean(52);
      const bar = mix([14, 52, 0], [5, 84, 0], d);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(36).up,
        limb: (s) => ({
          wrist: add(bar, [0, 3, s * 24]),
          tip: add(bar, [3, -4, s * 24]),
          elbowPole: [-1, 0.5, s * 0.25],
          ...flatFoot(0, 14, s),
          kneePole: [1, 0, s * 0.3],
        }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['lats', 'rearDelt', 'traps'], help: ['biceps', 'lowerBack', 'hamstrings', 'forearm'] },
    cameras: { side: SIDE, front: unit([-0.6, 0.5, 0.6]) },
    names: { front: 'Back' },
    floor: { x: -6, r: 50 },
    mover: barOf,
    arrow: 'left',
  },

  /** Pull-up: from a dead hang to the chin over the bar, the body leaning back a little so the
      head clears it, legs quiet. */
  pullup: {
    pose: (d) => {
      const pelvis: V3 = [lerp(-3, -6, d), lerp(118, 165, d), 0];
      const t = lean(lerp(-4, -14, d));
      const bar: V3 = [0, 226, 0];
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(-2, 4, d)).up,
        limb: (s) => {
          const ankle = add(pelvis, [-10, -84, s * 7]);
          return {
            wrist: [0, 222, s * 30],
            tip: add(bar, [5, 2, s * 30]),
            elbowPole: [0.5, -0.6, s],
            ankle,
            heel: add(ankle, [-4, -2, 0]),
            toe: add(ankle, [12, -14, 0]),
            instep: [0.75, 0.65, 0],
            kneePole: [1, 0, 0],
          };
        },
        props: [{ kind: 'pullbar', at: bar }],
      });
    },
    works: { main: ['lats', 'biceps'], help: ['rearDelt', 'traps', 'forearm', 'abs'] },
    cameras: { side: SIDE, front: unit([-1, 0.05, 0.45]) },
    names: { front: 'Back' },
    mover: (p) => p.neck,
    arrow: 'right',
  },

  /** Forearm plank: elbows under the shoulders, one straight line from heels to head. A hold. */
  plank: {
    pose: () => {
      const ankle: V3 = [-103, 12, 0];
      const deg = (Math.asin((34 - ankle[1]) / (L.shin + L.thigh + SHOULDER_UP)) * 180) / Math.PI;
      const { dir, front, pelvis } = plankLine(ankle, deg);
      return assemble({
        pelvis,
        up: dir,
        front,
        headUp: add(dir, [0, 0.05, 0]),
        limb: (s) => ({
          elbow: [30, 4.5, s * 16],
          wrist: [54, 3.5, s * 7],
          tip: [64, 3, s * 4],
          ...tucked(ankle, s),
          knee: add(add(ankle, [0, 0, s * 10]), mul(dir, L.shin)),
        }),
      });
    },
    works: { main: ['abs', 'obliques'], help: ['frontDelt', 'quads', 'glutes'] },
    cameras: { side: SIDE, front: unit([0.8, 0.25, 0.7]) },
    floor: { x: -35, r: 88 },
    arrow: 'right',
  },

  /** Standing dumbbell curl: elbows still at the sides, the forearms from hanging to up by the
      shoulders, palms up. */
  curl: {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(1);
      const deg = lerp(-86, 62, d);
      const fdir: V3 = [Math.cos(rad(deg)), Math.sin(rad(deg)), 0];
      const elbowOf = (s: number) => add(shoulderOf(pelvis, t.up, s), [2, -29.5, s * 1.5]);
      const wristOf = (s: number) => add(elbowOf(s), mul(fdir, L.fore));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => ({ elbow: elbowOf(s), wrist: wristOf(s), tip: add(wristOf(s), mul(fdir, 15)), ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] }),
        props: [-1, 1].map((s) => ({ kind: 'dumbbell' as const, at: add(wristOf(s), mul(fdir, 6)) })),
      });
    },
    swaps: ['barbell'],
    works: { main: ['biceps'], help: ['forearm', 'frontDelt'] },
    cameras: { side: SIDE, front: unit([1, 0.15, 0.4]) },
    floor: { x: 0, r: 46 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Glute bridge: lying on the back, feet flat near the hips, the hips up until knees, hips and
      shoulders make one line. */
  bridge: {
    pose: (d) => {
      const neck: V3 = [40, 11, 0];
      const a = rad(lerp(3, 34, d));
      const up: V3 = [Math.cos(a), -Math.sin(a), 0];
      const pelvis = sub(neck, mul(up, L.torso));
      return assemble({
        pelvis,
        up,
        front: [Math.sin(a), Math.cos(a), 0],
        headUp: [1, 0.02, 0],
        limb: (s) => ({
          wrist: [-20, 3.5, s * 22],
          tip: [-37, 2, s * 23],
          elbowPole: [0, 1, s * 0.5],
          ...flatFoot(-48, 13, s, 2),
          kneePole: [0, 1, s * 0.2],
        }),
      });
    },
    works: { main: ['glutes'], help: ['hamstrings', 'lowerBack'] },
    cameras: { side: SIDE, front: unit([-0.45, 0.12, 0.9]) },
    names: { front: 'Side, low' },
    floor: { x: -5, r: 75 },
    mover: (p) => p.pelvis,
    arrow: 'left',
  },

  /** Romanian deadlift: knees soft and still, hips pushed back until the bar is at mid-shin, back
      flat, the bar sliding down the thighs. */
  rdl: {
    pose: (d) => {
      const pelvis = mix([-3, 94, 0], [-24, 88, 0], d);
      const t = lean(lerp(3, 72, d));
      const bar = mix([3, 76, 0], [12, 34, 0], d);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(3, 72, d) * 0.75).up,
        limb: (s) => ({
          wrist: add(bar, [0, 4, s * 24]),
          tip: add(bar, [4, -3, s * 24]),
          elbowPole: [-0.3, -1, s * 0.2],
          ...flatFoot(-2, 13, s),
          kneePole: [1, 0, s * 0.2],
        }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['hamstrings', 'glutes'], help: ['lowerBack', 'forearm', 'traps'] },
    cameras: { side: SIDE, front: unit([1, 0.32, 0.5]) },
    floor: { x: 0, r: 50 },
    mover: barOf,
    arrow: 'left',
  },

  /** Good morning: the bar on the upper back, knees soft, hips back until the back is nearly level. */
  'good-morning': {
    pose: (d) => {
      const pelvis = mix([-3, 94, 0], [-20, 90, 0], d);
      const deg = lerp(3, 72, d);
      const t = lean(deg);
      const neck = add(pelvis, mul(t.up, L.torso));
      const bar = add(add(neck, mul(t.front, -9)), mul(t.up, -4));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(deg * 0.7).up,
        limb: (s) => ({
          wrist: add(bar, [-1, -5, s * 27]),
          tip: add(bar, [4, 3, s * 27]),
          elbowPole: add(mul(t.front, -0.45), [0, -1, s * 0.25]),
          ...flatFoot(-2, 13, s),
          kneePole: [1, 0, s * 0.2],
        }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    works: { main: ['hamstrings', 'glutes', 'lowerBack'], help: ['abs'] },
    cameras: { side: SIDE, front: unit([1, 0.32, 0.5]) },
    floor: { x: 0, r: 50 },
    mover: (p) => p.neck,
    arrow: 'left',
  },

  /** Step-up: the right foot on a knee-high box, drive through it until standing on the box. */
  'step-up': {
    pose: (d) => {
      const pelvis = mix([0, 92, 0], [26, 134, 0], d);
      const t = lean(lerp(12, 2, d));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const wrist = add(sh, [4, -54, s * 4]);
          const arm = { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0] as V3 };
          if (s > 0) return { ...arm, ...footAt([30, 48, 10], 1, 2), kneePole: [1, 0, 0.1] };
          return { ...arm, ...footAt(mix([-8, 8, -10], [20, 54, -10], d), -1, 2), kneePole: [1, 0, -0.1] };
        },
        props: [{ kind: 'box', at: [38, 0, 2], size: [42, 40, 56] }],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['quads', 'glutes'], help: ['hamstrings', 'calves'] },
    cameras: { side: SIDE, front: unit([1, 0.3, 0.55]) },
    floor: { x: 10, r: 55 },
    mover: (p) => p.pelvis,
    arrow: 'left',
  },

  /** Calf raise: up onto the balls of the feet as high as you can, knees straight, then all the way down. */
  'calf-raise': {
    pose: (d) => {
      const lift = 10 * d;
      const pelvis: V3 = [lerp(-2, 1, d), 94 + lift * 1.3, 0];
      const t = lean(1);
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const wrist = add(sh, [3, -54, s * 3]);
          const heel: V3 = [lerp(-6, -2, d), 3.5 + lift * 1.15, s * 11];
          const toe: V3 = [18.5, 2.5, s * 16];
          const a = Math.atan2(heel[1] - toe[1], toe[0] - heel[0]);
          return {
            wrist,
            tip: handOut(sh, wrist, 16),
            elbowPole: [-1, 0, 0],
            ankle: [lerp(0, 3, d), 8 + lift * 1.15, s * 12],
            heel,
            toe,
            instep: [Math.sin(a), Math.cos(a), 0],
            kneePole: [1, 0, s * 0.2],
          };
        },
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['calves'], help: [] },
    cameras: { side: SIDE, front: unit([-0.8, 0.2, 0.5]) },
    names: { front: 'Back' },
    floor: { x: 0, r: 46 },
    mover: (p) => p.right.heel,
    arrow: 'left',
  },

  /** Lateral raise: dumbbells from the sides out and up to shoulder height, elbows soft, leading
      with the elbows. */
  'lateral-raise': {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(2);
      const th = rad(lerp(8, 84, d));
      const wristOf = (s: number) => add(shoulderOf(pelvis, t.up, s), mul(unit([0.12, -Math.cos(th), s * Math.sin(th)]), 53));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => ({ wrist: wristOf(s), tip: handOut(shoulderOf(pelvis, t.up, s), wristOf(s), 16), elbowPole: [-1, 0.3, 0], ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] }),
        props: [-1, 1].map((s) => ({ kind: 'dumbbell' as const, at: handOut(shoulderOf(pelvis, t.up, s), wristOf(s), 6) })),
      });
    },
    works: { main: ['sideDelt'], help: ['frontDelt', 'traps'] },
    cameras: { side: SIDE, front: unit([1, 0.15, 0.3]) },
    floor: { x: 0, r: 46 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Rear delt fly: bent over with a flat back, dumbbells from hanging out to the sides,
      squeezing the shoulder blades. */
  'rear-delt-fly': {
    pose: (d) => {
      const pelvis: V3 = [-22, 82, 0];
      const t = lean(62);
      const th = rad(lerp(6, 80, d));
      const wristOf = (s: number) => add(shoulderOf(pelvis, t.up, s), mul(unit([0.1, -Math.cos(th), s * Math.sin(th)]), 53));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(45).up,
        limb: (s) => ({ wrist: wristOf(s), tip: handOut(shoulderOf(pelvis, t.up, s), wristOf(s), 16), elbowPole: [-0.5, 1, 0], ...flatFoot(0, 14, s), kneePole: [1, 0, s * 0.3] }),
        props: [-1, 1].map((s) => ({ kind: 'dumbbell' as const, at: handOut(shoulderOf(pelvis, t.up, s), wristOf(s), 6) })),
      });
    },
    works: { main: ['rearDelt'], help: ['traps', 'lats'] },
    cameras: { side: SIDE, front: unit([-0.6, 0.5, 0.6]) },
    names: { front: 'Back' },
    floor: { x: -6, r: 50 },
    mover: (p) => p.right.wrist,
    arrow: 'left',
  },

  /** Shrug: arms straight, shoulders straight up to the ears, a pause, then down. */
  shrug: {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(2);
      const lift = 7 * d;
      const bar: V3 = [8, 76 + lift, 0];
      return assemble({
        pelvis,
        ...t,
        shrug: lift,
        limb: (s) => ({ wrist: add(bar, [0, 4, s * 23]), tip: add(bar, [4, -3, s * 23]), elbowPole: [-1, 0, 0], ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['traps'], help: ['forearm'] },
    cameras: { side: SIDE, front: unit([-0.8, 0.25, 0.5]) },
    names: { front: 'Back' },
    floor: { x: 0, r: 46 },
    mover: (p) => p.right.shoulder,
    arrow: 'left',
  },

  /** Triceps pushdown: facing a high cable, elbows pinned at the sides, the handle from chest
      height down until the arms are straight. */
  'triceps-pushdown': {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(8);
      const deg = lerp(28, -84, d);
      const fdir: V3 = [Math.cos(rad(deg)), Math.sin(rad(deg)), 0];
      const elbowOf = (s: number) => add(shoulderOf(pelvis, t.up, s), [4, -29, s * 0.5]);
      const wristOf = (s: number) => add(elbowOf(s), mul(fdir, L.fore));
      const handle = mix(wristOf(-1), wristOf(1), 0.5);
      return assemble({
        pelvis,
        ...t,
        limb: (s) => ({ elbow: elbowOf(s), wrist: wristOf(s), tip: add(wristOf(s), mul(fdir, 15)), ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] }),
        props: [
          { kind: 'box', at: [62, 0, 0], size: [14, 215, 32] },
          { kind: 'cable', from: [52, 205, 0], to: handle },
          { kind: 'pullbar', at: handle, half: 14 },
        ],
      });
    },
    works: { main: ['triceps'], help: ['forearm'] },
    cameras: { side: SIDE, front: unit([0.6, 0.2, 0.8]) },
    floor: { x: 15, r: 55 },
    mover: (p) => p.right.wrist,
    arrow: 'left',
  },

  /** Lat pulldown: seated, thighs under the pad, a wide grip; pull the bar to the top of the chest,
      chest up, leaning back a little. */
  'lat-pulldown': {
    pose: (d) => {
      const pelvis: V3 = [-4, 56, 0];
      const t = lean(lerp(-6, -16, d));
      const bar = mix([8, 186, 0], [16, 114, 0], d);
      return assemble({
        pelvis,
        ...t,
        limb: (s) => ({
          wrist: add(bar, [0, -2, s * 40]),
          tip: add(bar, [-1, 6, s * 40]),
          elbowPole: [-0.4, -1, s * 0.6],
          ...flatFoot(32, 13, s),
          kneePole: [0.5, 1, s * 0.2],
        }),
        props: [
          { kind: 'box', at: [-40, 0, 0], size: [14, 240, 50] },
          { kind: 'box', at: [-6, 0, 0], size: [38, 44, 40] },
          { kind: 'cable', from: [8, 236, 0], to: bar },
          { kind: 'pullbar', at: bar, half: 60 },
        ],
      });
    },
    works: { main: ['lats'], help: ['biceps', 'rearDelt', 'traps'] },
    cameras: { side: SIDE, front: unit([-1, 0.15, 0.45]) },
    names: { front: 'Back' },
    floor: { x: -5, r: 55 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Seated cable row: sitting tall, feet on the plate, knees soft; pull the handle to the belly,
      elbows close and back, then let the arms go long. */
  'seated-row': {
    pose: (d) => {
      const pelvis: V3 = [-22, 52, 0];
      const t = lean(lerp(8, -4, d));
      const handle = mix([38, 72, 0], [6, 76, 0], d);
      return assemble({
        pelvis,
        ...t,
        limb: (s) => ({
          wrist: add(handle, [0, 0, s * 7]),
          tip: add(handle, [5, 0, s * 7]),
          elbowPole: [-1, -0.3, s * 0.3],
          ankle: [32, 16, s * 13],
          heel: [29, 7, s * 13],
          toe: [36, 31, s * 14],
          instep: [-0.95, 0.3, 0],
          kneePole: [0, 1, s * 0.2],
        }),
        props: [
          { kind: 'box', at: [-22, 0, 0], size: [40, 40, 40] },
          { kind: 'box', at: [40, 0, 0], size: [6, 40, 56] },
          { kind: 'cable', from: [46, 22, 0], to: handle },
          { kind: 'pullbar', at: handle, half: 10 },
        ],
      });
    },
    works: { main: ['lats', 'traps'], help: ['biceps', 'rearDelt'] },
    cameras: { side: SIDE, front: unit([-0.6, 0.4, 0.7]) },
    names: { front: 'Back' },
    floor: { x: 5, r: 65 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Inverted row: under a bar at hip height, heels on the floor, the body one straight line;
      pull the chest to the bar. */
  'inverted-row': {
    pose: (d) => {
      const ankle: V3 = [-112, 9, 0];
      const shoulderY = lerp(42, 80, d);
      const reach = L.shin + L.thigh + SHOULDER_UP;
      const a = Math.asin((shoulderY - ankle[1]) / reach);
      const dir: V3 = [Math.cos(a), Math.sin(a), 0];
      const pelvis = add(ankle, mul(dir, L.shin + L.thigh));
      const bar: V3 = [12, 96, 0];
      return assemble({
        pelvis,
        up: dir,
        front: [-Math.sin(a), Math.cos(a), 0],
        headUp: dir,
        limb: (s) => {
          const an = add(ankle, [0, 0, s * 10]);
          return {
            wrist: add(bar, [0, -3, s * 30]),
            tip: add(bar, [-3, 5, s * 30]),
            elbowPole: [-0.6, -0.4, s * 0.6],
            ankle: an,
            heel: add(an, [-3, -6, 0]),
            toe: add(an, [5, 12, 0]),
            instep: [0.9, -0.4, 0],
            knee: add(an, mul(dir, L.shin)),
          };
        },
        props: [
          { kind: 'box', at: [bar[0], 0, -62], size: [5, bar[1], 5] },
          { kind: 'box', at: [bar[0], 0, 62], size: [5, bar[1], 5] },
          { kind: 'pullbar', at: bar, half: 62 },
        ],
      });
    },
    works: { main: ['lats', 'traps'], help: ['biceps', 'rearDelt', 'abs'] },
    cameras: { side: SIDE, front: unit([0.35, 0.3, 0.9]) },
    names: { front: 'Above' },
    floor: { x: -45, r: 85 },
    mover: (p) => p.neck,
    arrow: 'right',
  },

  /** Dips: on parallel bars, arms straight; lower until the elbows are at a right angle, leaning a
      little forward, then press back up. */
  dips: {
    pose: (d) => {
      const t = lean(lerp(8, 24, d));
      const sh: V3 = [lerp(-1, 5, d), lerp(166, 132, d), 0];
      const pelvis = sub(sh, mul(t.up, SHOULDER_UP));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(8, 24, d) * 0.6).up,
        limb: (s) => {
          const ankle = add(pelvis, [-28, -74, s * 5]);
          return {
            wrist: [2, 113, s * 26],
            tip: [12, 112, s * 26],
            elbowPole: [-1, 0, s * 0.15],
            ankle,
            heel: add(ankle, [-4, -2, 0]),
            toe: add(ankle, [12, -14, 0]),
            instep: [0.75, 0.65, 0],
            kneePole: [1, 0, 0],
          };
        },
        props: [{ kind: 'bars', at: [4, 110, 0] }],
      });
    },
    works: { main: ['triceps', 'chest'], help: ['frontDelt'] },
    cameras: { side: SIDE, front: unit([1, 0.2, 0.55]) },
    floor: { x: 0, r: 50 },
    mover: (p) => p.neck,
    arrow: 'left',
  },

  /** Crunch: on the back, knees bent, feet flat; curl the shoulders off the floor reaching for the
      knees, lower back stays down. */
  crunch: {
    pose: (d) => {
      const pelvis: V3 = [-10, 12, 0];
      const a = rad(lerp(1, 32, d));
      const up: V3 = [Math.cos(a), Math.sin(a), 0];
      const nod = rad(lerp(1, 48, d));
      return assemble({
        pelvis,
        up,
        front: [-Math.sin(a), Math.cos(a), 0],
        headUp: [Math.cos(nod), Math.sin(nod), 0],
        limb: (s) => {
          const sh = shoulderOf(pelvis, up, s);
          const foot = flatFoot(-52, 13, s, 2);
          const knee = ik(add(pelvis, [0, 0, s * 9]), foot.ankle, L.thigh, L.shin, [0, 1, s * 0.2]);
          const wrist = add(sh, mul(unit(sub(add(knee, [0, -6, 0]), sh)), 52));
          return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [0, 1, s * 0.3], ...foot, knee };
        },
      });
    },
    works: { main: ['abs'], help: ['obliques'] },
    cameras: { side: SIDE, front: unit([0.35, 0.4, 0.85]) },
    floor: { x: -10, r: 70 },
    mover: (p) => p.neck,
    arrow: 'right',
  },

  /** Side plank: on one forearm, the elbow under the shoulder, feet stacked, the body one straight
      line from heels to head, the top arm up. A hold. */
  'side-plank': {
    pose: () => {
      const mid: V3 = [-103, 10, 0];
      // The angle that puts the lower shoulder over the elbow on the floor.
      let a = 0.3;
      for (let i = 0; i < 8; i++) a = Math.asin((24 + SHOULDER_OUT * Math.cos(a)) / (L.shin + L.thigh + SHOULDER_UP));
      const dir: V3 = [Math.cos(a), Math.sin(a), 0];
      const front: V3 = [0, 0, 1];
      const side = unit(cross(front, dir));
      const pelvis = add(mid, mul(dir, L.shin + L.thigh));
      return assemble({
        pelvis,
        up: dir,
        front,
        side,
        limb: (s) => {
          const sh = add(add(pelvis, mul(dir, SHOULDER_UP)), mul(side, s * SHOULDER_OUT));
          const ankle = add(mid, mul(side, s * 6));
          const feet = { ankle, heel: add(add(ankle, mul(front, -5)), mul(dir, -4)), toe: add(add(ankle, mul(front, 16)), mul(dir, -5)), instep: dir, knee: add(ankle, mul(dir, L.shin)) };
          if (s < 0) {
            const elbow: V3 = [sh[0], 4.5, 4];
            return { elbow, wrist: add(elbow, [0, -1, L.fore]), tip: add(elbow, [0, -2, L.fore + 15]), ...feet };
          }
          const wrist = add(sh, mul(side, 55.95));
          return { wrist, tip: add(wrist, mul(side, 16)), elbowPole: [-1, 0, 0], ...feet };
        },
      });
    },
    works: { main: ['obliques'], help: ['abs', 'glutes', 'sideDelt'] },
    cameras: { side: SIDE, front: unit([0.3, 0.7, 0.65]) },
    names: { front: 'Above' },
    floor: { x: -40, r: 85 },
    arrow: 'right',
  },

  /** Hanging knee raise: from a dead hang, bring the knees up to the chest without swinging, then
      lower slowly. */
  'knee-raise': {
    pose: (d) => {
      const pelvis: V3 = [lerp(-3, -6, d), lerp(118, 124, d), 0];
      const t = lean(lerp(-4, 4, d));
      const bar: V3 = [0, 226, 0];
      const th = rad(lerp(4, 100, d));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const hip = add(pelvis, [0, 0, s * 9]);
          const knee = add(hip, mul([Math.sin(th), -Math.cos(th), 0], L.thigh));
          const ankle = add(knee, mul(unit([lerp(0.05, -0.1, d), -1, 0]), L.shin));
          return {
            wrist: [0, 222, s * 30],
            tip: add(bar, [5, 2, s * 30]),
            elbowPole: [0.5, -0.6, s],
            knee,
            ankle,
            heel: add(ankle, [-4, -2, 0]),
            toe: add(ankle, [12, -14, 0]),
            instep: [0.75, 0.65, 0],
          };
        },
        props: [{ kind: 'pullbar', at: bar }],
      });
    },
    works: { main: ['abs'], help: ['obliques', 'forearm'] },
    cameras: { side: SIDE, front: unit([1, 0.1, 0.5]) },
    mover: (p) => p.right.knee,
    arrow: 'right',
  },

  /** Overhead triceps extension: one dumbbell in both hands, upper arms still by the head, the
      weight lowered behind the head and pressed back up. */
  'triceps-overhead': {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(2);
      const deg = lerp(80, 215, d);
      const elbowOf = (s: number) => add(shoulderOf(pelvis, t.up, s), mul(unit([0.2, 1, -s * 0.15]), L.upper));
      const fdir = (s: number) => unit([Math.cos(rad(deg)), Math.sin(rad(deg)), -s * 0.25]);
      const wristOf = (s: number) => add(elbowOf(s), mul(fdir(s), L.fore));
      const bell = mix(add(wristOf(-1), mul(fdir(-1), 6)), add(wristOf(1), mul(fdir(1), 6)), 0.5);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(6).up,
        limb: (s) => ({ elbow: elbowOf(s), wrist: wristOf(s), tip: add(wristOf(s), mul(fdir(s), 14)), ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] }),
        props: [{ kind: 'dumbbell', at: bell }],
      });
    },
    fits: /^(?!.*(cable|machine|sled|band|pulley|rope)).*(extension|press)/i,
    works: { main: ['triceps'], help: ['forearm', 'abs'] },
    cameras: { side: SIDE, front: unit([1, 0.2, 0.55]) },
    floor: { x: 0, r: 46 },
    mover: (p) => p.right.wrist,
    arrow: 'left',
  },

  /** Skull crusher: lying on a bench, upper arms still and leaning a little back; the bar from
      over the chest down to just over the forehead, then back up. */
  'skull-crusher': {
    pose: (d) => {
      const pelvis: V3 = [-22, 54, 0];
      const tilt = rad(3.4);
      const up: V3 = [Math.cos(tilt), Math.sin(tilt), 0];
      const front: V3 = [-Math.sin(tilt), Math.cos(tilt), 0];
      const deg = lerp(80, -28, d);
      const fdir: V3 = [Math.cos(rad(deg)), Math.sin(rad(deg)), 0];
      const elbowOf = (s: number) => add(shoulderOf(pelvis, up, s), mul(unit([0.22, 1, -s * 0.12]), L.upper));
      const wristOf = (s: number): V3 => {
        const w = add(elbowOf(s), mul(fdir, L.fore));
        return [w[0], w[1], s * 14];
      };
      const bar = mix(add(wristOf(-1), mul(fdir, 6)), add(wristOf(1), mul(fdir, 6)), 0.5);
      return assemble({
        pelvis,
        up,
        front,
        headUp: unit(add(up, [0, -0.12, 0])),
        limb: (s) => ({ elbow: elbowOf(s), wrist: wristOf(s), tip: add(wristOf(s), mul(fdir, 14)), ...flatFoot(-64, 22, s, 6), kneePole: [0, 1, s * 0.3] }),
        props: [
          { kind: 'bench', from: [-40, 44, 0], to: [62, 44, 0] },
          { kind: 'barbell', at: bar },
        ],
      });
    },
    swaps: ['dumbbell'],
    fits: /^(?!.*(cable|band|jm press|tate)).*/i,
    works: { main: ['triceps'], help: ['forearm'] },
    cameras: { side: SIDE, front: unit([-0.75, 0.5, 0.45]) },
    names: { front: 'Feet end' },
    floor: { x: -15, r: 85 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Triceps kickback: bent over with a flat back, upper arms still along the body; the forearms
      from hanging down to straight back. */
  'triceps-kickback': {
    pose: (d) => {
      const pelvis: V3 = [-18, 86, 0];
      const t = lean(58);
      const deg = lerp(-88, -178, d);
      const fdir: V3 = [Math.cos(rad(deg)), Math.sin(rad(deg)), 0];
      const elbowOf = (s: number) => add(shoulderOf(pelvis, t.up, s), mul(unit([-1, 0.1, s * 0.1]), L.upper));
      const wristOf = (s: number) => add(elbowOf(s), mul(fdir, L.fore));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(45).up,
        limb: (s) => ({ elbow: elbowOf(s), wrist: wristOf(s), tip: add(wristOf(s), mul(fdir, 15)), ...flatFoot(0, 13, s), kneePole: [1, 0, s * 0.3] }),
        props: [-1, 1].map((s) => ({ kind: 'dumbbell' as const, at: add(wristOf(s), mul(fdir, 6)) })),
      });
    },
    works: { main: ['triceps'], help: ['rearDelt'] },
    cameras: { side: SIDE, front: unit([-0.6, 0.35, 0.7]) },
    names: { front: 'Back' },
    floor: { x: -6, r: 50 },
    mover: (p) => p.right.wrist,
    arrow: 'left',
  },

  /** Front raise: arms almost straight, the weights from the thighs up in front to shoulder
      height, no swing. */
  'front-raise': {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(2);
      const th = rad(lerp(8, 90, d));
      const wristOf = (s: number) => add(shoulderOf(pelvis, t.up, s), mul(unit([Math.sin(th), -Math.cos(th), -s * 0.08]), 53));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => ({ wrist: wristOf(s), tip: handOut(shoulderOf(pelvis, t.up, s), wristOf(s), 16), elbowPole: [0, -1, s * 0.3], ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] }),
        props: [-1, 1].map((s) => ({ kind: 'dumbbell' as const, at: handOut(shoulderOf(pelvis, t.up, s), wristOf(s), 6) })),
      });
    },
    swaps: ['barbell'],
    fits: /^(?!.*(cable|incline|spell|over ?head|above head)).*raise/i,
    works: { main: ['frontDelt'], help: ['sideDelt', 'traps'] },
    cameras: { side: SIDE, front: unit([1, 0.15, 0.5]) },
    floor: { x: 0, r: 46 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Upright row: a close grip, the bar up along the body to the chest, the elbows leading high
      and out. */
  'upright-row': {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(2);
      const bar = mix([7, 82, 0], [9, 128, 0], d);
      return assemble({
        pelvis,
        ...t,
        limb: (s) => ({ wrist: add(bar, [0, 4, s * 11]), tip: add(bar, [4, -3, s * 11]), elbowPole: [0, 1, s], ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] }),
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    swaps: ['dumbbell'],
    works: { main: ['sideDelt', 'traps'], help: ['frontDelt', 'biceps'] },
    cameras: { side: SIDE, front: unit([1, 0.15, 0.4]) },
    floor: { x: 0, r: 46 },
    mover: barOf,
    arrow: 'right',
  },

  /** Wrist curl: seated, forearms resting on the thighs, wrists just past the knees; only the
      hands move, curling the weight up. */
  'wrist-curl': {
    pose: (d) => {
      const pelvis: V3 = [-22, 54, 0];
      const t = lean(38);
      const hand = rad(lerp(-65, 60, d));
      const hdir: V3 = [Math.cos(hand), Math.sin(hand), 0];
      return assemble({
        pelvis,
        ...t,
        headUp: lean(25).up,
        limb: (s) => {
          const foot = flatFoot(22, 14, s, 3);
          const knee = ik(add(pelvis, [0, 0, s * 9]), foot.ankle, L.thigh, L.shin, [1, 1, s * 0.1]);
          const wrist = add(knee, [4, 6, -s * 2]);
          const elbow = add(wrist, [-L.fore, 1, 0]);
          return { elbow, wrist, tip: add(wrist, mul(hdir, 15)), ...foot, knee };
        },
        props: [
          { kind: 'bench', from: [-48, 44, 0], to: [0, 44, 0] },
          ...[-1, 1].map((s) => {
            const foot = flatFoot(22, 14, s, 3);
            const knee = ik(add(pelvis, [0, 0, s * 9]), foot.ankle, L.thigh, L.shin, [1, 1, s * 0.1]);
            return { kind: 'dumbbell' as const, at: add(add(knee, [4, 6, -s * 2]), mul(hdir, 6)) };
          }),
        ],
      });
    },
    swaps: ['barbell'],
    fits: /^(?!.*(cable|pulley|behind)).*wrist curl/i,
    works: { main: ['forearm'], help: [] },
    cameras: { side: SIDE, front: unit([1, 0.3, 0.45]) },
    floor: { x: 0, r: 55 },
    mover: (p) => p.right.tip,
    arrow: 'right',
  },

  /** Chest fly: lying on a bench, elbows soft and fixed; the weights open wide in an arc down to
      chest level, then hug back together over the chest. */
  'chest-fly': {
    pose: (d) => {
      const pelvis: V3 = [-22, 54, 0];
      const tilt = rad(3.4);
      const up: V3 = [Math.cos(tilt), Math.sin(tilt), 0];
      const front: V3 = [-Math.sin(tilt), Math.cos(tilt), 0];
      const th = rad(lerp(8, 82, d));
      const wristOf = (s: number) => add(shoulderOf(pelvis, up, s), mul(add(mul(front, Math.cos(th)), [0, 0, s * Math.sin(th)]), 53));
      return assemble({
        pelvis,
        up,
        front,
        headUp: unit(add(up, [0, -0.12, 0])),
        limb: (s) => ({ wrist: wristOf(s), tip: handOut(shoulderOf(pelvis, up, s), wristOf(s), 16), elbowPole: [-0.3, -1, s * 0.8], ...flatFoot(-64, 22, s, 6), kneePole: [0, 1, s * 0.3] }),
        props: [
          { kind: 'bench', from: [-40, 44, 0], to: [62, 44, 0] },
          ...[-1, 1].map((s) => ({ kind: 'dumbbell' as const, at: handOut(shoulderOf(pelvis, up, s), wristOf(s), 6) })),
        ],
      });
    },
    fits: /dumbbell fly/i,
    works: { main: ['chest'], help: ['frontDelt'] },
    cameras: { side: SIDE, front: unit([1, 0.6, 0.25]) },
    names: { front: 'Head end' },
    floor: { x: -15, r: 85 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Pullover: lying on a bench, one dumbbell in both hands over the chest, arms nearly straight;
      lower it back behind the head, then pull it back over the chest. */
  pullover: {
    pose: (d) => {
      const pelvis: V3 = [-22, 54, 0];
      const tilt = rad(3.4);
      const up: V3 = [Math.cos(tilt), Math.sin(tilt), 0];
      const front: V3 = [-Math.sin(tilt), Math.cos(tilt), 0];
      const a = rad(lerp(4, 100, d));
      const dir = add(mul(front, Math.cos(a)), mul(up, Math.sin(a)));
      const wristOf = (s: number): V3 => {
        const w = add(shoulderOf(pelvis, up, s), mul(dir, 52));
        return [w[0], w[1], s * 7];
      };
      const bell = mix(add(wristOf(-1), mul(dir, 6)), add(wristOf(1), mul(dir, 6)), 0.5);
      return assemble({
        pelvis,
        up,
        front,
        headUp: unit(add(up, [0, -0.12, 0])),
        limb: (s) => ({ wrist: wristOf(s), tip: add(wristOf(s), mul(dir, 14)), elbowPole: add(mul(up, -0.3), [0, 0, s]), ...flatFoot(-64, 22, s, 6), kneePole: [0, 1, s * 0.3] }),
        props: [
          { kind: 'bench', from: [-40, 44, 0], to: [62, 44, 0] },
          { kind: 'dumbbell', at: bell },
        ],
      });
    },
    works: { main: ['lats', 'chest'], help: ['triceps', 'abs'] },
    cameras: { side: SIDE, front: unit([0.25, 0.6, 0.75]) },
    names: { front: 'Above' },
    floor: { x: -15, r: 85 },
    mover: barOf,
    arrow: 'right',
  },

  /** Straight-arm pulldown: facing a high cable, hips back a little, arms straight; sweep the bar
      down in an arc to the thighs. */
  'straight-arm-pulldown': {
    pose: (d) => {
      const pelvis: V3 = [-22, 92, 0];
      const t = lean(18);
      const th = rad(lerp(100, 12, d));
      const wristOf = (s: number) => add(shoulderOf(pelvis, t.up, s), mul(unit([Math.sin(th), -Math.cos(th), s * 0.05]), 54));
      const handle = mix(wristOf(-1), wristOf(1), 0.5);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(8).up,
        limb: (s) => ({ wrist: wristOf(s), tip: handOut(shoulderOf(pelvis, t.up, s), wristOf(s), 15), elbowPole: [-0.3, -1, s * 0.5], ...flatFoot(-12, 13, s), kneePole: [1, 0, s * 0.2] }),
        props: [
          { kind: 'box', at: [62, 0, 0], size: [14, 215, 32] },
          { kind: 'cable', from: [52, 205, 0], to: handle },
          { kind: 'pullbar', at: handle, half: 26 },
        ],
      });
    },
    works: { main: ['lats'], help: ['triceps', 'rearDelt', 'abs'] },
    cameras: { side: SIDE, front: unit([0.6, 0.2, 0.8]) },
    floor: { x: 10, r: 60 },
    mover: (p) => p.right.wrist,
    arrow: 'left',
  },

  /** Leg press: back on the pad, feet flat on the plate; bend the knees toward the chest without
      the hips lifting, then press the plate away, knees soft at the top. */
  'leg-press': {
    pose: (d) => {
      const pelvis: V3 = [-28, 44, 0];
      const t = lean(-50);
      // The sled runs up at 45 degrees; the plate faces back down it.
      const u = unit([0.7, 0.7, 0]);
      const along = unit([-0.7, 0.7, 0]);
      const foot = mix([38, 82, 0], [8, 52, 0], d);
      const plate = add(foot, mul(u, 9));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(-35).up,
        limb: (s) => {
          const ankle = add(foot, [0, 0, s * 13]);
          const wrist = add(pelvis, [10, -4, s * 26]);
          return {
            wrist,
            tip: add(wrist, [10, -2, 0]),
            elbowPole: [-1, 0, s * 0.3],
            ...footFrom(ankle, along, mul(u, -1)),
            kneePole: [-0.3, 1, s * 0.3],
          };
        },
        props: [
          { kind: 'bench', from: [-60, 34, 0], to: [-14, 34, 0] },
          { kind: 'bench', from: add(pelvis, add(mul(t.front, -10), mul(t.up, 2))), to: add(pelvis, add(mul(t.front, -10), mul(t.up, 62))), noLegs: true },
          { kind: 'bench', from: sub(plate, mul(along, 14)), to: add(plate, mul(along, 30)), noLegs: true },
        ],
      });
    },
    fits: /leg press/i,
    works: { main: ['quads', 'glutes'], help: ['hamstrings', 'adductors'] },
    cameras: { side: SIDE, front: unit([0.55, 0.3, 0.78]) },
    floor: { x: -10, r: 70 },
    mover: (p) => p.right.ankle,
    arrow: 'right',
  },

  /** Lying leg curl: face down, knees just off the pad; curl the heels up toward the glutes,
      hips pressed down, then lower slowly. */
  'leg-curl': {
    pose: (d) => {
      const pelvis: V3 = [-10, 58, 0];
      const sh = rad(lerp(180, 72, d));
      const shin: V3 = [Math.cos(sh), Math.sin(sh), 0];
      // Toes point down off the end of the pad, then back as the heel rises.
      const toes: V3 = [-shin[1], shin[0], 0];
      const at = (s: number) => add(add(pelvis, [-L.thigh, 0, s * 9]), mul(shin, L.shin));
      return assemble({
        pelvis,
        up: [1, 0.02, 0],
        front: [0, -1, 0],
        headUp: unit([1, 0.25, 0]),
        limb: (s) => {
          const knee = add(pelvis, [-L.thigh, 0, s * 9]);
          const elbow: V3 = [30, 32, s * 24];
          return { elbow, wrist: [54, 36, s * 21], tip: [68, 36, s * 21], knee, ...footFrom(at(s), toes, mul(shin, -1)) };
        },
        props: [
          { kind: 'bench', from: [-48, 48, 0], to: [62, 48, 0] },
          { kind: 'pullbar', at: sub(at(0), mul(toes, 7)), half: 17 },
        ],
      });
    },
    fits: /lying leg curl/i,
    works: { main: ['hamstrings'], help: ['calves'] },
    cameras: { side: SIDE, front: unit([-0.55, 0.55, 0.6]) },
    names: { front: 'Back' },
    floor: { x: 0, r: 80 },
    mover: (p) => p.right.ankle,
    arrow: 'left',
  },

  /** Leg extension: seated, back on the pad, the pad on the front of the ankles; straighten the
      knees until the legs are level, pause, then lower slowly. */
  'leg-extension': {
    pose: (d) => {
      const pelvis: V3 = [-20, 56, 0];
      const t = lean(-6);
      const sh = rad(lerp(-96, -6, d));
      const shin: V3 = [Math.cos(sh), Math.sin(sh), 0];
      const toes: V3 = [-shin[1], shin[0], 0];
      const at = (s: number) => add(add(pelvis, [L.thigh, -2, s * 9]), mul(shin, L.shin));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const wrist = add(pelvis, [8, -6, s * 27]);
          return { wrist, tip: add(wrist, [10, -3, 0]), elbowPole: [-1, 0, s * 0.3], knee: add(pelvis, [L.thigh, -2, s * 9]), ...footFrom(at(s), toes, mul(shin, -1)) };
        },
        props: [
          { kind: 'bench', from: [-42, 46, 0], to: [22, 46, 0] },
          { kind: 'bench', from: [-40, 50, 0], to: [-48, 116, 0], noLegs: true },
          { kind: 'pullbar', at: add(at(0), add(mul(toes, 8), mul(shin, -2))), half: 17 },
        ],
      });
    },
    works: { main: ['quads'], help: [] },
    cameras: { side: SIDE, front: unit([1, 0.25, 0.5]) },
    floor: { x: 0, r: 70 },
    mover: (p) => p.right.ankle,
    arrow: 'right',
  },

  /** Front squat: the bar resting on the front of the shoulders, elbows high; sit straight down
      with the chest up, then stand. */
  'front-squat': {
    pose: (d) => {
      const pelvis: V3 = [lerp(-2, -14, d), lerp(94, 47, d), 0];
      const t = lean(lerp(4, 22, d));
      const neck = add(pelvis, mul(t.up, L.torso));
      const bar = add(add(neck, mul(t.front, 9)), mul(t.up, -3));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(4, 22, d) * 0.4).up,
        limb: (s) => {
          const wrist = add(bar, [-1, 0, s * 21]);
          return { wrist, tip: add(wrist, add(mul(t.up, 6), mul(t.front, -4))), elbowPole: [1, 0.6, s * 0.35], ...flatFoot(0, 15, s, 4.5), kneePole: [1, 0.1, s * 0.5] };
        },
        props: [{ kind: 'barbell', at: bar }],
      });
    },
    fits: /front (barbell )?squat/i,
    works: { main: ['quads', 'glutes'], help: ['abs', 'adductors', 'lowerBack'] },
    cameras: { side: SIDE, front: unit([1, 0.32, 0.4]) },
    floor: { x: 0, r: 46 },
    mover: barOf,
    arrow: 'left',
  },

  /** Overhead squat: a wide grip, arms locked overhead with the bar over the middle of the foot;
      squat down with the chest up, then stand. */
  'overhead-squat': {
    pose: (d) => {
      const pelvis: V3 = [lerp(-2, -16, d), lerp(94, 48, d), 0];
      const t = lean(lerp(2, 18, d));
      const wristOf = (s: number) => {
        const sh = shoulderOf(pelvis, t.up, s);
        return add(sh, mul(unit([4 - sh[0], 34, s * 40]), 55));
      };
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(2, 18, d) * 0.4).up,
        limb: (s) => ({ wrist: wristOf(s), tip: add(wristOf(s), [3, 8, s * 2]), elbowPole: [-1, 0, 0], ...flatFoot(0, 16, s, 5), kneePole: [1, 0.1, s * 0.5] }),
        props: [{ kind: 'barbell', at: add(mix(wristOf(-1), wristOf(1), 0.5), [1, 4, 0]) }],
      });
    },
    fits: /^overhead squat/i,
    works: { main: ['quads', 'glutes'], help: ['frontDelt', 'traps', 'abs'] },
    cameras: { side: SIDE, front: unit([1, 0.3, 0.4]) },
    floor: { x: 0, r: 46 },
    mover: barOf,
    arrow: 'left',
  },

  /** Back extension: hips on the pad of a 45-degree bench, ankles locked; lower the chest toward
      the floor with a flat back, then rise until the body is one line. */
  'back-extension': {
    pose: (d) => {
      const ankle: V3 = [-40, 26, 0];
      const leg = unit([1, 1, 0]);
      const pelvis = add(ankle, mul(leg, L.shin + L.thigh));
      const a = rad(lerp(45, -72, d));
      const up: V3 = [Math.cos(a), Math.sin(a), 0];
      const front: V3 = [Math.sin(a), -Math.cos(a), 0];
      // The leg's front faces down along the bench; toes point that way, on the foot plate.
      const legFront: V3 = [leg[1], -leg[0], 0];
      return assemble({
        pelvis,
        up,
        front,
        limb: (s) => {
          const wrist = add(add(add(pelvis, mul(up, 40)), mul(front, 12)), [0, 0, -s * 9]);
          const at = add(ankle, [0, 0, s * 8]);
          return {
            wrist,
            tip: add(add(wrist, mul(up, 9)), [0, 0, -s * 4]),
            elbowPole: add(add(mul(front, 0.7), mul(up, -1)), [0, 0, s * 0.6]),
            ...footFrom(at, legFront, mul(leg, -1)),
            knee: add(at, mul(leg, L.shin)),
          };
        },
        props: [
          { kind: 'bench', from: add(pelvis, add(mul(legFront, 12), mul(leg, -30))), to: add(pelvis, add(mul(legFront, 12), mul(leg, 2))) },
          { kind: 'pullbar', at: add(ankle, add(mul(legFront, -8), mul(leg, 6))), half: 16 },
        ],
      });
    },
    fits: /back extension/i,
    works: { main: ['lowerBack', 'glutes'], help: ['hamstrings'] },
    cameras: { side: SIDE, front: unit([-0.35, 0.3, 0.9]) },
    names: { front: 'Back' },
    floor: { x: 0, r: 70 },
    mover: (p) => p.neck,
    arrow: 'right',
  },

  /** Glute kickback: on hands and knees, back flat; drive one knee-bent leg back and up until the
      thigh is level, without arching the back. */
  'kickback-glute': {
    pose: (d) => {
      const pelvis: V3 = [-25, 52, 0];
      const up = unit([46, 6, 0]);
      const th = rad(lerp(268, 172, d));
      const thigh: V3 = [Math.cos(th), Math.sin(th), 0];
      const shin: V3 = [thigh[1], -thigh[0], 0];
      return assemble({
        pelvis,
        up,
        front: unit([up[1], -up[0], 0]),
        headUp: unit([1, 0.2, 0]),
        limb: (s) => {
          const wrist: V3 = [24, 4, s * 18];
          const arms = { wrist, tip: add(wrist, [15, -2, 0]), elbowPole: [-1, 0, 0] as V3 };
          if (s > 0) {
            const knee = add(add(pelvis, [0, 0, 9]), mul(thigh, L.thigh));
            const ankle = add(knee, mul(shin, L.shin));
            // The foot stays pointed back: on its top at the start, sole to the ceiling at the top.
            return { ...arms, knee, ...footFrom(ankle, [-1, 0.12, 0], [-0.12, -1, 0]) };
          }
          return { ...arms, knee: [-25, 6, -10], ...tucked([-67, 12, 0], -1) };
        },
      });
    },
    fits: /glute kickback/i,
    works: { main: ['glutes'], help: ['hamstrings', 'lowerBack'] },
    cameras: { side: SIDE, front: unit([-0.65, 0.45, 0.6]) },
    names: { front: 'Back' },
    floor: { x: -15, r: 70 },
    mover: (p) => p.right.knee,
    arrow: 'left',
  },

  /** Kettlebell swing: hinge at the hips with a flat back, the bell between the legs; snap the
      hips forward to float it to chest height, arms loose. */
  'kettlebell-swing': {
    pose: (d) => {
      const pelvis: V3 = [lerp(-2, -24, d), lerp(94, 84, d), 0];
      const t = lean(lerp(0, 58, d));
      const a = rad(lerp(88, -28, d));
      const wristOf = (s: number): V3 => {
        const w = add(shoulderOf(pelvis, t.up, s), mul([Math.sin(a), -Math.cos(a), 0], 54));
        return [w[0], w[1], s * 4];
      };
      const grip = mix(wristOf(-1), wristOf(1), 0.5);
      const out = unit(sub(grip, shoulderOf(pelvis, t.up, 0)));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(0, 32, d)).up,
        limb: (s) => ({ wrist: wristOf(s), tip: add(wristOf(s), mul(out, 12)), elbowPole: [0, -1, s * 0.6], ...flatFoot(0, 20, s, 7), kneePole: [1, 0, s * 0.45] }),
        props: [{ kind: 'kettlebell', at: add(grip, mul(out, 8)) }],
      });
    },
    works: { main: ['glutes', 'hamstrings'], help: ['lowerBack', 'frontDelt', 'forearm'] },
    cameras: { side: SIDE, front: unit([1, 0.25, 0.45]) },
    floor: { x: 0, r: 50 },
    mover: (p) => p.right.wrist,
    arrow: 'left',
  },

  /** Lying leg raise: on the back, hands by the hips, legs straight; lift the legs until they
      point at the ceiling, lower back pressed down, then lower slowly without touching. */
  'leg-raise': {
    pose: (d) => {
      const pelvis: V3 = [-10, 12, 0];
      const a = rad(1);
      const up: V3 = [Math.cos(a), Math.sin(a), 0];
      const g = rad(lerp(180, 94, d));
      const leg: V3 = [Math.cos(g), Math.sin(g), 0];
      return assemble({
        pelvis,
        up,
        front: [-Math.sin(a), Math.cos(a), 0],
        limb: (s) => {
          const hip = add(pelvis, [0, 0, s * 9]);
          const ankle = add(hip, mul(leg, L.shin + L.thigh - 1));
          const wrist: V3 = [-18, 4, s * 25];
          return { wrist, tip: add(wrist, [-15, -1, 0]), elbowPole: [0, 0.2, s], ...footFrom(ankle, [leg[1], -leg[0], 0], mul(leg, -1)), kneePole: [0, 1, 0] };
        },
      });
    },
    fits: /leg raise/i,
    works: { main: ['abs'], help: ['quads', 'obliques'] },
    cameras: { side: SIDE, front: unit([0.35, 0.4, 0.85]) },
    floor: { x: -25, r: 95 },
    mover: (p) => p.right.ankle,
    arrow: 'left',
  },

  /** Sit-up: on the back, knees bent, feet flat, arms crossed on the chest; curl all the way up
      until the chest is near the knees, then roll back down. */
  'sit-up': {
    pose: (d) => {
      const pelvis: V3 = [-10, 12, 0];
      const a = rad(lerp(1, 76, d));
      const up: V3 = [Math.cos(a), Math.sin(a), 0];
      const front: V3 = [-Math.sin(a), Math.cos(a), 0];
      const nod = rad(lerp(1, 60, d));
      return assemble({
        pelvis,
        up,
        front,
        headUp: [Math.cos(nod), Math.sin(nod), 0],
        limb: (s) => {
          const foot = flatFoot(-52, 13, s, 2);
          const knee = ik(add(pelvis, [0, 0, s * 9]), foot.ankle, L.thigh, L.shin, [0, 1, s * 0.2]);
          const wrist = add(add(add(pelvis, mul(up, 41)), mul(front, 12)), [0, 0, -s * 9]);
          return { wrist, tip: add(add(wrist, mul(up, 9)), [0, 0, -s * 4]), elbowPole: add(add(mul(front, 0.7), mul(up, -1)), [0, 0, s * 0.6]), ...foot, knee };
        },
      });
    },
    fits: /^(3\/4 )?sit-up|weighted sit-ups|janda/i,
    works: { main: ['abs'], help: ['obliques', 'quads'] },
    cameras: { side: SIDE, front: unit([0.35, 0.4, 0.85]) },
    floor: { x: -10, r: 70 },
    mover: (p) => p.neck,
    arrow: 'right',
  },

  /** Russian twist: seated, leaning back with a straight back, knees bent; turn the shoulders
      from side to side, the weight touching down by each hip. */
  'russian-twist': {
    pose: (d) => {
      const pelvis: V3 = [-12, 14, 0];
      const base = lean(-38);
      const q = rad(lerp(-40, 40, d));
      // Turn the chest about the torso's line.
      const front = add(mul(base.front, Math.cos(q)), mul(cross(base.up, base.front), Math.sin(q)));
      const side = unit(cross(front, base.up));
      const point = add(add(pelvis, mul(base.up, 26)), mul(front, 30));
      return assemble({
        pelvis,
        up: base.up,
        front,
        side,
        limb: (s) => {
          const wrist = add(point, mul(side, s * 5));
          return { wrist, tip: add(wrist, mul(front, 12)), elbowPole: add(mul(side, s), [0, -0.5, 0]), ...flatFoot(30, 11, s, 2), kneePole: [0, 1, s * 0.3] };
        },
        props: [{ kind: 'dumbbell', at: add(point, mul(front, 5)) }],
      });
    },
    fits: /^(?!.*cable).*(russian twist|plate twist|full twist)/i,
    works: { main: ['obliques'], help: ['abs'] },
    cameras: { side: SIDE, front: unit([0.8, 0.55, 0.3]) },
    floor: { x: 5, r: 60 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Cable crunch: kneeling under a high cable, the rope by the ears; curl the chest down toward
      the thighs, hips still, then come back up. */
  'cable-crunch': {
    pose: (d) => {
      const pelvis: V3 = [-22, 55, 0];
      const deg = lerp(22, 72, d);
      const t = lean(deg);
      const neck = add(pelvis, mul(t.up, L.torso));
      const rope = add(add(neck, mul(t.up, 10)), mul(t.front, 9));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(deg + 12).up,
        limb: (s) => {
          const wrist = add(rope, [0, 0, s * 8]);
          return { wrist, tip: add(wrist, mul(t.up, 8)), elbowPole: add(add(mul(t.front, 1), mul(t.up, -1)), [0, 0, s * 0.4]), knee: [-22, 6, s * 10], ...tucked([-63, 12, 0], s) };
        },
        props: [
          { kind: 'box', at: [78, 0, 0], size: [14, 215, 32] },
          { kind: 'cable', from: [68, 205, 0], to: rope },
          { kind: 'pullbar', at: rope, half: 8 },
        ],
      });
    },
    fits: /^(cable crunch|rope crunch|kneeling cable crunch)/i,
    works: { main: ['abs'], help: ['obliques'] },
    cameras: { side: SIDE, front: unit([0.6, 0.25, 0.75]) },
    floor: { x: 5, r: 80 },
    mover: (p) => p.neck,
    arrow: 'left',
  },

  /** Dead bug: on the back, arms up, knees bent over the hips; reach one arm back overhead and the
      other leg out long, low back flat on the floor, then switch. */
  'dead-bug': {
    pose: (d) => {
      const pelvis: V3 = [-10, 12, 0];
      const a = rad(1);
      const up: V3 = [Math.cos(a), Math.sin(a), 0];
      return assemble({
        pelvis,
        up,
        front: [-Math.sin(a), Math.cos(a), 0],
        limb: (s) => {
          const sh = shoulderOf(pelvis, up, s);
          // The right arm goes back overhead, the left leg out long.
          const b = rad(s > 0 ? lerp(90, 10, d) : 90);
          const arm: V3 = [Math.cos(b), Math.sin(b), 0];
          const wrist = add(sh, mul(arm, 53));
          const th = rad(s < 0 ? lerp(90, 166, d) : 90);
          const sn = rad(s < 0 ? lerp(180, 170, d) : 180);
          const thigh: V3 = [Math.cos(th), Math.sin(th), 0];
          const shin: V3 = [Math.cos(sn), Math.sin(sn), 0];
          const knee = add(add(pelvis, [0, 0, s * 9]), mul(thigh, L.thigh));
          const ankle = add(knee, mul(shin, L.shin));
          return { wrist, tip: add(wrist, mul(arm, 16)), elbowPole: [-1, 0, s * 0.3], knee, ...footFrom(ankle, [shin[1], -shin[0], 0], mul(shin, -1)) };
        },
      });
    },
    fits: /dead bug/i,
    works: { main: ['abs'], help: ['obliques'] },
    cameras: { side: SIDE, front: unit([0.35, 0.5, 0.8]) },
    floor: { x: -10, r: 85 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Ab rollout: kneeling, hands on the wheel under the shoulders; roll forward as far as the
      back stays flat, then pull back with the abs. */
  'ab-rollout': {
    pose: (d) => {
      const knee: V3 = [-40, 6, 0];
      const g = rad(lerp(70, 20, d));
      const pelvis = add(knee, mul([Math.cos(g), Math.sin(g), 0], L.thigh));
      const a = rad(lerp(32, 12, d));
      const up: V3 = [Math.cos(a), Math.sin(a), 0];
      const sh = add(pelvis, mul(up, SHOULDER_UP));
      const dy = sh[1] - 12;
      const wheel: V3 = [sh[0] + Math.sqrt(Math.max(0, 55 * 55 - dy * dy)), 9, 0];
      return assemble({
        pelvis,
        up,
        front: [Math.sin(a), -Math.cos(a), 0],
        headUp: unit(add(up, [0, 0.15, 0])),
        limb: (s) => {
          const wrist = add(wheel, [0, 3, s * 9]);
          return { wrist, tip: add(wrist, [6, -4, 0]), elbowPole: [0, -1, s * 0.4], knee: add(knee, [0, 0, s * 10]), ...tucked([-82, 12, 0], s) };
        },
        props: [{ kind: 'dumbbell', at: wheel }],
      });
    },
    fits: /ab roller|on knees/i,
    works: { main: ['abs'], help: ['lats', 'obliques', 'frontDelt'] },
    cameras: { side: SIDE, front: unit([0.75, 0.3, 0.6]) },
    floor: { x: -5, r: 90 },
    mover: (p) => p.right.wrist,
    arrow: 'right',
  },

  /** Side bend: standing tall, a weight in one hand; bend straight sideways toward it, no
      leaning forward, then pull back up to straight. */
  'side-bend': {
    pose: (d) => {
      const pelvis: V3 = [-2, 94, lerp(0, -3, d)];
      const a = rad(lerp(0, 24, d));
      const up: V3 = [0, Math.cos(a), Math.sin(a)];
      const front: V3 = [1, 0, 0];
      const side = unit(cross(front, up));
      return assemble({
        pelvis,
        up,
        front,
        side,
        limb: (s) => {
          const sh = add(add(pelvis, mul(up, SHOULDER_UP)), mul(side, s * SHOULDER_OUT));
          const wrist = add(sh, [2, -53, s * 2]);
          return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0], ...flatFoot(0, 12, s), kneePole: [1, 0, s * 0.2] };
        },
        props: [
          (() => {
            const sh = add(add(pelvis, mul(up, SHOULDER_UP)), mul(side, SHOULDER_OUT));
            return { kind: 'dumbbell' as const, at: handOut(sh, add(sh, [2, -53, 2]), 6) };
          })(),
        ],
      });
    },
    fits: /^(?!.*(cable|pulley)).*side bend/i,
    works: { main: ['obliques'], help: ['abs', 'lowerBack'] },
    cameras: { side: unit([1, 0.1, 0.25]), front: unit([-1, 0.15, 0.3]) },
    names: { side: 'Front', front: 'Back' },
    floor: { x: 0, r: 46 },
    mover: (p) => p.neck,
    arrow: 'left',
  },

  /** Mountain climber: at the top of a push-up, body straight; drive one knee in toward the
      chest, then back, then the other. */
  'mountain-climber': {
    pose: (d) => {
      const ankle: V3 = [-103, 13, 0];
      const shoulderY = 4 + L.upper + L.fore - 1;
      const deg = (Math.asin((shoulderY - ankle[1]) / (L.shin + L.thigh + SHOULDER_UP)) * 180) / Math.PI;
      const { dir, front, pelvis } = plankLine(ankle, deg);
      return assemble({
        pelvis,
        up: dir,
        front,
        headUp: add(dir, [0, 0.1, 0]),
        limb: (s) => {
          const arms = { wrist: [27, 4, s * 23] as V3, tip: [44, 1, s * 25] as V3, elbowPole: [-0.75, 0.25, s * 0.6] as V3 };
          if (s < 0) return { ...arms, ...tucked(ankle, s), knee: add(add(ankle, [0, 0, s * 10]), mul(dir, L.shin)) };
          const foot = mix(add(ankle, [0, 0, 10]), [-40, 22, 9], d);
          return { ...arms, ankle: foot, heel: add(foot, [-3, 3, 0]), toe: add(foot, [8, -11, 0]), instep: unit([1, 0.7, 0]), kneePole: [1, -1, 0] };
        },
      });
    },
    fits: /mountain climber/i,
    works: { main: ['abs'], help: ['quads', 'frontDelt', 'obliques'] },
    cameras: { side: SIDE, front: unit([0.8, 0.12, 0.7]) },
    floor: { x: -35, r: 88 },
    mover: (p) => p.right.knee,
    arrow: 'right',
  },

  /** Incline push-up: hands on a box or bench, body one straight line; lower the chest to the
      edge, then press away. */
  'incline-pushup': {
    pose: (d) => {
      const ankle: V3 = [-103, 13, 0];
      const { dir, front, pelvis } = plankLine(ankle, lerp(36, 24, d));
      return assemble({
        pelvis,
        up: dir,
        front,
        headUp: add(dir, [0, 0.1, 0]),
        limb: (s) => ({
          wrist: [38, 49, s * 23],
          tip: [54, 47, s * 25],
          elbowPole: [-0.75, 0.25, s * 0.6],
          ...tucked(ankle, s),
          knee: add(add(ankle, [0, 0, s * 10]), mul(dir, L.shin)),
        }),
        props: [{ kind: 'box', at: [44, 0, 0], size: [26, 45, 70] }],
      });
    },
    fits: /^(?!.*jump).*incline push-up/i,
    works: { main: ['chest', 'triceps', 'frontDelt'], help: ['abs'] },
    cameras: { side: SIDE, front: unit([0.8, 0.15, 0.7]) },
    floor: { x: -30, r: 90 },
    mover: (p) => p.neck,
    arrow: 'right',
  },

  /** Bench dip: hands on the edge of a bench behind, heels on the floor ahead; bend the elbows
      straight back until the upper arms are level, then press up. */
  'bench-dip': {
    pose: (d) => {
      const t = lean(4);
      const sh: V3 = [lerp(-6, 2, d), lerp(103, 76, d), 0];
      const pelvis = sub(sh, mul(t.up, SHOULDER_UP));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const ankle: V3 = [58, 9, s * 12];
          return {
            wrist: [-12, 49, s * 19],
            tip: [-1, 46, s * 19],
            elbowPole: [-1, 0, s * 0.2],
            ...footFrom(ankle, [14, 8, s * 2], [-0.5, 0.87, 0]),
            kneePole: [0, 1, s * 0.2],
          };
        },
        props: [{ kind: 'box', at: [-26, 0, 0], size: [28, 45, 90] }],
      });
    },
    fits: /bench dip/i,
    works: { main: ['triceps'], help: ['chest', 'frontDelt'] },
    cameras: { side: SIDE, front: unit([1, 0.2, 0.55]) },
    floor: { x: 10, r: 70 },
    mover: (p) => p.neck,
    arrow: 'left',
  },

  /** Dead hang: hang from the bar with straight arms, shoulders pulled a little down, legs
      still. A hold. */
  'dead-hang': {
    pose: () => DEMOS.pullup.pose(0, {}),
    works: { main: ['forearm', 'lats'], help: ['abs'] },
    cameras: { side: SIDE, front: unit([-1, 0.05, 0.45]) },
    names: { front: 'Back' },
    arrow: 'right',
  },

  /** Farmer's carry: a heavy weight in each hand, standing tall, shoulders down; walk with short,
      steady steps. */
  carry: {
    pose: (d) => {
      const stride = lerp(1, -1, d);
      const pelvis: V3 = [-2, 92 + Math.abs(stride) * -1.5, 0];
      const t = lean(2);
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const wrist = add(sh, [2, -54, s * 4]);
          return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0], ...flatFoot(s * stride * 19 - 6, 9, s), kneePole: [1, 0, s * 0.1] };
        },
        props: [-1, 1].map((s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          return { kind: 'dumbbell' as const, at: handOut(sh, add(sh, [2, -54, s * 4]), 6) };
        }),
      });
    },
    fits: /farmer/i,
    works: { main: ['forearm', 'traps'], help: ['abs', 'obliques', 'glutes'] },
    cameras: { side: SIDE, front: unit([1, 0.15, 0.4]) },
    floor: { x: 0, r: 50 },
    arrow: 'right',
  },

  /** Standing quad stretch: tall on one leg, the other heel pulled to the glute, knees together,
      hips pushed a little forward. A hold. */
  'standing-quad-stretch': {
    pose: () => {
      const pelvis: V3 = [-1, 94, -2];
      const t = lean(1);
      const knee = add(add(pelvis, [0, 0, 7]), mul(unit([-0.28, -1, 0]), L.thigh));
      const ankle = add(knee, mul(unit([-0.5, 1, 0]), L.shin - 2));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          if (s > 0) {
            const wrist = add(ankle, [-6, 1, 4]);
            return { wrist, tip: add(wrist, [3, -4, -5]), elbowPole: [-1, -0.3, 0.6], knee, ...footFrom(ankle, [-0.35, 0.95, 0], [-0.95, -0.35, 0]) };
          }
          const wrist = add(sh, [10, -50, -12]);
          return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0], ...flatFoot(0, 8, s), kneePole: [1, 0, 0] };
        },
      });
    },
    works: { main: ['quads'], help: [] },
    cameras: { side: SIDE, front: unit([1, 0.15, 0.45]) },
    floor: { x: 0, r: 46 },
    arrow: 'right',
  },

  /** Wall calf stretch: hands on a wall, one foot forward, the back leg straight with its heel
      pressed down; lean in until the calf pulls. A hold. */
  'wall-calf-stretch': {
    pose: () => {
      const pelvis: V3 = [-6, 88, 0];
      const t = lean(24);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(14).up,
        limb: (s) => ({
          wrist: [48, 130, s * 22],
          tip: [54, 145, s * 22],
          elbowPole: [-0.4, -1, s],
          ...(s > 0 ? flatFoot(-42, 10, s, 2) : flatFoot(20, 10, s)),
          kneePole: [1, 0, s * 0.2],
        }),
        props: [{ kind: 'box', at: [62, 0, 0], size: [14, 215, 110] }],
      });
    },
    works: { main: ['calves'], help: ['hamstrings'] },
    cameras: { side: SIDE, front: unit([-0.5, 0.25, 0.85]) },
    floor: { x: 5, r: 70 },
    arrow: 'right',
  },

  /** Seated hamstring stretch: sitting tall with the legs straight out, toes up; fold forward
      from the hips and reach for the feet. A hold. */
  'seated-hamstring-stretch': {
    pose: () => {
      const pelvis: V3 = [-32, 12, 0];
      const t = lean(58);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(68).up,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const wrist = add(sh, mul(unit(sub([54, 16, s * 11], sh)), 54));
          const ankle: V3 = [55, 8, s * 9];
          return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [0, 1, s * 0.3], ...footFrom(ankle, [0.2, 1, 0], [-1, 0.2, 0]), kneePole: [0, 1, 0] };
        },
      });
    },
    works: { main: ['hamstrings'], help: ['calves', 'lowerBack'] },
    cameras: { side: SIDE, front: unit([0.3, 0.65, 0.7]) },
    names: { front: 'Above' },
    floor: { x: 5, r: 75 },
    arrow: 'right',
  },

  /** Standing forward fold: feet together, knees soft, hinge at the hips and let the head and
      arms hang toward the toes. A hold. */
  'forward-fold': {
    pose: () => {
      const pelvis: V3 = [-14, 95, 0];
      const t = lean(148);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(165).up,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const wrist = add(sh, mul(unit(sub([16, 10, s * 12], sh)), 52));
          return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, s * 0.3], ...flatFoot(0, 9, s), kneePole: [1, 0, 0] };
        },
      });
    },
    works: { main: ['hamstrings'], help: ['calves', 'lowerBack'] },
    cameras: { side: SIDE, front: unit([1, 0.2, 0.5]) },
    floor: { x: 0, r: 50 },
    arrow: 'right',
  },

  /** Child's pose: knees on the floor, sitting back on the heels, arms reaching long in front,
      forehead down; breathe into the back. A hold. */
  'childs-pose': {
    pose: () => {
      const knee: V3 = [18, 6, 0];
      const pelvis = add(knee, mul(unit([-0.93, 0.37, 0]), L.thigh));
      const up = unit([1, -0.16, 0]);
      return assemble({
        pelvis,
        up,
        front: [-0.16, -1, 0],
        headUp: unit([1, -0.45, 0]),
        limb: (s) => {
          const wrist: V3 = [74, 4, s * 18];
          return {
            wrist,
            tip: add(wrist, [16, -1, 0]),
            elbowPole: [0, 1, s * 0.4],
            knee: add(knee, [0, 0, s * 12]),
            ...footFrom([pelvis[0] - 4, 7, s * 9], [-1, -0.25, 0], [0.25, -1, 0]),
          };
        },
      });
    },
    works: { main: ['lowerBack', 'lats'], help: ['glutes'] },
    cameras: { side: SIDE, front: unit([-0.5, 0.6, 0.6]) },
    names: { front: 'Back' },
    floor: { x: 10, r: 75 },
    arrow: 'right',
  },

  /** Knees to chest: on the back, hug both knees in to the chest, the lower back long on the
      floor. A hold. */
  'knees-to-chest': {
    pose: () => {
      const pelvis: V3 = [-10, 12, 0];
      const a = rad(1);
      const up: V3 = [Math.cos(a), Math.sin(a), 0];
      const thigh: V3 = [Math.cos(rad(58)), Math.sin(rad(58)), 0];
      const shin = unit([-0.75, -0.62, 0]);
      return assemble({
        pelvis,
        up,
        front: [-Math.sin(a), Math.cos(a), 0],
        headUp: unit([1, 0.12, 0]),
        limb: (s) => {
          const knee = add(add(pelvis, [0, 0, s * 9]), mul(thigh, L.thigh));
          const ankle = add(knee, mul(shin, L.shin));
          const wrist = add(add(knee, mul(shin, 12)), [0, 0, s * 5]);
          return { wrist, tip: add(wrist, [-4, -8, -s * 3]), elbowPole: [0, 0.3, s], knee, ...footFrom(ankle, [shin[1], -shin[0], 0], mul(shin, -1)) };
        },
      });
    },
    works: { main: ['lowerBack', 'glutes'], help: ['hamstrings'] },
    cameras: { side: SIDE, front: unit([0.35, 0.45, 0.8]) },
    floor: { x: 0, r: 70 },
    arrow: 'right',
  },

  /** Kneeling hip flexor stretch: one knee down, the other foot forward; squeeze the glute and
      shift the hips forward, chest tall. A hold. */
  'hip-flexor-stretch': {
    pose: () => {
      const pelvis: V3 = [-12, 48, 0];
      const t = lean(-4);
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          const wrist = add(pelvis, [3, 9, s * 19]);
          const arms = { wrist, tip: add(wrist, [7, -9, -s * 2]), elbowPole: [-0.3, 0, s] as V3 };
          if (s < 0) return { ...arms, ...flatFoot(30, 11, s), kneePole: [1, 0, 0] };
          return { ...arms, knee: [-28, 6, 10], ...tucked([-70, 12, 0], s) };
        },
      });
    },
    works: { main: ['quads'], help: ['abs'] },
    cameras: { side: SIDE, front: unit([1, 0.2, 0.55]) },
    floor: { x: -10, r: 65 },
    arrow: 'right',
  },

  /** Overhead triceps stretch: one hand reaching down the back, the elbow by the head; the other
      hand gently pulls the elbow back. A hold. */
  'triceps-stretch': {
    pose: () => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(1);
      const elbow = add(shoulderOf(pelvis, t.up, 1), mul(unit([-0.05, 1, -0.28]), L.upper));
      const wrist = add(elbow, mul(unit([-0.35, -1, -0.3]), L.fore));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(6).up,
        limb: (s) => {
          if (s > 0) return { elbow, wrist, tip: add(wrist, mul(unit([-0.35, -1, -0.3]), 15)), ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
          const w = add(elbow, [4, 3, -6]);
          return { wrist: w, tip: add(w, [0, 4, 12]), elbowPole: [0.6, 0.2, -1], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
        },
      });
    },
    works: { main: ['triceps'], help: ['lats'] },
    cameras: { side: unit([-0.3, 0.1, 0.95]), front: unit([-0.9, 0.2, 0.35]) },
    names: { front: 'Back' },
    floor: { x: 0, r: 46 },
    arrow: 'right',
  },

  /** Cross-body shoulder stretch: one arm straight across the chest, the other forearm pulling it
      in just above the elbow. A hold. */
  'cross-body-stretch': {
    pose: () => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(1);
      const sh = shoulderOf(pelvis, t.up, 1);
      const wrist = add(sh, mul(unit([0.42, -0.05, -1]), 54));
      return assemble({
        pelvis,
        ...t,
        limb: (s) => {
          if (s > 0) return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
          const w = add(mix(sh, wrist, 0.45), [6, 2, 0]);
          return { wrist: w, tip: add(w, [-2, 3, 14]), elbowPole: [0.3, -1, -0.4], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
        },
      });
    },
    works: { main: ['rearDelt'], help: ['sideDelt', 'traps'] },
    cameras: { side: unit([1, 0.15, 0.3]), front: unit([-0.7, 0.2, 0.7]) },
    names: { side: 'Front', front: 'Back' },
    floor: { x: 0, r: 46 },
    arrow: 'right',
  },

  /** Chest opener: hands clasped behind the back, arms straight, chest lifted and the shoulder
      blades squeezed. A hold. */
  'chest-opener': {
    pose: () => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(-4);
      return assemble({
        pelvis,
        ...t,
        headUp: lean(-8).up,
        limb: (s) => {
          const wrist: V3 = [-36, 104, s * 5];
          return { wrist, tip: add(wrist, [-6, -14, -s * 2]), elbowPole: [0, -1, s], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
        },
      });
    },
    works: { main: ['chest', 'frontDelt'], help: ['biceps'] },
    cameras: { side: SIDE, front: unit([0.85, 0.2, 0.5]) },
    floor: { x: 0, r: 46 },
    arrow: 'right',
  },

  /** Standing side reach: one arm up and over the head, lean the other way in a long arc, hips
      still. A hold. */
  'side-reach': {
    pose: () => {
      const pelvis: V3 = [-2, 94, 3];
      const a = rad(-20);
      const up: V3 = [0, Math.cos(a), Math.sin(a)];
      const front: V3 = [1, 0, 0];
      const side = unit(cross(front, up));
      return assemble({
        pelvis,
        up,
        front,
        side,
        headUp: unit([0, Math.cos(a * 1.3), Math.sin(a * 1.3)]),
        limb: (s) => {
          const sh = add(add(pelvis, mul(up, SHOULDER_UP)), mul(side, s * SHOULDER_OUT));
          if (s > 0) {
            const wrist = add(sh, mul(unit(add(up, mul(side, -0.75))), 54));
            return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [0, 0.3, 1], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
          }
          const wrist = add(pelvis, [3, 9, -19]);
          return { wrist, tip: add(wrist, [7, -9, 2]), elbowPole: [-0.3, 0, -1], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
        },
      });
    },
    works: { main: ['obliques', 'lats'], help: [] },
    cameras: { side: unit([1, 0.1, 0.25]), front: unit([-1, 0.15, 0.3]) },
    names: { side: 'Front', front: 'Back' },
    floor: { x: 0, r: 46 },
    arrow: 'right',
  },

  /** Side neck stretch: sitting or standing tall, tip one ear toward its shoulder, the hand on
      that side resting on the head; the other shoulder stays down. A hold. */
  'neck-side-stretch': {
    pose: () => {
      const pelvis: V3 = [-2, 94, 0];
      const t = lean(1);
      const hu = unit([0, 1, -0.95]);
      const neck = add(pelvis, mul(t.up, L.torso));
      const top = add(neck, mul(hu, L.neck + L.head));
      return assemble({
        pelvis,
        ...t,
        headUp: hu,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          if (s < 0) {
            const wrist = add(top, [0, -2, 9]);
            return { wrist, tip: add(wrist, [0, -6, 7]), elbowPole: [0, 0.5, -1], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
          }
          const wrist = add(sh, [3, -54, 4]);
          return { wrist, tip: handOut(sh, wrist, 16), elbowPole: [-1, 0, 0], ...flatFoot(0, 12, s), kneePole: [1, 0, 0] };
        },
      });
    },
    works: { main: ['traps'], help: [] },
    cameras: { side: unit([1, 0.1, 0.25]), front: unit([-1, 0.15, 0.3]) },
    names: { side: 'Front', front: 'Back' },
    floor: { x: 0, r: 46 },
    arrow: 'right',
  },

};

/** Other movements that look the same as a demo. */
const ALIAS: Record<string, AnatomyId> = {
  'strict-pullup': 'pullup',
  'assisted-pullup': 'pullup',
  negatives: 'pullup',
  'push-press': 'shoulder-press',
  'diamond-pushup': 'pushup',
};

/** Movements that hold many different exercises (most stretches): the demo for each by its name. */
const NAMED: Record<string, [RegExp, AnatomyId][]> = {
  'quad-stretch': [[/^quad stretch$|dancer/i, 'standing-quad-stretch'], [/hip flexor and quad/i, 'hip-flexor-stretch']],
  'calf-stretch': [[/against wall|standing gastrocnemius|standing soleus/i, 'wall-calf-stretch'], [/^seated (hamstring and )?calf/i, 'seated-hamstring-stretch']],
  'seated-stretch': [[/^seated (floor )?hamstring/i, 'seated-hamstring-stretch']],
  'reach-stretch': [[/^hamstring stretch$/i, 'forward-fold'], [/standing lateral stretch/i, 'side-reach']],
  'toe-touch': [[/standing toe touches|toe touchers/i, 'forward-fold']],
  'child-pose': [[/child's pose/i, 'childs-pose']],
  'knee-hug': [[/hug knees to chest/i, 'knees-to-chest']],
  'lunge-stretch': [[/kneeling hip flexor/i, 'hip-flexor-stretch']],
  'arm-stretch': [
    [/^triceps stretch$|^overhead triceps$/i, 'triceps-stretch'],
    [/^shoulder stretch$/i, 'cross-body-stretch'],
    [/chest and front of shoulder|^elbows back$/i, 'chest-opener'],
  ],
  neck: [[/side neck stretch/i, 'neck-side-stretch']],
};

/** How an exercise's name changes its demo ("Dumbbell Bench Press", "Incline...", "Goblet Squat"). */
export function variantOf(name: string): Variant {
  const n = name.toLowerCase();
  if (/goblet/.test(n)) return { goblet: true };
  const gear = /dumbbell/.test(n) ? 'dumbbell' : /barbell|ez.?bar|ez curl/.test(n) ? 'barbell' : undefined;
  return { ...(gear ? { gear } : {}), ...(/incline/.test(n) ? { incline: true } : {}) };
}

/** The anatomy demo for an exercise: its movement (`demo`) and its name, or null when there is none. */
export function anatomyFor(demo: string, name: string): { id: AnatomyId; variant: Variant } | null {
  const base = NAMED[demo]?.find(([re]) => re.test(name))?.[1] ?? ALIAS[demo] ?? demo;
  if (!hasAnatomy(base)) return null;
  const v = variantOf(name);
  // A back or front squat done with dumbbells or a goblet is the free squat holding them.
  const id: AnatomyId = (base === 'barbell-squat' || base === 'front-squat') && (v.gear === 'dumbbell' || v.goblet) ? 'squat' : base;
  if (id === base && DEMOS[id].fits && !DEMOS[id].fits.test(name)) return null;
  const variant: Variant = {};
  if (v.gear && DEMOS[id].swaps?.includes(v.gear)) variant.gear = v.gear;
  if (v.incline && id === 'bench-press') variant.incline = true;
  if (v.goblet && id === 'squat') variant.goblet = true;
  return { id, variant };
}

/** A demo's pose for a depth and variant, with its gear swapped when the variant asks. */
export function poseOf(id: AnatomyId, d: number, v: Variant = {}): Pose {
  const pose = DEMOS[id].pose(d, v);
  if (!v.gear || !DEMOS[id].swaps?.includes(v.gear)) return pose;
  const kept = pose.props.filter((p) => p.kind !== 'barbell' && p.kind !== 'dumbbell');
  const grip = (s: number) => {
    const side = s > 0 ? pose.right : pose.left;
    return mix(side.wrist, side.tip, 0.4);
  };
  const weights: Prop[] =
    v.gear === 'dumbbell'
      ? [-1, 1].map((s) => ({ kind: 'dumbbell' as const, at: grip(s) }))
      : [{ kind: 'barbell', at: mix(grip(-1), grip(1), 0.5) }];
  return { ...pose, props: [...kept, ...weights] };
}

/** What a view is called for an exercise ("Side", "Front", "Back", "Above"). */
export const viewName = (id: AnatomyId, view: View, v: Variant = {}): string =>
  (DEMOS[id].camerasFor?.(v)[view] ? null : DEMOS[id].names?.[view]) ?? (view === 'side' ? 'Side' : 'Front');

/** Where a view looks from, for a variant. */
export const cameraOf = (id: AnatomyId, view: View, v: Variant = {}): V3 => DEMOS[id].camerasFor?.(v)[view] ?? DEMOS[id].cameras[view];
