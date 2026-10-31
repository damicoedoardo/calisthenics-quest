import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import { grid, stamp, type Grid } from '../engine/grid';
import type { Look } from '../engine/figure';
import {
  FLOOR,
  FORE,
  LOCKED,
  NECK,
  NEGATIVE,
  REP,
  SHIN,
  THIGH,
  TORSO,
  add,
  arm,
  breath,
  colorsFor,
  dir,
  drawFigure,
  drawLine,
  drawWeight,
  lerp,
  mul,
  props,
  straight,
  sub,
  unit,
  type Arm,
  type Leg,
  type P,
  type Pose,
  type Props,
  type Weight,
} from '../engine/skeleton';
import { MOVES, drawMove, type Kit, type MoveId } from './moves';

/* Exercise demos: your own hero (skin, hair, armor color) doing each exercise of the program, side
   on, one rep per loop of the 16-frame `rep` clip (holds breathe instead). The figure is a jointed
   skeleton drawn straight at 64x64 from a few lengths, with the elbows and knees found by two-bone
   IK, so the form is exact: a straight body line in a push-up, a full hang at the bottom of a
   pull-up, legs level in an L-sit. Facing right; the near arm and leg are drawn over the far ones. */

/** The program's moves, each drawn by hand below. */
export const PROGRAM_DEMOS = [
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
] as const;

/** A demo: one of the program's moves, or one of the library's (characters/moves.ts). */
export type ExerciseId = (typeof PROGRAM_DEMOS)[number] | MoveId;

export const EXERCISES: ExerciseId[] = [...PROGRAM_DEMOS, ...MOVES];
const isMove = (id: ExerciseId): id is MoveId => (MOVES as readonly string[]).includes(id);

export interface ExerciseOpts {
  exercise: ExerciseId;
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  look?: Look;
  /** What the library's moves are done with (a barbell, a cable...); each move has a default. */
  kit?: Kit;
  /** 'front' shows the diamond push-up from the head end, so the hands' diamond shows. */
  view?: 'side' | 'front';
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

export function poseFor(id: ExerciseId, f: number, view: ExerciseOpts['view'] = 'side'): { pose: Pose; props: Props; band?: { from: P; to: P }; weight?: Weight } {
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
    default:
      throw new Error(`no demo for ${id}`);
  }
}

/** One frame of an exercise demo: the props, then you on them. */
export function drawExercise(o: ExerciseOpts, f: number): Grid {
  if (isMove(o.exercise)) {
    const m = drawMove(o.exercise, o.kit, f);
    const g = grid(64);
    props(g, m.props);
    m.scene?.(g);
    for (const w of m.weights) if (w.behind) drawWeight(g, w);
    stamp(g, drawFigure(m.pose, colorsFor(o), o.look));
    m.over?.(g);
    for (const l of m.lines) drawLine(g, l);
    for (const w of m.weights) if (!w.behind) drawWeight(g, w);
    return g;
  }
  const { pose, props: kind, band, weight } = poseFor(o.exercise, f, o.view);
  const g = grid(64);
  props(g, kind);
  if (weight?.behind) drawWeight(g, weight);
  const fig = drawFigure(pose, colorsFor(o), o.look);
  stamp(g, fig);
  if (weight && !weight.behind) drawWeight(g, weight);
  // the band goes in front of the shins, over the figure
  if (band) props(g, 'bar', band);
  return g;
}
