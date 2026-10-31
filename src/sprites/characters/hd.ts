import type { Gear, GearSlot } from '@/lib/gear';
import { NIGHT, grid, mix, outline, stamp, type Grid, type Ramp } from '../engine/grid';
import type { Look } from '../engine/figure';
import { FLOOR, IRON, REP, STEEL, add, colorsFor, lerp, mul, sub, unit, type P, type Pose, type Weight } from '../engine/skeleton';
import { poseFor } from './exercise';
import { drawMove } from './moves';

/* HD exercise demos (a trial, Edoardo 2026-10-31: "much higher resolution and better"): the same
   poses as the 64x64 demos (exercise.ts, moves.ts), drawn three times finer on a 192x192 grid with a
   real figure: tapered, round-shaded limbs, a face, hair, a tee, shorts and trainers. Each comes
   side on and from the front, with arrows that show which way the body moves. Only a couple of
   exercises for now (HD_DEMOS); the rest keep the 64x64 demo. */

export const HD_DEMOS = ['pushup', 'barbell-squat'] as const;
export type HdId = (typeof HD_DEMOS)[number];
export const hasHd = (id: string): id is HdId => (HD_DEMOS as readonly string[]).includes(id);

export interface HdOpts {
  exercise: HdId;
  gear: Record<GearSlot, Gear>;
  look?: Look;
  view?: 'side' | 'front';
  /** Arrows for the way the body moves (on by default). */
  arrows?: boolean;
}

/** How much finer than the 64x64 demos: 3.5 times, framed closer on the body (a 55x55 window of
    the old grid from y = 5, centered on x = CX, so the floor sits near the bottom). */
const S = 3.5;
const N = 192;
let CX = 32;
const sc = (p: P): P => [(p[0] - CX) * S + N / 2, (p[1] - 5) * S];

/** Light falls from the top left: a surface facing it is lit. */
const LIGHT = unit([-0.55, -0.85]);
const ARROW = '#38bdf8';

/** Four tones from a three-tone ramp: deep shadow, shadow, base, light. */
const four = (r: Ramp): Ramp => [mix(r[0], NIGHT, 0.35), r[0], r[1], r[2]];
const dimmed = (r: Ramp): Ramp => r.map((c) => mix(c, NIGHT, 0.32));

