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

};

/** Other movements that look the same as a demo. */
const ALIAS: Record<string, AnatomyId> = {
  'strict-pullup': 'pullup',
  'assisted-pullup': 'pullup',
  negatives: 'pullup',
  'push-press': 'shoulder-press',
  'diamond-pushup': 'pushup',
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
  const base = ALIAS[demo] ?? demo;
  if (!hasAnatomy(base)) return null;
  const v = variantOf(name);
  // A back squat done with dumbbells or a goblet is the free squat holding them.
  const id: AnatomyId = base === 'barbell-squat' && (v.gear === 'dumbbell' || v.goblet) ? 'squat' : base;
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
