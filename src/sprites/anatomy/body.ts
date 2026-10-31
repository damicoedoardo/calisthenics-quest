/* The anatomy demos (Edoardo 2026-10-31: "study how a body is composed with all the muscles"): a
   plain, faceless body drawn as smooth vector shapes from real proportions, with the muscle map on
   it and the muscles an exercise works colored in. Pure geometry: `scene()` turns an exercise, a
   view and a moment of the rep into SVG paths; components/AnatomyDemo.tsx only plays them.

   How it is built:
   - A 3D skeleton in centimeters (x forward, y up, z to the body's right; the floor is y = 0),
     with an adult's segment lengths. Each exercise is a pose function of how deep in the rep you
     are (0 = top, 1 = bottom); knees and elbows come from two-bone IK.
   - Each body part is a tube around its bone whose cross-section is an oval with four radii
     (front, back, outside, inside) that change along the bone. Seen from any camera, its outline is
     the widest edge of each cross-section, smoothed into curves.
   - Each muscle is a patch on its part's surface: how far along the bone (u) and which way around
     it (angle: 0 = front, 90 = outside, 180 = back, -90 = inside). Every muscle gets a faint line, so
     the body reads as anatomy; the worked ones are filled. */

export const ANATOMY_DEMOS = ['pushup', 'barbell-squat'] as const;
export type AnatomyId = (typeof ANATOMY_DEMOS)[number];
export const hasAnatomy = (id: string): id is AnatomyId => (ANATOMY_DEMOS as readonly string[]).includes(id);

export type View = 'side' | 'front';
type V3 = [number, number, number];
type V2 = [number, number];

/* ---------- Colors ---------- */

export const INK = {
  ground: '#18181b',
  floor: '#3f3f46',
  shadow: '#232327',
  skin: '#d4d4d8',
  skinFar: '#9a9aa2',
  edge: '#3f3f46',
  line: '#a1a1aa',
  lineFar: '#7c7c85',
  work: '#f97316',
  workLine: '#c2410c',
  help: '#fdba74',
  helpLine: '#ea8a3c',
  bar: '#a1a1aa',
  plate: '#52525b',
  plateRim: '#27272a',
  arrow: '#52525b',
  arrowOn: '#38bdf8',
};

/* ---------- Vectors ---------- */

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Two-bone IK: the middle joint of a limb from A to C, bending toward `pole`. */
function ik(a: V3, c: V3, l1: number, l2: number, pole: V3): V3 {
  const d = sub(c, a);
  const dist = Math.min(Math.max(len(d), Math.abs(l1 - l2) + 0.01), l1 + l2 - 0.01);
  const u = unit(d);
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const p = unit(sub(pole, mul(u, dot(pole, u))));
  return add(add(a, mul(u, along)), mul(p, h));
}

/* ---------- The body: lengths (cm) ---------- */

const L = { torso: 52, neck: 8, head: 22, upper: 30, fore: 26, thigh: 45, shin: 44, ankle: 8 };
/** Shoulder joints sit this far up the torso and out from the middle; hip joints out from it. */
const SHOULDER_UP = 46;
const SHOULDER_OUT = 18;
const HIP_OUT = 9;