/** A tapered capsule from a (radius ra) to b (radius rb), in 64-grid units, shaded as a cylinder. */
function cone(g: Grid, a: P, b: P, ra: number, rb: number, ramp: Ramp) {
  const A = sc(a),
    B = sc(b),
    RA = ra * S,
    RB = rb * S;
  const r = Math.max(RA, RB);
  const x0 = Math.floor(Math.min(A[0], B[0]) - r),
    x1 = Math.ceil(Math.max(A[0], B[0]) + r),
    y0 = Math.floor(Math.min(A[1], B[1]) - r),
    y1 = Math.ceil(Math.max(A[1], B[1]) + r);
  const ab = sub(B, A),
    l2 = ab[0] * ab[0] + ab[1] * ab[1] || 1;
  for (let y = Math.max(0, y0); y <= Math.min(N - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(N - 1, x1); x++) {
      const t = Math.max(0, Math.min(1, ((x - A[0]) * ab[0] + (y - A[1]) * ab[1]) / l2));
      const q = add(A, mul(ab, t)),
        rr = RA + (RB - RA) * t,
        dx = x - q[0],
        dy = y - q[1],
        d = Math.hypot(dx, dy);
      if (d > rr) continue;
      const k = (dx * LIGHT[0] + dy * LIGHT[1]) / -rr;
      g[y][x] = k > 0.45 ? ramp[3] : k > -0.15 ? ramp[2] : k > -0.65 ? ramp[1] : ramp[0];
    }
}
const ball = (g: Grid, c: P, r: number, ramp: Ramp) => cone(g, c, c, r, r, ramp);

/** Set single pixels in 64-grid units (for the face). */
function dot(g: Grid, p: P, c: string, w = 1, h = 1) {
  const [x, y] = sc(p).map(Math.round);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (x + i >= 0 && y + j >= 0 && x + i < N && y + j < N) g[y + j][x + i] = c;
}

interface Kit {
  skin: Ramp;
  hair: Ramp;
  tee: Ramp;
  shorts: Ramp;
  shoe: Ramp;
  sole: string;
}

function kitFor(o: HdOpts): Kit {
  const c = colorsFor(o);
  return { skin: four(c.skin), hair: four(c.hair), tee: four(c.shirt), shorts: four(['#1f2433', '#2f3547', '#454d66']), shoe: four(['#7a1f1f', '#b83232', '#e05a4a']), sole: '#e8e4dc' };
}

// ---------- side on ----------

function sideLeg(g: Grid, l: Pose['near']['leg'], k: Kit, far: boolean) {
  const skin = far ? dimmed(k.skin) : k.skin,
    shorts = far ? dimmed(k.shorts) : k.shorts,
    shoe = far ? dimmed(k.shoe) : k.shoe;
  // the calf bulges behind the shin, opposite the toes
  const back = mul(unit(l.toes), -0.9);
  cone(g, l.knee, l.foot, 1.85, 1.15, skin);
  cone(g, add(l.knee, mul(back, 0.6)), add(lerp(l.knee, l.foot, 0.55), back), 1.6, 1.2, skin);
  // the thigh, the shorts over its top two thirds
  cone(g, l.hip, l.knee, 2.6, 1.95, skin);
  cone(g, l.hip, lerp(l.hip, l.knee, 0.62), 2.95, 2.45, shorts);
  // the trainer, a pale sole under it
  const toe = add(l.foot, mul(unit(l.toes), 3));
  cone(g, add(l.foot, mul(unit(l.toes), -0.8)), toe, 1.35, 1.1, shoe);
  const under: P = [0, 1.1];
  cone(g, add(add(l.foot, mul(unit(l.toes), -0.9)), under), add(toe, under), 0.45, 0.45, [k.sole, k.sole, k.sole, k.sole]);
}

function sideArm(g: Grid, a: Pose['near']['arm'], k: Kit, far: boolean) {
  const skin = far ? dimmed(k.skin) : k.skin,
    tee = far ? dimmed(k.tee) : k.tee;
  cone(g, a.elbow, a.hand, 1.55, 1.1, skin);
  ball(g, a.hand, 1.45, skin);
  cone(g, a.shoulder, a.elbow, 1.95, 1.45, skin);
  // a short sleeve over the shoulder
  cone(g, a.shoulder, lerp(a.shoulder, a.elbow, 0.38), 2.3, 1.95, tee);
}

function sideHead(g: Grid, p: Pose, k: Kit, look?: Look) {
  const face = unit(p.face),
    up = unit(p.up),
    h = p.head;
  // neck, then the skull and a jaw toward the face
  cone(g, p.shoulder, h, 1.5, 1.6, k.skin);
  ball(g, h, 4.9, k.skin);
  cone(g, h, add(h, add(mul(face, 2.2), mul(up, -2.3))), 3.6, 2.2, k.skin);
  // the nose
  ball(g, add(h, add(mul(face, 4.6), mul(up, -0.4))), 0.75, k.skin);
  // hair: a cap over the top and back, spiky tips at the crown, longer for long styles
  const cap = add(h, add(mul(face, -0.9), mul(up, 1.1)));
  ball(g, cap, 4.6, k.hair);
  for (const [fw, len] of [
    [-2.6, 3.4],
    [-0.6, 3.6],
    [1.4, 3.0],
  ] as const) {
    const root = add(h, add(mul(face, fw), mul(up, 3.2)));
    cone(g, root, add(root, add(mul(up, len * 0.7), mul(face, -len * 0.55))), 1.5, 0.3, k.hair);
  }
  if (look?.style === 'long' || look?.style === 'hime' || look?.style === 'pony' || look?.style === 'twin') {
    const from = add(h, add(mul(face, -3.6), mul(up, 1.5)));
    cone(g, from, add(from, [-face[0] * 2, 9]), 2.2, 1.2, k.hair);
  }
  // fringe over the brow, so the face reads under the hair
  cone(g, add(h, add(mul(face, 1.2), mul(up, 3))), add(h, add(mul(face, 3.6), mul(up, 1.6))), 1.4, 0.7, k.hair);
  // ear, eye (white, iris, highlight), brow, mouth
  ball(g, add(h, add(mul(face, -0.6), mul(up, -0.3))), 1.05, [k.skin[1], k.skin[1], k.skin[2], k.skin[2]]);
  const eye = add(h, add(mul(face, 2.9), mul(up, 0.5)));
  dot(g, add(eye, mul(face, -0.33)), '#f5f5f4', 2, 3);
  dot(g, eye, '#1c1917', 2, 3);
  dot(g, add(eye, [0, 0]), '#ffffff');
  dot(g, add(eye, add(mul(up, 1.4), mul(face, -0.7))), k.hair[0], 4, 1);
  dot(g, add(h, add(mul(face, 3.5), mul(up, -2.2))), mix(k.skin[0], '#7f1d1d', 0.4), 3, 1);
  if (look?.sex === 'f') dot(g, add(eye, add(mul(up, 1), mul(face, 0.8))), '#1c1917', 2, 1);
}

function sideBody(p: Pose, k: Kit, look?: Look): Grid {
  const back = grid(N),
    front = grid(N);
  sideArm(back, p.far.arm, k, true);
  sideLeg(back, p.far.leg, k, true);
  sideLeg(back, p.near.leg, k, false);
  // the torso: a tee from the shoulders to the hips, the chest fuller than the waist
  const mid = p.mid ?? lerp(p.shoulder, p.hip, 0.45);
  cone(back, p.shoulder, mid, 3.7, 3.4, k.tee);
  cone(back, mid, p.hip, 3.4, 3.1, k.tee);
  cone(back, lerp(p.hip, p.shoulder, 0.08), p.hip, 3.15, 3.1, k.shorts);
  sideHead(back, p, k, look);
  sideArm(front, p.near.arm, k, false);
  const body = outline(back);
  stamp(body, outline(front));
  return body;
}

// ---------- from the front ----------

interface Front {
  head: P;
  shoulder: number;
  hip: number;
  /** Left and right, mirrored round x = 32. */
  knee: P;
  foot: P;
  elbow: P;
  hand: P;
  /** Hips and legs hidden behind the chest (a push-up seen from the head end). */
  legsBehind?: boolean;
}

const mirror = (p: P): P => [64 - p[0], p[1]];

function frontBody(f: Front, k: Kit, look?: Look): Grid {
  const back = grid(N),
    front = grid(N);
  const legs = f.legsBehind ? back : front;
  const shL: P = [32 - 5.8, f.shoulder],
    hipL: P = [32 - 3.1, f.hip];
  for (const side of f.legsBehind ? [] : [0, 1]) {
    const m = (p: P) => (side ? mirror(p) : p);
    const tone = f.legsBehind ? dimmed : (r: Ramp) => r;
    cone(legs, m(f.knee), m(f.foot), 1.85, 1.2, tone(k.skin));
    cone(legs, m(hipL), m(f.knee), 2.6, 1.9, tone(k.skin));
    cone(legs, m(hipL), m(lerp(hipL, f.knee, 0.6)), 2.95, 2.5, tone(k.shorts));
    cone(legs, m(add(f.foot, [-0.4, 0.3])), m(add(f.foot, [-0.9, 1.2])), 1.45, 1.2, tone(k.shoe));
  }
  // the torso: shoulder-wide, narrowing to the hips
  const torso = f.legsBehind ? front : back;
  cone(torso, shL, [32 - 2.4, f.hip], 2.6, 2.6, k.tee);
  cone(torso, mirror(shL), [32 + 2.4, f.hip], 2.6, 2.6, k.tee);
  cone(torso, [32, f.shoulder + 0.5], [32, f.hip], 4, 3.4, k.tee);
  cone(torso, [32 - 2.8, f.hip - 0.6], [32 + 2.8, f.hip - 0.6], 1.6, 1.6, k.shorts);
  // the arms, both sides
  for (const side of [0, 1]) {
    const m = (p: P) => (side ? mirror(p) : p);
    cone(front, m(f.elbow), m(f.hand), 1.5, 1.1, k.skin);
    ball(front, m(f.hand), 1.45, k.skin);
    cone(front, m(shL), m(f.elbow), 1.95, 1.45, k.skin);
    cone(front, m(shL), m(lerp(shL, f.elbow, 0.35)), 2.3, 2, k.tee);
  }
  // the head from the front: neck, face, ears, hair cap with spikes, two eyes
  const h = f.head,
    head = grid(N);
  cone(head, [32, f.shoulder], h, 1.6, 1.6, k.skin);
  ball(head, add(h, [-4.6, 0.6]), 1.1, k.skin);
  ball(head, add(h, [4.6, 0.6]), 1.1, k.skin);
  ball(head, h, 4.8, k.skin);
  cone(head, h, add(h, [0, 3]), 3.8, 2.4, k.skin);
  ball(head, add(h, [0, -1.6]), 4.6, k.hair);
  for (const dx of [-2.6, 0, 2.6]) cone(head, add(h, [dx, -4.6]), add(h, [dx * 1.4 + 0.6, -6.4]), 1.3, 0.3, k.hair);
  // clear the face under the fringe
  cone(head, add(h, [0, 1.3]), add(h, [0, 3]), 3.6, 2.4, k.skin);
  cone(head, add(h, [-3.4, -1]), add(h, [3.4, -1]), 0.9, 0.9, k.hair);
  for (const dx of [-1.9, 1.3]) {
    dot(head, add(h, [dx, 0.4]), '#f5f5f4', 2, 3);
    dot(head, add(h, [dx + 0.33, 0.4]), '#1c1917', 1, 3);
  }
  dot(head, add(h, [-0.66, 3.2]), mix(k.skin[0], '#7f1d1d', 0.4), 4, 1);
  if (look?.sex === 'f') for (const dx of [-2.2, 2.2]) dot(head, add(h, [dx, 0]), '#1c1917', 1, 1);
  const body = outline(back);
  stamp(body, outline(front));
  stamp(body, outline(head));
  return body;
}

/** The squat from the front: the same heights as side on, the knees pushed out over the toes. */
function squatFront(side: Pose, d: number): Front {
  return {
    head: [32, side.head[1]],
    shoulder: side.shoulder[1],
    hip: side.hip[1],
    knee: [32 - 4 - 2.6 * d, side.near.leg.knee[1]],
    foot: [32 - 5.4, side.near.leg.foot[1]],
    // the hands grip the bar wide, elbows down behind it
    hand: [32 - 9.5, side.shoulder[1] - 1.2],
    elbow: [32 - 9, side.shoulder[1] + 4.2],
  };
}

/** The push-up from the head end: hands under the shoulders, elbows out to about 45°. */
function pushupFront(side: Pose, d: number): Front {
  return {
    head: [32, side.head[1] - 0.5],
    shoulder: side.shoulder[1],
    hip: side.shoulder[1] - 2 + 2 * d,
    knee: [32 - 2.6, side.shoulder[1] - 2.5],
    foot: [32 - 2.2, FLOOR - 2],
    hand: [32 - 7, FLOOR - 1.3],
    elbow: [32 - 8.4 - 2.4 * d, side.near.arm.elbow[1]],
    legsBehind: true,
  };
}

// ---------- props, weights, arrows ----------

function floor(g: Grid) {
  const top = Math.round(sc([0, FLOOR + 1])[1]);
  for (let y = top; y < N; y++)
    for (let x = 0; x < N; x++) g[y][x] = y < top + 2 ? '#3a3f4d' : (x + y) % 23 === 0 ? '#2c3140' : '#232733';
}

const IRON4: Ramp = [mix(IRON[0], NIGHT, 0.3), IRON[0], IRON[1], IRON[2]];
const STEEL4: Ramp = [STEEL[0], STEEL[1], STEEL[2], '#eef1f5'];

/** The barbell side on: the plate end on, the sleeve in the middle. */
function plateSide(g: Grid, at: P) {
  const layer = grid(N);
  ball(layer, at, 6.2, IRON4);
  ball(layer, add(at, [-0.3, -0.3]), 4.6, [IRON4[0], IRON4[0], IRON4[1], IRON4[1]]);
  ball(layer, at, 1.3, STEEL4);
  stamp(g, outline(layer));
}

/** The barbell from the front: a long bar across the shoulders, the plates on edge at both ends. */
function barFront(g: Grid, y: number) {
  const layer = grid(N);
  cone(layer, [32 - 25, y], [32 + 25, y], 0.55, 0.55, STEEL4);
  for (const x of [32 - 21.5, 32 + 21.5]) {
    const dx = x < 32 ? -1 : 1;
    for (const [off, hh] of [
      [0, 6.2],
      [1.4 * dx, 5.4],
    ] as const)
      cone(layer, [x + off, y - hh], [x + off, y + hh], 0.75, 0.75, IRON4);
  }
  stamp(g, outline(layer));
}

/** A straight arrow beside the body for the way it moves; the head for the way it moves now glows. */
function arrow(g: Grid, from: P, to: P, now: 'down' | 'up' | null) {
  const A = sc(from),
    B = sc(to),
    u = unit(sub(B, A)),
    n: P = [-u[1], u[0]];
  const dimC = mix(ARROW, NIGHT, 0.55);
  const put = (p: P, c: string) => {
    const x = Math.round(p[0]),
      y = Math.round(p[1]);
    if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c;
  };
  const length = Math.hypot(B[0] - A[0], B[1] - A[1]);
  for (let i = 0; i <= length; i++) for (const w of [-0.5, 0.5]) put(add(add(A, mul(u, i)), mul(n, w)), dimC);
  const head = (tip: P, dirn: P, lit: boolean) => {
    for (let i = 0; i < 7; i++) for (let w = -i; w <= i; w++) put(add(add(tip, mul(dirn, -i)), mul([-dirn[1], dirn[0]], w * 0.75)), lit ? ARROW : dimC);
  };
  head(B, u, now === 'down');
  head(A, mul(u, -1), now === 'up');
}

/** Which half of the rep the frame is in. */
function phase(f: number): 'down' | 'up' | null {
  const i = f % 16;
  return i >= 1 && i <= 6 ? 'down' : i >= 9 && i <= 14 ? 'up' : null;
}

// ---------- the demo ----------

export function drawExerciseHd(o: HdOpts, f: number): Grid {
  const view = o.view ?? 'side',
    k = kitFor(o),
    d = REP[f % 16],
    g = grid(N);
  // side on, the push-up is long and low: frame it a little left of the middle
  CX = o.exercise === 'pushup' && view === 'side' ? 27.5 : 32;
  floor(g);
  const arrows = o.arrows !== false;
  if (o.exercise === 'pushup') {
    const side = poseFor('pushup', f).pose,
      top = poseFor('pushup', 0).pose,
      bottom = poseFor('pushup', 6).pose;
    if (view === 'side') {
      stamp(g, sideBody(side, k, o.look));
      if (arrows) arrow(g, add(top.shoulder, [-7, -10]), add(bottom.shoulder, [-7, -10]), phase(f));
    } else {
      stamp(g, frontBody(pushupFront(side, d), k, o.look));
      if (arrows) arrow(g, [50, top.shoulder[1] - 4], [50, bottom.shoulder[1] - 4], phase(f));
    }
    return g;
  }
  // the back squat: the bar on the upper back
  const m = drawMove('barbell-squat', 'barbell', f),
    top = drawMove('barbell-squat', 'barbell', 0).pose,
    bottom = drawMove('barbell-squat', 'barbell', 6).pose;
  const bar: Weight | undefined = m.weights.find((w) => w.kind === 'barbell');
  if (view === 'side') {
    if (bar) plateSide(g, bar.at);
    stamp(g, sideBody(m.pose, k, o.look));
    if (arrows) arrow(g, add(top.hip, [-9, -2]), add(bottom.hip, [-9, -2]), phase(f));
  } else {
    stamp(g, frontBody(squatFront(m.pose, d), k, o.look));
    barFront(g, m.pose.shoulder[1] - 1.2);
    if (arrows) {
      arrow(g, [55, top.hip[1] - 3], [55, bottom.hip[1] - 3], phase(f));
    }
  }
  return g;
}
