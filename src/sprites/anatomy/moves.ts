/* The anatomy demos' moves: for each exercise, its pose at any depth of the rep (0 = start,
   1 = the far end), the muscles it works, where the cameras look from, the floor under it, and
   which point the arrow follows. The body and its drawing live in body.ts. */

import type { MuscleId } from './body';
import { L, SHOULDER_OUT, SHOULDER_UP, add, assemble, flatFoot, lean, lerp, mix, mul, rad, sub, unit, type Limb, type Pose, type V3 } from './skeleton';

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
] as const;
export type AnatomyId = (typeof ANATOMY_DEMOS)[number];
export const hasAnatomy = (id: string): id is AnatomyId => (ANATOMY_DEMOS as readonly string[]).includes(id);

export type View = 'side' | 'front';

export interface Demo {
  pose: (d: number) => Pose;
  /** The main movers, then the helpers. */
  works: { main: MuscleId[]; help: MuscleId[] };
  /** Where each view looks from (toward the camera). */
  cameras: Record<View, V3>;
  /** What to call the second view when it is not the front. */
  names?: Partial<Record<View, string>>;
  /** The floor under it: its middle and how far it reaches. */
  floor: { x: number; r: number };
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

/** Where the barbell is. */
const barOf = (p: Pose): V3 => {
  for (const g of p.props) if (g.kind === 'barbell') return g.at;
  return p.pelvis;
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
    pose: (d) => {
      const pelvis: V3 = [lerp(-2, -18, d), lerp(94, 48, d), 0];
      const t = lean(lerp(4, 34, d));
      return assemble({
        pelvis,
        ...t,
        headUp: lean(lerp(4, 34, d) * 0.4).up,
        limb: (s) => {
          const sh = shoulderOf(pelvis, t.up, s);
          const wrist = add(sh, [lerp(24, 52, d), lerp(-48, -6, d), -s * 5]);
          return { wrist, tip: handOut(sh, wrist), elbowPole: [0, -1, s * 0.3], ...flatFoot(0, 13, s), kneePole: [1, 0.1, s * 0.45] };
        },
      });
    },
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
    works: { main: ['glutes', 'hamstrings', 'lowerBack'], help: ['quads', 'traps', 'lats', 'forearm'] },
    cameras: { side: SIDE, front: unit([1, 0.32, 0.5]) },
    floor: { x: 0, r: 50 },
    mover: barOf,
    arrow: 'left',
  },

  /** Lying on a bench, feet flat on the floor: the bar from straight arms over the shoulders down
      to the lower chest, elbows tucked a little. */
  'bench-press': {
    pose: (d) => {
      const pelvis: V3 = [-22, 54, 0];
      const bar = mix([24, 111, 0], [16, 71, 0], d);
      return assemble({
        pelvis,
        up: [1, 0.06, 0],
        front: [-0.06, 1, 0],
        headUp: [1, -0.12, 0],
        limb: (s) => ({
          wrist: add(bar, [0, -2, s * 38]),
          tip: add(bar, [1, 5, s * 38]),
          elbowPole: [-0.3, -1, s * 0.6],
          ...flatFoot(-64, 22, s, 6),
          kneePole: [0, 1, s * 0.3],
        }),
        props: [
          { kind: 'bench', from: [-40, 44, 0], to: [62, 44, 0] },
          { kind: 'barbell', at: bar },
        ],
      });
    },
    works: { main: ['chest', 'triceps', 'frontDelt'], help: [] },
    cameras: { side: SIDE, front: unit([1, 0.5, 0.3]) },
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
    floor: { x: -5, r: 40 },
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
    cameras: { side: SIDE, front: unit([0.35, 0.4, 0.85]) },
    floor: { x: -5, r: 75 },
    mover: (p) => p.pelvis,
    arrow: 'left',
  },
};

/** What a view is called for an exercise ("Side", "Front", "Back", "Above"). */
export const viewName = (id: AnatomyId, view: View): string => DEMOS[id].names?.[view] ?? (view === 'side' ? 'Side' : 'Front');