/** One side's joints. */
interface Side {
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

interface Pose {
  pelvis: V3;
  neck: V3;
  headBase: V3;
  headTop: V3;
  /** Which way the chest faces. */
  front: V3;
  right: Side;
  left: Side;
  bar?: V3;
}

/* ---------- Poses ---------- */

/** Ease in and out. */
const ease = (t: number) => t * t * (3 - 2 * t);

/** Where a moment of the loop is: how deep (0 top, 1 bottom) and which way it moves. */
export function phase(t: number): { depth: number; dir: 'down' | 'up' | null } {
  const x = ((t % 1) + 1) % 1;
  if (x < 0.08) return { depth: 0, dir: null };
  if (x < 0.48) return { depth: ease((x - 0.08) / 0.4), dir: 'down' };
  if (x < 0.56) return { depth: 1, dir: null };
  if (x < 0.92) return { depth: 1 - ease((x - 0.56) / 0.36), dir: 'up' };
  return { depth: 0, dir: null };
}

/** Barbell back squat: feet a bit wider than the hips, toes a little out, the bar on the upper
    back, hips back and down until the thighs are level, the bar staying over the middle of the
    foot, knees out over the toes. */
function squat(d: number): Pose {
  const pelvis: V3 = [lerp(-3, -20, d), lerp(94, 47, d), 0];
  const lean = lerp(6, 40, d);
  const up: V3 = [Math.sin(rad(lean)), Math.cos(rad(lean)), 0];
  const front: V3 = [Math.cos(rad(lean)), -Math.sin(rad(lean)), 0];
  const neck = add(pelvis, mul(up, L.torso));
  const nod = lean * 0.5;
  const headUp: V3 = [Math.sin(rad(lean - nod)), Math.cos(rad(lean - nod)), 0];
  const headBase = add(neck, mul(headUp, L.neck));
  const headTop = add(headBase, mul(headUp, L.head));
  const bar = add(add(neck, mul(front, -9)), mul(up, -4));
  const side = (s: number): Side => {
    const hip = add(pelvis, [0, 0, s * HIP_OUT]);
    const ankle: V3 = [0, L.ankle, s * 15];
    const knee = ik(hip, ankle, L.thigh, L.shin, [1, 0.1, s * 0.5]);
    const shoulder = add(add(pelvis, mul(up, SHOULDER_UP)), [0, 0, s * SHOULDER_OUT]);
    const wrist = add(bar, [-1, -5, s * 27]);
    const elbow = ik(shoulder, wrist, L.upper, L.fore, add(mul(front, -0.45), [0, -1, s * 0.25]));
    const tip = add(bar, [4, 3, s * 27]);
    return {
      shoulder, elbow, wrist, tip, hip, knee, ankle,
      heel: [-6, 3.5, s * 14], toe: [18.5, 2.5, s * 19.5], instep: [0, 1, 0],
    };
  };
  return { pelvis, neck, headBase, headTop, front, right: side(1), left: side(-1), bar };
}

/** Push-up: hands under the shoulders, a bit wider; the body one straight line from heels to head,
    pivoting on the toes; elbows back at about 45 degrees; chest to a fist from the floor. */
function pushup(d: number): Pose {
  const ankle0: V3 = [-103, 13, 0];
  const body = L.shin + L.thigh;
  const wristX = 27;
  // The angle of the body line: arms straight at the top, shoulders a hand above the floor at the bottom.
  const shoulderY = lerp(4 + L.upper + L.fore - 1, 17, d);
  const a = Math.asin((shoulderY - ankle0[1]) / (body + SHOULDER_UP));
  const dir: V3 = [Math.cos(a), Math.sin(a), 0];
  const front: V3 = [Math.sin(a), -Math.cos(a), 0];
  const pelvis = add(ankle0, mul(dir, body));
  const neck = add(pelvis, mul(dir, L.torso));
  const headUp = unit(add(dir, [0, 0.1, 0]));
  const headBase = add(neck, mul(headUp, L.neck));
  const headTop = add(headBase, mul(headUp, L.head));
  const side = (s: number): Side => {
    const hip = add(pelvis, [0, 0, s * HIP_OUT]);
    const ankle = add(ankle0, [0, 0, s * 10]);
    const knee = add(ankle, mul(dir, L.shin));
    const shoulder = add(add(pelvis, mul(dir, SHOULDER_UP)), [0, 0, s * SHOULDER_OUT]);
    const wrist: V3 = [wristX, 4, s * 23];
    const elbow = ik(shoulder, wrist, L.upper, L.fore, [-0.75, 0.25, s * 0.6]);
    const tip: V3 = [wristX + 17, 1, s * 25];
    return {
      shoulder, elbow, wrist, tip, hip, knee, ankle,
      heel: [-107, 18, s * 10], toe: [-94, 1, s * 10], instep: unit([18, 13, 0]),
    };
  };
  return { pelvis, neck, headBase, headTop, front, right: side(1), left: side(-1) };
}

const POSES: Record<AnatomyId, (d: number) => Pose> = { pushup, 'barbell-squat': squat };

/** The cameras: which way you look from (toward the camera). Side on is level with the floor;
    from the front it is turned a little and looks a little down, so the body reads in depth. */
const CAMERAS: Record<AnatomyId, Record<View, V3>> = {
  pushup: { side: [0, 0, 1], front: unit([0.6, 0.35, 1]) },
  'barbell-squat': { side: [0, 0, 1], front: unit([1, 0.32, 0.4]) },
};

/** The floor under each exercise: its middle and how far it reaches. */
const FLOOR: Record<AnatomyId, { x: number; r: number }> = {
  pushup: { x: -35, r: 88 },
  'barbell-squat': { x: 0, r: 46 },
};

/** The floor as seen: a line side on, an oval from above. */
function floorShape(exercise: AnatomyId, cam: Camera): V2[] {
  const { x, r } = FLOOR[exercise];
  const pts: V2[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2;
    pts.push(project(cam, [x + Math.cos(t) * r, 0, Math.sin(t) * r * 0.6]));
  }
  return pts;
}

/* ---------- Body parts ---------- */

type PartId = 'torso' | 'neck' | 'head' | 'upper' | 'fore' | 'hand' | 'thigh' | 'shin' | 'foot';

/** A part's cross-section along the bone: stations u (can run past 0 or 1) and four radii. */
interface Profile {
  u: number[];
  front: number[];
  back: number[];
  out: number[];
  in: number[];
}

const SHAPES: Record<PartId, Profile> = {
  torso: {
    u: [-0.17, 0, 0.14, 0.32, 0.5, 0.66, 0.8, 0.92, 1],
    front: [5, 9, 9.5, 10.2, 10.8, 12, 12.5, 9.5, 5.5],
    back: [9, 13.5, 12.5, 8, 8.5, 10.5, 11, 9.5, 6],
    out: [13, 16.5, 16, 13.5, 14.5, 16, 16.5, 15, 6.5],
    in: [13, 16.5, 16, 13.5, 14.5, 16, 16.5, 15, 6.5],
  },
  neck: { u: [-0.2, 0.5, 1.2], front: [5.5, 5, 5.5], back: [6, 5, 5], out: [6, 5.5, 6], in: [6, 5.5, 6] },
  head: {
    u: [0, 0.16, 0.4, 0.64, 0.84, 0.97],
    front: [6.8, 8.6, 9.6, 9.6, 8.2, 5],
    back: [3.5, 6.5, 9, 9.6, 8.6, 5],
    out: [5.2, 6.6, 7.4, 7.8, 7.2, 4.8],
    in: [5.2, 6.6, 7.4, 7.8, 7.2, 4.8],
  },
  upper: {
    u: [-0.12, 0, 0.3, 0.6, 0.85, 1.05],
    front: [4.5, 5.5, 5, 5, 4, 3.6],
    back: [4.5, 5.8, 5.6, 5, 4.2, 3.6],
    out: [5, 7, 5.6, 4.6, 4.2, 3.8],
    in: [3, 4, 4, 4, 3.8, 3.6],
  },
  fore: {
    u: [-0.05, 0.15, 0.4, 0.7, 1.02],
    front: [3.6, 4.4, 4, 3, 2.3],
    back: [3.6, 3.8, 3.4, 2.7, 2.2],
    out: [4, 4.6, 4, 3, 2.6],
    in: [3.8, 4.2, 3.6, 2.8, 2.5],
  },
  hand: {
    u: [0, 0.3, 0.6, 0.85, 1],
    front: [2.2, 2.4, 2.1, 1.4, 0.8],
    back: [1.6, 1.8, 1.6, 1.1, 0.6],
    out: [2.8, 4, 4, 3.2, 1.5],
    in: [2.6, 3.8, 3.8, 3, 1.5],
  },
  thigh: {
    u: [-0.08, 0.05, 0.25, 0.5, 0.75, 0.92, 1.04],
    front: [6.5, 7.5, 8, 7.6, 6.6, 5.6, 4.8],
    back: [8, 8.5, 7.6, 6.8, 5.6, 4.8, 4.4],
    out: [8.5, 9, 8.5, 7.5, 6.2, 5.2, 4.8],
    in: [5, 6.5, 6.8, 6, 4.8, 4.4, 4.2],
  },
  shin: {
    u: [-0.04, 0.12, 0.3, 0.5, 0.72, 0.9, 1.02],
    front: [4.6, 4.4, 3.8, 3.4, 3, 2.6, 2.6],
    back: [4.6, 6, 6.6, 5.4, 3.6, 2.8, 2.8],
    out: [5, 5.2, 5.4, 4.6, 3.4, 2.8, 2.8],
    in: [4.8, 5, 5.2, 4.2, 3.2, 2.6, 2.6],
  },
  // Heel to toe tip, around the middle of the foot's height; "front" is the top of the foot.
  foot: {
    u: [0, 0.22, 0.45, 0.75, 1],
    front: [2.6, 3.6, 2.8, 1.8, 1.2],
    back: [2.4, 2.2, 1.8, 1.6, 1.1],
    out: [3, 3.4, 4, 4.4, 3],
    in: [3, 3.4, 4, 4.4, 3],
  },
};

/* ---------- Muscles ---------- */

export type MuscleId =
  | 'chest' | 'frontDelt' | 'sideDelt' | 'rearDelt' | 'triceps' | 'biceps' | 'forearm' | 'traps' | 'lats'
  | 'abs' | 'obliques' | 'lowerBack' | 'glutes' | 'quads' | 'hamstrings' | 'adductors' | 'calves' | 'shins';

/** A muscle patch: from u0 to u1 along its part, between two angles around it. Torso muscles come
    in pairs (`both`): the angle is for the right side and mirrored for the left. */
interface Muscle {
  id: MuscleId;
  part: PartId;
  u: [number, number];
  angle: [number, number];
  both?: boolean;
}

const MUSCLES: Muscle[] = [
  { id: 'abs', part: 'torso', u: [0.05, 0.64], angle: [3, 22], both: true },
  { id: 'obliques', part: 'torso', u: [0.1, 0.58], angle: [28, 88], both: true },
  { id: 'chest', part: 'torso', u: [0.64, 0.9], angle: [5, 74], both: true },
  { id: 'lats', part: 'torso', u: [0.42, 0.84], angle: [92, 152], both: true },
  { id: 'traps', part: 'torso', u: [0.8, 1.08], angle: [100, 178], both: true },
  { id: 'lowerBack', part: 'torso', u: [0.16, 0.56], angle: [154, 178], both: true },
  { id: 'glutes', part: 'torso', u: [-0.16, 0.2], angle: [104, 177], both: true },
  { id: 'frontDelt', part: 'upper', u: [-0.12, 0.4], angle: [-20, 55] },
  { id: 'sideDelt', part: 'upper', u: [-0.1, 0.38], angle: [58, 122] },
  { id: 'rearDelt', part: 'upper', u: [-0.1, 0.38], angle: [125, 195] },
  { id: 'biceps', part: 'upper', u: [0.32, 0.92], angle: [-45, 45] },
  { id: 'triceps', part: 'upper', u: [0.25, 0.95], angle: [128, 232] },
  { id: 'forearm', part: 'fore', u: [0, 0.68], angle: [-60, 100] },
  { id: 'quads', part: 'thigh', u: [0.06, 0.94], angle: [-30, 88] },
  { id: 'adductors', part: 'thigh', u: [0.02, 0.6], angle: [-105, -38] },
  { id: 'hamstrings', part: 'thigh', u: [0.08, 0.88], angle: [112, 218] },
  { id: 'shins', part: 'shin', u: [0.08, 0.66], angle: [12, 70] },
  { id: 'calves', part: 'shin', u: [0.04, 0.62], angle: [104, 236] },
];

/** Not muscles, but they make the shape read: the ears. */
const MARKS: Muscle[] = [{ id: 'traps', part: 'head', u: [0.3, 0.62], angle: [72, 112], both: true }];

/** Which muscles each exercise works: the main movers, then the helpers. */
export const WORKS: Record<AnatomyId, { main: MuscleId[]; help: MuscleId[] }> = {
  pushup: { main: ['chest', 'triceps', 'frontDelt'], help: ['abs', 'obliques'] },
  'barbell-squat': { main: ['quads', 'glutes'], help: ['adductors', 'hamstrings', 'lowerBack', 'calves'] },
};

export const MUSCLE_NAME: Record<MuscleId, string> = {
  chest: 'Chest', frontDelt: 'Front shoulders', sideDelt: 'Shoulders', rearDelt: 'Rear shoulders',
  triceps: 'Triceps', biceps: 'Biceps', forearm: 'Forearms', traps: 'Upper back', lats: 'Lats',
  abs: 'Abs', obliques: 'Obliques', lowerBack: 'Lower back', glutes: 'Glutes', quads: 'Quads',
  hamstrings: 'Hamstrings', adductors: 'Inner thighs', calves: 'Calves', shins: 'Shins',
};

/* ---------- Drawing ---------- */

export interface Shape {
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
  /** Rounded line caps (arrows). */
  round?: boolean;
}

export interface Scene {
  viewBox: string;
  shapes: Shape[];
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** A smooth closed curve through points (Catmull-Rom as cubic Beziers). */
function closed(pts: V2[]): string {
  const n = pts.length;
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: V2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: V2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return d + 'Z';
}

/** Linear lookup in a profile row. */
function at(u: number[], w: number[], x: number): number {
  if (x <= u[0]) return w[0];
  for (let i = 1; i < u.length; i++) {
    if (x <= u[i]) return lerp(w[i - 1], w[i], (x - u[i - 1]) / (u[i] - u[i - 1]));
  }
  return w[w.length - 1];
}

/** The camera: picture right, picture up, and toward the camera. */
interface Camera {
  r: V3;
  up: V3;
  c: V3;
}

function camera(c: V3): Camera {
  const r = unit(cross([0, 1, 0], c));
  return { r, up: cross(c, r), c };
}

const project = (cam: Camera, p: V3): V2 => [dot(p, cam.r), -dot(p, cam.up)];

/** A body part in 3D: its bone and the frame around it. */
interface Part {
  id: PartId;
  a: V3;
  b: V3;
  /** Front and outside directions, at right angles to the bone. */
  f: V3;
  o: V3;
}

function makePart(id: PartId, a: V3, b: V3, front: V3, out: V3): Part {
  const bone = unit(sub(b, a));
  let f = sub(front, mul(bone, dot(front, bone)));
  if (len(f) < 1e-3) f = cross(bone, out);
  f = unit(f);
  let o = cross(bone, f);
  if (dot(o, out) < 0) o = mul(o, -1);
  return { id, a, b, f, o };
}

/** A point on a part's surface (u along, angle around). */
function surface(p: Part, u: number, deg: number): V3 {
  const pr = SHAPES[p.id];
  const t = rad(deg);
  const c = Math.cos(t);
  const s = Math.sin(t);
  const rf = at(pr.u, c >= 0 ? pr.front : pr.back, u);
  const ro = at(pr.u, s >= 0 ? pr.out : pr.in, u);
  const center = add(p.a, mul(sub(p.b, p.a), u));
  return add(center, add(mul(p.f, c * rf), mul(p.o, s * ro)));
}

/** How far the round end of a part pushes past its last cross-section (share of its radius). */
const CAP: Partial<Record<PartId, number>> = { head: 0.1, hand: 0.15, foot: 0.12 };

/** A part's outline seen from the camera. */
function outline(p: Part, cam: Camera): V2[] {
  const pr = SHAPES[p.id];
  const a2 = project(cam, p.a);
  const b2 = project(cam, p.b);
  const full = len(sub(p.b, p.a));
  let dx = b2[0] - a2[0];
  let dy = b2[1] - a2[1];
  const l2 = Math.hypot(dx, dy);
  const ring = (u: number) => {
    const pts: V2[] = [];
    for (let i = 0; i < 24; i++) pts.push(project(cam, surface(p, u, i * 15)));
    return pts;
  };
  if (l2 < full * 0.18) {
    // Pointing at you: the outline of its widest cross-sections.
    const pts: V2[] = [];
    for (const u of [0.2, 0.5]) pts.push(...ring(u));
    return hull(pts);
  }
  dx /= l2;
  dy /= l2;
  const nx = -dy;
  const ny = dx;
  const left: V2[] = [];
  const right: V2[] = [];
  let start: V2 = a2;
  let end: V2 = b2;
  pr.u.forEach((u, i) => {
    const pts = ring(u);
    let lo = Infinity;
    let hi = -Infinity;
    let pl: V2 = pts[0];
    let ph: V2 = pts[0];
    for (const q of pts) {
      const k = q[0] * nx + q[1] * ny;
      if (k < lo) [lo, pl] = [k, q];
      if (k > hi) [hi, ph] = [k, q];
    }
    left.push(pl);
    right.push(ph);
    // The ends: the farthest point of the end cross-sections, pushed out for a round cap.
    const r = (at(pr.u, pr.front, u) + at(pr.u, pr.out, u)) * (CAP[p.id] ?? 0.32);
    if (i === 0) start = farthest(pts, -dx, -dy, r);
    if (i === pr.u.length - 1) end = farthest(pts, dx, dy, r);
  });
  return [start, ...left, end, ...right.reverse()];
}

function farthest(pts: V2[], dx: number, dy: number, push: number): V2 {
  let best = pts[0];
  let k = -Infinity;
  let cx = 0;
  let cy = 0;
  for (const q of pts) {
    cx += q[0] / pts.length;
    cy += q[1] / pts.length;
    const v = q[0] * dx + q[1] * dy;
    if (v > k) [k, best] = [v, q];
  }
  // Toward the middle of the cap, so it rounds instead of pointing.
  return [lerp(cx, best[0], 0.7) + dx * push, lerp(cy, best[1], 0.7) + dy * push];
}

/** Convex hull (for parts seen end on). */
function hull(pts: V2[]): V2[] {
  const s = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const crossZ = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [];
  for (const p of s) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: V2[] = [];
  for (const p of s.reverse()) {
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** A muscle's patch as seen, or null when it faces away. Angles are kept to the half you can see. */
function patch(p: Part, m: Muscle, mirror: boolean, cam: Camera): V2[] | null {
  const a0 = mirror ? -m.angle[1] : m.angle[0];
  const a1 = mirror ? -m.angle[0] : m.angle[1];
  // The angle around this part that faces the camera.
  const facing = Math.atan2(dot(cam.c, p.o), dot(cam.c, p.f)) * (180 / Math.PI);
  const lo = ((((a0 - facing) % 360) + 540) % 360) - 180;
  const hi = lo + (a1 - a0);
  const vlo = Math.max(lo, -84);
  const vhi = Math.min(hi, 84);
  // Mostly out of sight: skip it.
  if (vhi - vlo < (hi - lo) * 0.3 || vhi - vlo < 12) return null;
  const bone = unit(sub(p.b, p.a));
  if (Math.abs(dot(bone, cam.c)) > 0.95) return null;
  const steps = 10;
  const top: V2[] = [];
  const bottom: V2[] = [];
  const mid = (vlo + vhi) / 2;
  const half = (vhi - vlo) / 2;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = lerp(m.u[0], m.u[1], t);
    const e = Math.pow(Math.sin(Math.PI * t), 0.55);
    top.push(project(cam, inset(p, u, facing + mid + half * e)));
    bottom.push(project(cam, inset(p, u, facing + mid - half * e)));
  }
  return [...top, ...bottom.slice(1, steps).reverse()];
}

/** A point just inside the surface, so muscle lines sit inside the outline. */
function inset(p: Part, u: number, deg: number): V3 {
  const center = add(p.a, mul(sub(p.b, p.a), u));
  return add(center, mul(sub(surface(p, u, deg), center), 0.94));
}

/** An arrow along a straight line, lit when the body moves its way. */
function arrow(from: V2, to: V2, lit: 'from' | 'to' | 'both' | null): Shape[] {
  const out: Shape[] = [{ d: `M${f1(from[0])} ${f1(from[1])}L${f1(to[0])} ${f1(to[1])}`, stroke: INK.arrow, width: 2.2, round: true }];
  const head = (tip: V2, back: V2, on: boolean) => {
    const dx = tip[0] - back[0];
    const dy = tip[1] - back[1];
    const l = Math.hypot(dx, dy) || 1;
    const ux = dx / l;
    const uy = dy / l;
    const s = 6;
    out.push({
      d: `M${f1(tip[0] - ux * s - uy * s * 0.75)} ${f1(tip[1] - uy * s + ux * s * 0.75)}L${f1(tip[0])} ${f1(tip[1])}L${f1(tip[0] - ux * s + uy * s * 0.75)} ${f1(tip[1] - uy * s - ux * s * 0.75)}`,
      stroke: on ? INK.arrowOn : INK.arrow,
      width: 2.6,
      round: true,
    });
  };
  head(to, from, lit === 'to' || lit === 'both');
  head(from, to, lit === 'from' || lit === 'both');
  return out;
}

/** A flat disc in 3D (a plate), as seen. */
function disc(cam: Camera, center: V3, r: number): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < 20; i++) {
    const t = (i / 20) * Math.PI * 2;
    pts.push(project(cam, add(center, [Math.cos(t) * r, Math.sin(t) * r, 0])));
  }
  return pts;
}

type Limbs = Record<'upper' | 'fore' | 'hand' | 'thigh' | 'shin' | 'foot', Part>;

/** All the body parts of a pose. */
function partsOf(pose: Pose): { right: Limbs; left: Limbs; torso: Part; neck: Part; head: Part } {
  const limbs = (s: number): Limbs => {
    const sd = s > 0 ? pose.right : pose.left;
    const out: V3 = [0, 0, s];
    /** A limb part's front: away from the bend (sign 1) or toward it (-1); straight: the chest's way. */
    const fold = (a: V3, b: V3, c: V3, sign: number): V3 => {
      const bone = unit(sub(b, a));
      const other = sub(c, b);
      const perp = sub(other, mul(bone, dot(other, bone)));
      return len(perp) > 2 ? mul(unit(perp), sign) : pose.front;
    };
    return {
      upper: makePart('upper', sd.shoulder, sd.elbow, fold(sd.shoulder, sd.elbow, sd.wrist, 1), out),
      fore: makePart('fore', sd.elbow, sd.wrist, fold(sd.wrist, sd.elbow, sd.shoulder, 1), out),
      hand: makePart('hand', sd.wrist, sd.tip, pose.front, out),
      thigh: makePart('thigh', sd.hip, sd.knee, fold(sd.hip, sd.knee, sd.ankle, -1), out),
      shin: makePart('shin', sd.knee, sd.ankle, fold(sd.ankle, sd.knee, sd.hip, -1), out),
      foot: makePart('foot', sd.heel, sd.toe, sd.instep, out),
    };
  };
  const zr: V3 = [0, 0, 1];
  // The torso, neck and head are one part each; their muscles mirror for the left side.
  return {
    right: limbs(1),
    left: limbs(-1),
    torso: makePart('torso', pose.pelvis, pose.neck, pose.front, zr),
    neck: makePart('neck', pose.neck, pose.headBase, pose.front, zr),
    head: makePart('head', pose.headBase, pose.headTop, pose.front, zr),
  };
}

/** Everything to draw for one moment of a rep. */
export function scene(exercise: AnatomyId, view: View, t: number, opts: { still?: boolean } = {}): Scene {
  const { depth, dir } = opts.still ? { depth: 1, dir: null } : phase(t);
  const cam = camera(CAMERAS[exercise][view]);
  const box = frame(exercise, view);
  const level = Math.abs(cam.c[1]) < 0.01;
  const shapes: Shape[] = [
    level ? { d: `M${f1(box.x)} 0.6H${f1(box.x + box.w)}`, stroke: INK.floor, width: 1.2 } : { d: closed(floorShape(exercise, cam)), fill: INK.shadow },
  ];
  shapes.push(...draw(exercise, cam, depth));
  const lit = opts.still ? 'both' : dir === 'down' ? 'to' : dir === 'up' ? 'from' : null;
  shapes.push(...arrow(box.arrow[0], box.arrow[1], lit));
  return { viewBox: `${f1(box.x)} ${f1(box.y)} ${f1(box.w)} ${f1(box.h)}`, shapes };
}

/** The body (and bar) for one depth. */
function draw(exercise: AnatomyId, cam: Camera, depth: number): Shape[] {
  const pose = POSES[exercise](depth);
  const work = WORKS[exercise];
  const shapes: Shape[] = [];
  const { right, left, torso, neck, head } = partsOf(pose);

  // Side on, the far limbs are behind, shaded; nearer the front, both sides are drawn alike.
  const sideOn = Math.abs(cam.c[2]) > 0.3;
  const [near, far] = cam.c[2] >= 0 ? [right, left] : [left, right];
  // The near leg joins the trunk without a seam, unless its thigh comes toward you: then it needs
  // its own edge in front of the body.
  const thighAt = dot(unit(sub(near.thigh.b, near.thigh.a)), cam.c);
  const profile = thighAt < 0.5;
  const arm = (l: Limbs): Part[] => [l.upper, l.fore, l.hand];
  const leg = (l: Limbs): Part[] => [l.thigh, l.shin, l.foot];

  /** One group: all outlines under all fills, so it reads as one body; then each part's muscles,
      nearest last. */
  const group = (parts: Part[], shade = false) => {
    const depthOf = (p: Part) => dot(add(p.a, p.b), cam.c);
    const sorted = [...parts].sort((a, b) => depthOf(a) - depthOf(b));
    const paths = sorted.map((p) => closed(outline(p, cam)));
    for (const d of paths) shapes.push({ d, stroke: INK.edge, width: 1.8 });
    sorted.forEach((p, i) => {
      shapes.push({ d: paths[i], fill: shade ? INK.skinFar : INK.skin });
      for (const m of MARKS) {
        if (m.part !== p.id) continue;
        for (const mirror of [false, true]) {
          const pts = patch(p, m, mirror, cam);
          if (pts) shapes.push({ d: closed(pts), fill: shade ? INK.skinFar : INK.skin, stroke: shade ? INK.lineFar : INK.edge, width: 0.9 });
        }
      }
      for (const m of MUSCLES) {
        if (m.part !== p.id) continue;
        for (const mirror of m.both ? [false, true] : [false]) {
          const pts = patch(p, m, mirror, cam);
          if (!pts) continue;
          const d = closed(pts);
          if (work.main.includes(m.id)) shapes.push({ d, fill: shade ? INK.workLine : INK.work, stroke: INK.workLine, width: 0.7 });
          else if (work.help.includes(m.id)) shapes.push({ d, fill: shade ? INK.helpLine : INK.help, stroke: INK.helpLine, width: 0.6 });
          else shapes.push({ d, stroke: shade ? INK.lineFar : INK.line, width: 0.6 });
        }
      }
    });
  };

  if (pose.bar) {
    // The bar runs side to side with a plate near each end, behind the body.
    const bar = pose.bar;
    const ends = [add(bar, [0, 0, -108]), add(bar, [0, 0, 108])].map((p) => project(cam, p));
    shapes.push({ d: `M${f1(ends[0][0])} ${f1(ends[0][1])}L${f1(ends[1][0])} ${f1(ends[1][1])}`, stroke: INK.bar, width: 2.8, round: true });
    const plates = [-1, 1].sort((a, b) => a * cam.c[2] - b * cam.c[2]);
    for (const s of plates) {
      for (const dz of [-2.5, 0, 2.5]) shapes.push({ d: closed(disc(cam, add(bar, [0, 0, s * (84 + dz)]), 22.5)), fill: INK.plate, stroke: INK.plateRim, width: 1 });
      shapes.push({ d: closed(disc(cam, add(bar, [0, 0, s * 87]), 3)), fill: INK.plateRim });
    }
  }

  if (sideOn) {
    group([...arm(far), ...leg(far)], true);
    if (profile) group([torso, neck, head, ...leg(near)]);
    else {
      group([torso, neck, head]);
      group(leg(near));
    }
    group(arm(near));
  } else {
    group(arm(far));
    group([torso, neck, head, ...leg(far), ...leg(near)]);
    group(arm(near));
  }
  return shapes;
}

/** The frame of each exercise and view, the same for the whole rep, and where its arrow goes. */
const frames = new Map<string, { x: number; y: number; w: number; h: number; arrow: [V2, V2] }>();

function frame(exercise: AnatomyId, view: View) {
  const key = `${exercise}/${view}`;
  const hit = frames.get(key);
  if (hit) return hit;
  const cam = camera(CAMERAS[exercise][view]);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = 0;
  const take = (q: V2) => {
    x0 = Math.min(x0, q[0]);
    x1 = Math.max(x1, q[0]);
    y0 = Math.min(y0, q[1]);
    y1 = Math.max(y1, q[1]);
  };
  if (Math.abs(cam.c[1]) >= 0.01) floorShape(exercise, cam).forEach(take);
  for (const d of [0, 0.25, 0.5, 0.75, 1]) {
    const pose = POSES[exercise](d);
    const { right, left, torso, neck, head } = partsOf(pose);
    for (const p of [torso, neck, head, ...Object.values(right), ...Object.values(left)]) outline(p, cam).forEach(take);
    if (pose.bar) {
      for (const s of [-1, 1]) disc(cam, add(pose.bar, [0, 0, s * 87]), 22.5).forEach(take);
      for (const s of [-1, 1]) take(project(cam, add(pose.bar, [0, 0, s * 108])));
    }
  }
  // The arrow: beside the body, as tall as the move.
  const mover = (d: number) => {
    const pose = POSES[exercise](d);
    return project(cam, exercise === 'pushup' ? pose.neck : pose.pelvis);
  };
  const ax = exercise === 'pushup' ? x1 + 12 : x0 - 12;
  const arrowLine: [V2, V2] = [[ax, mover(0)[1] - 6], [ax, mover(1)[1] + 6]];
  x0 = Math.min(x0, ax - 8);
  x1 = Math.max(x1, ax + 8);
  const pad = 6;
  const out = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2, arrow: arrowLine };
  frames.set(key, out);
  return out;
}
