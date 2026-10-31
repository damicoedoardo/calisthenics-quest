import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid, type Painter } from '../engine/grid';
import { shifted } from './pixel';

/* The story worlds' own monsters (zones 2-6), five each (MONSTERS in src/game/dungeon/content.ts).
   The ten below with an attack nobody else has come first; the plain fun ones of each world follow. All face left, 32x32 doubled, like the Ashlands' ones.
   Their attack clip: a wind-up (frame.right 'up'), then the throw (frame.fx 'impact').
   - Mirror Lake: the Lake Echo, you as you were, a small figure of lake glass; the Glass Swan.
   - The Cold Forges: the Measure, a smith's iron rule with one stern eye; the Scrap Squire, a tin
     soldier of offcuts with a pot-lid shield.
   - The Plateau: the Dune Mole, all claws and nose; the Dust Devil, a little whirl of grit.
   - The Fog: the Maybe, a pale little doubt chewing its thumb; the Undertow, a dark pool with eyes.
   - The Summit: the Ridge Hawk; the Cairn, a stack of stones with snow on top and icicles. */

type Pal = string[];
const INK = '#14121c';

/** Two eyes: open (a dot of light), or narrowed. */
function eyes(u: Painter, x: number, y: number, gap: number, c: string, glint = '#ffffff', narrow = false) {
  [x, x + gap].forEach((ex) => {
    if (narrow) u.row(y + 1, ex, ex + 2, c);
    else {
      u.r(ex, y, 3, 3, c);
      u.p(ex, y, glint);
    }
  });
}

/** Finish a 32x32 drawing: doubled, shaded and outlined, moved by (dx, dy). */
const finish = (g: Grid, dx: number, dy: number) => shifted(outline(autoshade(scale2x(g))), dx, dy);

// ---------- Mirror Lake ----------

const GLASS: Pal = ['#1e5a7a', '#4fa3c7', '#a8e4f5', '#e8fbff'];

/** The Lake Echo: a small hooded figure of lake glass, you as you were, a crack across it, water
    rippling round its feet. Its attack: it draws back an arm and throws a shard. */
export function drawLakeEcho(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // the hood and the head inside it
  p.ellipse(16, 9, 6, 6, GLASS[1]);
  p.ellipse(15, 10, 4, 4, GLASS[2]);
  // a short cloak to the knees, legs below
  p.poly([[10, 13], [22, 13], [24, 25], [8, 25]], GLASS[1]);
  p.r(12, 25, 3, 4, GLASS[1]);
  p.r(18, 25, 3, 4, GLASS[1]);
  // the throwing arm: back and up on the wind-up, out in front on the throw
  if (wind) p.thick(20, 15, 26, 8, 1, GLASS[2]);
  else if (hit) p.thick(12, 16, 4, 14, 1, GLASS[2]);
  else p.thick(11, 15, 9, 22, 1, GLASS[2]);
  const pic = finish(g, hit ? -1 : 0, bob),
    u = painter(pic, bob);
  // its face: two pale eyes, no mouth
  eyes(u, 24, 18, 5, GLASS[0], GLASS[3]);
  // a shine down the glass, and the crack across it
  u.line(36, 30, 32, 46, GLASS[3]);
  u.line(22, 34, 28, 38, '#0f2f40');
  u.line(28, 38, 26, 42, '#0f2f40');
  // the shard in its hand
  if (wind) u.poly([[52, 12], [56, 8], [55, 16]], GLASS[3]);
  if (hit) u.poly([[4, 26], [9, 24], [8, 30]], GLASS[3]);
  // ripples round its feet
  const k = f % 8;
  u.row(60, 18 - k, 26 - k / 2, GLASS[2]);
  u.row(60, 36 + k / 2, 44 + k, GLASS[2]);
  return pic;
}

const SWAN: Pal = ['#3a7ea3', '#9fd3ea', '#dff4fb', '#ffffff'];
const BEAK = ['#c2410c', '#fb923c'];

/** The Glass Swan: a swan of pale lake glass gliding on the water. Its attack: wings up, then flung
    forward, throwing its feathers. */
export function drawSwan(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // the body on the water, the tail turned up behind (right)
  p.ellipse(18, 22, 9, 5, SWAN[2]);
  p.poly([[25, 19], [30, 15], [28, 22]], SWAN[2]);
  // the neck: an S up to the head, facing left
  p.thick(11, 20, 9, 14, 1, SWAN[2]);
  p.thick(9, 14, 10, 8, 1, SWAN[2]);
  p.ellipse(9, 7, 3, 2.5, SWAN[2]);
  p.poly([[6, 7], [2, 9], [6, 9]], BEAK[1]);
  // the wing: folded, raised, or swept forward
  if (wind) p.poly([[14, 18], [17, 8], [21, 3], [25, 5], [27, 11], [25, 18]], SWAN[1]);
  else if (hit) p.poly([[12, 18], [4, 12], [8, 10], [22, 17]], SWAN[1]);
  else p.poly([[13, 19], [26, 17], [24, 23], [14, 23]], SWAN[1]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  // the eye and the dark of the beak
  u.r(16, 12, 2, 2, INK);
  u.p(16, 12, '#ffffff');
  u.r(8, 17, 4, 1, BEAK[0]);
  // feather lines on the wing, glass shine
  if (!wind && !hit) [30, 36, 42].forEach((x) => u.line(x, 38, x + 4, 44, SWAN[0]));
  u.line(28, 40, 34, 36, SWAN[3]);
  // feathers thrown off on the attack
  if (hit)
    [[4, 22], [2, 30], [8, 18]].forEach(([x, y]) => {
      u.line(x, y, x + 4, y - 1, SWAN[3]);
      u.p(x + 1, y + 1, SWAN[1]);
    });
  // the water: a glassy line it glides on
  const k = f % 8;
  u.row(56, 14 + (k >> 1), 54 - (k >> 1), SWAN[1]);
  u.row(58, 20 + k, 30 + k, SWAN[0]);
  return pic;
}

// ---------- the Cold Forges ----------

const IRON: Pal = ['#26262b', '#4a4a52', '#7b7b86', '#b9bcc6'];
const BRASS: Pal = ['#7c5a1e', '#c9a23a', '#f2dc8a'];
const RUST = ['#7c2d12', '#c2410c'];

/** The Measure: a smith's iron rule standing on two short legs, tick marks down its edge, a brass
    cap, one stern eye behind a monocle. Its attack: it leans back, then snaps level and the nails
    fly. */
export function drawMeasure(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // the rule: a tall plank of iron, brass bands top and bottom, a hinge at its middle
  p.r(11, 3, 10, 23, IRON[2]);
  p.r(11, 2, 10, 2, BRASS[1]);
  p.r(11, 24, 10, 2, BRASS[1]);
  p.r(11, 14, 10, 1, BRASS[0]);
  // arms holding a fistful of nails
  p.thick(11, 16, 6, wind ? 10 : hit ? 18 : 20, 1, IRON[1]);
  p.thick(21, 16, 25, 20, 1, IRON[1]);
  // legs
  p.r(12, 26, 2, 4, IRON[1]);
  p.r(18, 26, 2, 4, IRON[1]);
  p.r(11, 29, 4, 1, IRON[0]);
  p.r(17, 29, 4, 1, IRON[0]);
  const tilt = wind ? 2 : hit ? -2 : 0,
    pic = finish(g, tilt, bob),
    u = painter(pic, bob);
  const X = (x: number) => x + tilt;
  // tick marks down its edge, long every fourth
  for (let y = 10; y < 50; y += 3) u.row(y, X(24), X(24 + (y % 12 === 10 ? 6 : 3)), IRON[0]);
  // the stern eye with its monocle, a heavy brow
  u.ellipse(X(29), 15, 4, 4, BRASS[1]);
  u.ellipse(X(29), 15, 3, 3, '#f4ecd8');
  u.r(X(28), 14, 3, 3, INK);
  u.p(X(28), 14, '#ffffff');
  u.line(X(33), 18, X(34), 26, BRASS[0]);
  u.line(X(24), 9, X(34), 11, INK);
  // the mouth: a flat line, tight
  u.row(22, X(26), X(32), INK);
  // nails in its fist, and flying on the attack
  const fx = wind ? 10 : hit ? 8 : 10,
    fy = wind ? 18 : hit ? 34 : 38;
  [0, 3, 6].forEach((d) => u.col(X(fx + d - 2), fy - 4, fy + 1, IRON[3]));
  if (hit) [26, 32, 38].forEach((y) => u.row(y, 0, 4, IRON[3]));
  // a glint on the brass now and then
  if (f % 8 === 2) u.p(X(36), 5, '#ffffff');
  return pic;
}

/** The Scrap Squire: a tin soldier of offcuts. A bucket helm with a slit, mismatched plates,
    rivets, rust, a pot-lid shield and a bent nail of a sword. Its attack: shield up, then a jab. */
export function drawSquire(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // legs: two pipes, one shorter (a block under it)
  p.r(13, 22, 3, 7, IRON[1]);
  p.r(18, 22, 3, 6, IRON[2]);
  p.r(18, 28, 3, 1, RUST[0]);
  p.r(12, 28, 5, 2, IRON[0]);
  p.r(17, 29, 5, 1, IRON[0]);
  // the body: a can of a breastplate, a plate patched on
  p.r(11, 12, 11, 11, IRON[2]);
  p.r(17, 14, 5, 6, IRON[1]);
  // the bucket helm
  p.r(12, 3, 9, 9, IRON[2]);
  p.r(11, 3, 11, 2, IRON[3]);
  // the pot-lid shield on its back arm (right), the bent-nail sword in front
  p.ellipse(24, 16, 4, 6, IRON[1]);
  const [sx, sy] = wind ? [6, 4] : hit ? [1, 15] : [5, 22];
  p.thick(11, 16, sx, sy, 1, IRON[3]);
  const pic = finish(g, hit ? -2 : 0, bob),
    u = painter(pic, bob);
  const X = (x: number) => x + (hit ? -2 : 0);
  // the visor slit, eyes glowing inside
  u.r(X(24), 14, 14, 3, INK);
  u.r(X(26), 14, 3, 2, '#f59e0b');
  u.r(X(32), 14, 3, 2, '#f59e0b');
  if (!hit && f % 8 === 5) u.r(X(26), 14, 9, 2, INK);
  // rivets, rust spots, the pot-lid's handle
  [[24, 28], [38, 28], [24, 40], [38, 40]].forEach(([x, y]) => u.p(X(x), y, IRON[3]));
  [[30, 36], [33, 44], [20, 10]].forEach(([x, y]) => u.r(X(x), y, 2, 2, RUST[1]));
  u.r(X(46), 30, 4, 2, IRON[3]);
  // a feather of red cloth stuck in the helm
  u.poly([[X(40), 6], [X(46), 0], [X(44), 6]], '#b91c1c');
  return pic;
}

// ---------- the Plateau ----------

const FUR: Pal = ['#3d2a17', '#6e4c2a', '#9c7448', '#cfa877'];
const SAND: Pal = ['#7a5a32', '#b08850', '#d9b47a', '#f1dcae'];
const NOSE = ['#be5a7a', '#f2a5bc'];

/** The Dune Mole: a round sand-brown mole up out of its hole, a pink nose, tiny squinting eyes, and
    great digging claws. Its attack: claws up, then down, throwing sand. */
export function drawMole(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // the hole it stands in, a ring of sand
  p.ellipse(16, 27, 12, 3, SAND[1]);
  // the body, round, rising out of the hole
  p.ellipse(16, 17, 9, 10, FUR[2]);
  p.ellipse(15, 20, 6, 6, FUR[3]);
  // the snout, out in front (left)
  p.ellipse(8, 15, 4, 3, FUR[3]);
  // the claws: big pale spades, up on the wind-up, down on the strike
  const cy = wind ? 6 : hit ? 22 : 18;
  p.ellipse(7, cy, 4, 3, FUR[3]);
  p.ellipse(24, cy + 1, 4, 3, FUR[3]);
  const pic = finish(g, 0, bob + (hit ? 1 : 0)),
    u = painter(pic, bob + (hit ? 1 : 0));
  // the nose, whiskers, the squinting eyes
  u.ellipse(6, 29, 3, 3, NOSE[0]);
  u.p(5, 28, NOSE[1]);
  u.line(10, 30, 2, 26, FUR[0]);
  u.line(10, 32, 2, 34, FUR[0]);
  u.row(24, 18, 21, INK);
  u.row(24, 26, 29, INK);
  if (wind || hit) {
    u.p(19, 23, INK);
    u.p(27, 23, INK);
  }
  // the claws' nails
  [cy * 2 - 4, cy * 2].forEach((y) => {
    u.row(y + 2, 6, 8, '#f8fafc');
    u.row(y + 4, 40, 42, '#f8fafc');
  });
  // sand spraying on the strike, grains trickling off it otherwise
  if (hit) [[2, 44], [6, 40], [52, 42], [56, 38], [10, 46]].forEach(([x, y]) => u.r(x, y, 2, 2, SAND[2]));
  else u.p(44, 36 + (f % 4) * 3, SAND[3]);
  return pic;
}

/** The Dust Devil: a little whirlwind of grit, wide at the top, angry eyes in the whirl, pebbles
    flying round it. Its attack: it spins tight, then throws a ball of sand. */
export function drawDevil(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    tight = wind ? 2 : 0;
  // the funnel: stacked swirls, widest on top, the tip on the ground
  const rows: [number, number][] = [[6, 11], [10, 10], [14, 8], [18, 6], [22, 4], [26, 2]];
  rows.forEach(([y, w], i) => p.ellipse(16 + ((i + (f >> 1)) % 2 ? 1 : -1), y, Math.max(1, w - tight), 2.5, SAND[i % 2 ? 1 : 2]));
  const pic = finish(g, hit ? -2 : 0, bob),
    u = painter(pic, bob);
  // swirl lines turning across it
  for (let i = 0; i < 5; i++) {
    const y = 10 + i * 9,
      x0 = 14 + ((f * 3 + i * 7) % 18);
    u.line(x0, y, x0 + 10, y + 2, SAND[3]);
  }
  // the eyes: slanted, angry
  u.line(22, 14, 28, 17, INK);
  u.line(42, 14, 36, 17, INK);
  u.r(24, 18, 4, 3, INK);
  u.r(36, 18, 4, 3, INK);
  u.p(25, 18, '#fde047');
  u.p(37, 18, '#fde047');
  // pebbles flying round it
  for (let i = 0; i < 3; i++) {
    const a = f * 0.8 + (i * Math.PI * 2) / 3,
      x = 32 + Math.cos(a) * 24,
      y = 30 + Math.sin(a) * 8;
    u.r(Math.round(x), Math.round(y), 3, 2, SAND[0]);
  }
  // the sand ball on the throw
  if (hit) {
    u.ellipse(6, 20, 5, 5, SAND[1]);
    u.p(5, 18, SAND[3]);
  }
  return pic;
}

// ---------- the Fog ----------

const DOUBT: Pal = ['#5b5876', '#9d9ab8', '#d6d3ea', '#f6f5ff'];

/** The Maybe: a pale little doubt, round and see-through at the edges, chewing its thumb, a curl
    of a question floating over it. Its attack: it flinches, then lets its shots go. */
export function drawMaybe(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // a round body tapering into a wavering tail
  p.ellipse(16, 15, 9, 9, DOUBT[2]);
  const wav = f % 4 < 2 ? 1 : -1;
  p.poly([[9, 19], [23, 19], [20 + wav, 28], [16, 24], [12 - wav, 28]], DOUBT[2]);
  // the thumb at its mouth, or both hands up on the flinch
  if (wind) {
    p.ellipse(7, 10, 2, 2, DOUBT[2]);
    p.ellipse(25, 10, 2, 2, DOUBT[2]);
  } else p.ellipse(11, 19, 2.5, 2, DOUBT[2]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  // big worried eyes, brows up, looking aside
  eyes(u, 18, 24, 9, INK, '#ffffff', hit);
  u.line(16, 20, 21, 18, DOUBT[0]);
  u.line(34, 18, 29, 20, DOUBT[0]);
  if (!hit) u.ellipse(24, 35, 2, 1.5, DOUBT[0]);
  // wisps of fog trailing off its tail
  for (let i = 0; i < 4; i++) u.p(22 + i * 6 + ((f + i) % 3), 58 + (i % 2) * 2, DOUBT[1]);
  // the question over its head, bobbing
  const qy = 2 + ((f >> 1) % 2);
  u.row(qy, 30, 34, DOUBT[3]);
  u.col(35, qy + 1, qy + 3, DOUBT[3]);
  u.row(qy + 4, 32, 34, DOUBT[3]);
  u.p(32, qy + 5, DOUBT[3]);
  u.p(32, qy + 7, DOUBT[3]);
  return pic;
}

const POOL: Pal = ['#06171c', '#0f3a45', '#1f6b78', '#5fb3bd'];

/** The Undertow: a dark pool spread on the ground, a slow whirl turning in it, two pale eyes, and
    fingers of water reaching out. Its attack: it rises a little, then rings spill out of it. */
export function drawUndertow(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    rise = wind ? 3 : hit ? 1 : 0;
  // the pool, and a hump rising out of it where the eyes are
  p.ellipse(16, 23, 14, 6, POOL[1]);
  p.ellipse(16, 18 - rise, 7, 6 + rise, POOL[2]);
  // fingers of water reaching out of the edge
  for (let i = 0; i < 4; i++) {
    const a = Math.PI + (i / 3) * Math.PI + Math.sin((f + i * 2) * 0.8) * 0.15,
      x = 16 + Math.cos(a) * 14,
      y = 23 + Math.sin(a) * 6;
    p.thick(x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3 - 1, 0, POOL[2]);
  }
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  // the whirl turning in the pool
  for (let i = 0; i < 12; i++) {
    const a = i * 0.55 + f * 0.4,
      r = 4 + i * 1.6;
    u.p(Math.round(32 + Math.cos(a) * r), Math.round(48 + Math.sin(a) * r * 0.4), i % 3 ? POOL[3] : POOL[0]);
  }
  // the eyes: pale, wide, patient
  const ey = 30 - rise * 2;
  u.ellipse(26, ey, 3, 3, '#d9f2f4');
  u.ellipse(38, ey, 3, 3, '#d9f2f4');
  u.r(25, ey, 2, 2, INK);
  u.r(37, ey, 2, 2, INK);
  // drips running off as it rises
  if (wind) [[20, 40], [44, 38]].forEach(([x, y]) => u.col(x, y, y + 4, POOL[3]));
  return pic;
}

// ---------- the Summit ----------

const HAWK: Pal = ['#3b2414', '#6b4226', '#9a6a3e', '#d1a774'];
const CHEST = ['#e7e5e4', '#fafaf9'];
const TALON = '#f59e0b';

/** The Ridge Hawk: a brown hawk with a pale chest, wings spread wide, hooked yellow beak. Its
    attack: wings swept up, then folded back as it dives. */
export function drawHawk(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    flap = f % 4 < 2 ? 0 : 2;
  // the body, the tail fanned behind (right)
  p.ellipse(16, 17, 6, 5, HAWK[2]);
  p.poly([[20, 17], [29, 14], [29, 21]], HAWK[1]);
  p.ellipse(14, 18, 3, 3, CHEST[0]);
  // the head, facing left, the hooked beak
  p.ellipse(10, 12, 4, 3.5, HAWK[2]);
  p.poly([[6, 12], [3, 13], [5, 15], [7, 14]], TALON);
  // the wings: spread and flapping, swept up, or folded back on the dive
  if (hit) p.poly([[14, 14], [28, 10], [26, 15]], HAWK[1]);
  else if (wind) {
    p.poly([[12, 14], [6, 1], [12, 3], [20, 14]], HAWK[1]);
    p.poly([[16, 14], [22, 0], [26, 4], [22, 15]], HAWK[0]);
  } else {
    p.poly([[12, 15], [2, 6 + flap], [8, 6 + flap], [19, 14]], HAWK[1]);
    p.poly([[16, 15], [27, 5 + flap], [30, 9 + flap], [21, 17]], HAWK[0]);
  }
  // talons tucked under
  p.r(14, 22, 1, 3, TALON);
  p.r(17, 22, 1, 3, TALON);
  const pic = finish(g, hit ? -3 : 0, bob + (hit ? 2 : 0)),
    u = painter(pic, bob + (hit ? 2 : 0));
  const X = (x: number) => x + (hit ? -3 : 0);
  // the fierce eye and brow
  u.r(X(16), 21, 3, 3, '#fde047');
  u.p(X(16), 22, INK);
  u.line(X(14), 20, X(21), 21, INK);
  // feather tips along the wings, speckles on the chest
  if (!hit && !wind) [[6, 14 + flap * 2], [10, 14 + flap * 2], [52, 12 + flap * 2], [56, 16 + flap * 2]].forEach(([x, y]) => u.p(X(x), y, HAWK[3]));
  [[26, 36], [30, 38], [28, 40]].forEach(([x, y]) => u.p(X(x), y, HAWK[1]));
  // speed lines on the dive
  if (hit) [28, 36, 44].forEach((y, i) => u.row(y, 54 + i * 2, 63, CHEST[1]));
  return pic;
}

const STONE: Pal = ['#2e3440', '#4c5566', '#7a8599', '#b4bfd0'];
const SNOW = ['#dbeafe', '#ffffff'];
const ICE = ['#7dd3fc', '#e0f2fe'];

/** The Cairn: four stones stacked, smaller to the top, snow on each, icicles hanging off the
    edges, a sleepy stern face on the middle stone. Its attack: it shudders and the icicles shake
    loose. */
export function drawCairn(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  const stones: [number, number, number, number][] = [
    [16, 25, 11, 4],
    [16, 18, 9, 4],
    [15, 11, 6, 3.5],
    [16, 5, 3.5, 2.5],
  ];
  stones.forEach(([x, y, rx, ry], i) => p.ellipse(x + (wind && i % 2 ? 1 : 0), y, rx, ry, STONE[i % 2 ? 2 : 1]));
  // snow sitting on top of each stone
  stones.forEach(([x, y, rx, ry]) => p.ellipse(x, y - ry + 1, rx - 1, 1.2, SNOW[0]));
  const shake = hit ? (f % 2 ? 1 : -1) : 0,
    pic = finish(g, shake, bob),
    u = painter(pic, bob),
    X = (x: number) => x + shake;
  // the face on the middle stone: heavy brows, eyes that open on the shudder
  u.line(X(22), 32, X(28), 34, INK);
  u.line(X(42), 32, X(36), 34, INK);
  if (wind || hit) {
    u.r(X(23), 35, 3, 3, ICE[0]);
    u.r(X(37), 35, 3, 3, ICE[0]);
  } else {
    u.row(36, X(23), X(27), INK);
    u.row(36, X(37), X(41), INK);
  }
  u.row(42, X(29), X(35), INK);
  // icicles hanging off the stones' edges, dropping on the shudder
  const drop = hit ? 4 : 0;
  [[8, 54], [16, 56], [48, 54], [12, 40], [50, 40], [20, 26]].forEach(([x, y], i) => {
    const len = 3 + (i % 3) * 2,
      dy = i % 2 ? drop : 0;
    u.col(X(x), y + dy, y + dy + len, ICE[0]);
    u.p(X(x), y + dy, ICE[1]);
  });
  // a sparkle of frost, and snow drifting past
  if (f % 8 === 1) u.p(X(30), 6, SNOW[1]);
  const k = f % 8;
  u.p(52 - k * 2, 4 + k * 3, SNOW[1]);
  return pic;
}

// ---------- the plain fun ones, three per world ----------

/** The Puddle Frog (Mirror Lake): a fat glass-green frog. Its attack: it crouches, then leaps. */
export function drawFrog(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    G = ['#14532d', '#2f8f5b', '#6fd39a', '#c8f7dc'],
    g = grid(32),
    p = painter(g),
    sq = wind ? 2 : 0,
    up = hit ? -4 : 0;
  p.ellipse(16, 20 + sq + up, 10, 7 - sq / 2, G[1]);
  p.ellipse(15, 22 + sq + up, 6, 4, G[3]);
  // eyes on top, the back legs folded
  p.ellipse(11, 13 + sq + up, 3, 3, G[1]);
  p.ellipse(20, 13 + sq + up, 3, 3, G[1]);
  p.ellipse(25, 25 + up, 4, 3, G[1]);
  p.r(6, 26 + up, 4, 2, G[2]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  eyes(u, 20, 24 + sq * 2 + up * 2, 18, INK);
  u.row(38 + sq * 2 + up * 2, 16, 34, G[0]);
  // spots, a shine, ripples under it
  [[34, 36], [40, 42], [28, 32]].forEach(([x, y]) => u.r(x, y + sq * 2 + up * 2, 2, 2, G[0]));
  if (!hit) u.row(58, 12 + (f % 4), 50 - (f % 4), '#7dd3fc');
  return pic;
}

/** The Glass Eel (Mirror Lake): a long glassy eel curving through the air. Its attack: it coils,
    then snaps its jaw open. */
export function drawEel(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    E = ['#0e3a52', '#2b78ad', '#7cc8ea', '#d9f4ff'],
    g = grid(32),
    p = painter(g);
  // the body: a chain of circles waving behind the head
  for (let i = 0; i < 7; i++) {
    const x = 8 + i * 3.4,
      y = 16 + Math.sin(f * 0.8 + i * 0.9) * (wind ? 5 : 3);
    p.ellipse(x, y, 4 - i * 0.35, 4 - i * 0.35, E[i % 2 ? 1 : 2]);
  }
  // the fin along its back
  p.poly([[12, 11], [22, 8], [26, 12]], E[3]);
  const pic = finish(g, hit ? -2 : 0, bob),
    u = painter(pic, bob);
  const hy = Math.round((16 + Math.sin(f * 0.8) * (wind ? 5 : 3)) * 2);
  u.r(12, hy - 4, 3, 3, '#fde047');
  u.p(12, hy - 4, INK);
  u.row(hy + 3, 6, hit ? 8 : 14, INK);
  if (hit) u.row(hy + 5, 6, 12, INK);
  return pic;
}

/** The Lily (Mirror Lake): a big lily pad with a closed bud on it that has a face. Its attack:
    the petals spring open. */
export function drawLily(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    L = ['#14532d', '#22804a', '#4ade80'],
    P = ['#9d174d', '#ec4899', '#fbcfe8', '#fff1f8'],
    g = grid(32),
    p = painter(g);
  p.ellipse(16, 25, 13, 4, L[1]);
  p.poly([[16, 25], [26, 22], [26, 27]], '#0b2540');
  // the bud: closed, swelling, or open in petals
  if (hit)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.ellipse(16 + Math.cos(a) * 6, 16 + Math.sin(a) * 4, 4, 3, P[i % 2 ? 1 : 2]);
    }
  else {
    p.ellipse(16, 15, wind ? 7 : 6, wind ? 9 : 8, P[1]);
    p.poly([[10, 12], [16, 3], [22, 12]], P[2]);
  }
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  if (hit) {
    u.ellipse(32, 32, 4, 4, '#fde047');
    eyes(u, 28, 30, 6, INK);
  } else eyes(u, 25, 30, 10, INK, '#ffffff', f % 8 === 4);
  u.row(52, 14, 50, L[2]);
  return pic;
}

const SOOT: Pal = ['#1a1618', '#3b3436', '#6b6264', '#a39a98'];

/** The Soot Rat (the Cold Forges): a little black rat, ember eyes, a long tail. Its attack: it
    rears up and squeaks. */
export function drawRat(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    rear = wind || hit ? -3 : 0,
    run = f % 2;
  p.ellipse(17, 21 + rear / 2, 7, 5, SOOT[2]);
  p.ellipse(10, 18 + rear, 4, 3.5, SOOT[2]);
  p.poly([[7, 18 + rear], [3, 20 + rear], [7, 21 + rear]], SOOT[2]);
  p.ellipse(11, 14 + rear, 2, 2, SOOT[2]);
  p.r(13 + run, 25, 2, 3, SOOT[0]);
  p.r(20 - run, 25, 2, 3, SOOT[0]);
  p.thick(24, 21, 30, 17 + run * 2, 0, SOOT[2]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  u.r(16, 32 + rear * 2, 2, 2, '#f97316');
  u.p(16, 32 + rear * 2, '#fde68a');
  u.p(6, 38 + rear * 2, '#f2a5bc');
  if (hit) u.row(42 + rear * 2, 8, 12, '#ffffff');
  return pic;
}

/** The Cinder Bat (the Cold Forges): a small soot bat with glowing wing edges. Its attack: wings
    wide, then a spark from its mouth. */
export function drawBat(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    flap = wind ? -4 : f % 4 < 2 ? 0 : 4;
  p.ellipse(16, 16, 5, 5, SOOT[1]);
  p.poly([[5, 12], [9, 10], [12, 13]], SOOT[1]);
  p.poly([[27, 12], [23, 10], [20, 13]], SOOT[1]);
  p.poly([[12, 15], [1, 8 + flap], [4, 18 + flap / 2], [12, 19]], SOOT[2]);
  p.poly([[20, 15], [31, 8 + flap], [28, 18 + flap / 2], [20, 19]], SOOT[2]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  // ember edges along the wings
  for (let x = 4; x < 22; x += 3) u.p(x, 20 + flap + Math.round((22 - x) * 0.4), '#f97316');
  for (let x = 42; x < 60; x += 3) u.p(x, 20 + flap + Math.round((x - 42) * 0.4), '#f97316');
  eyes(u, 26, 28, 7, '#fbbf24', '#fef3c7');
  u.p(29, 37, '#ffffff');
  u.p(34, 37, '#ffffff');
  if (hit) u.r(30, 40, 3, 3, '#fde047');
  return pic;
}

/** The Kiln (the Cold Forges): a squat brick kiln on stubby feet, its open door a glowing mouth, a
    chimney puffing. Its attack: the mouth flares and a coal flies. */
export function drawKiln(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    B = ['#5a1f14', '#8f3a22', '#b85a36'],
    g = grid(32),
    p = painter(g);
  p.ellipse(16, 18, 11, 10, B[1]);
  p.r(6, 18, 21, 9, B[1]);
  p.r(20, 2, 5, 9, B[0]);
  p.r(8, 27, 4, 3, B[0]);
  p.r(21, 27, 4, 3, B[0]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  // brick lines
  for (let y = 26; y < 54; y += 6) u.row(y, 16, 50, B[0]);
  for (let y = 26; y < 54; y += 12) [22, 34, 46].forEach((x) => u.col(x + (y % 24 ? 6 : 0), y, y + 5, B[0]));
  // the mouth: a glowing arch
  const glow = hit ? '#fef08a' : wind ? '#fbbf24' : f % 4 < 2 ? '#f97316' : '#ea580c';
  u.ellipse(26, 44, 8, hit ? 8 : 6, INK);
  u.ellipse(26, 46, 6, hit ? 5 : 3, glow);
  eyes(u, 18, 30, 12, glow, '#fff7ed');
  // smoke puffs off the chimney
  const k = f % 8;
  u.ellipse(46 - k, 0 + (k > 3 ? 0 : 2), 3, 2, SOOT[2]);
  return pic;
}

/** The Scarab (the Plateau): a beetle with a sandstone shell pushing a ball of dung-sand. Its
    attack: it rears up and shoves the ball. */
export function drawScarab(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    S = ['#3b2a10', '#7a5a1e', '#c99a3a', '#f2d48a'],
    g = grid(32),
    p = painter(g);
  // the ball in front (left), turning
  p.ellipse(8, 20, 6, 6, SAND[1]);
  // the shell, the head toward the ball
  p.ellipse(21, 19 - (wind ? 2 : 0), 8, 6, S[2]);
  p.ellipse(13, 20, 3, 3, S[1]);
  [[16, 24], [21, 25], [26, 24]].forEach(([x, y], i) => p.r(x, y + ((f + i) % 2), 1, 3, S[0]));
  const pic = finish(g, hit ? -2 : 0, bob),
    u = painter(pic, bob);
  u.col(42, 28, 48, S[1]);
  u.line(34, 30, 52, 30, S[3]);
  for (let i = 0; i < 4; i++) {
    const a = f * 0.7 + i * 1.6;
    u.p(Math.round(16 + Math.cos(a) * 8), Math.round(40 + Math.sin(a) * 8), SAND[0]);
  }
  u.r(24, 38, 2, 2, '#fde047');
  return pic;
}

/** The Cactus (the Plateau): a round desert cactus with arms, a flower on top and a grumpy face.
    Its attack: it puffs up and the needles stand out. */
export function drawCactus(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    C = ['#14532d', '#2f7a3b', '#5fae5a', '#a7e08a'],
    g = grid(32),
    p = painter(g),
    puff = wind ? 1 : 0;
  p.ellipse(16, 16, 6 + puff, 12, C[2]);
  p.ellipse(7, 15, 2.5, 5, C[2]);
  p.r(7, 18, 5, 3, C[2]);
  p.ellipse(25, 11, 2.5, 5, C[2]);
  p.r(21, 14, 5, 3, C[2]);
  p.r(9, 27, 15, 3, SAND[0]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  // ribs, needles, the flower
  [26, 32, 38].forEach((x) => u.col(x, 10, 50, C[1]));
  const n = hit || wind ? 3 : 1;
  for (let y = 10; y < 52; y += 6)
    [20, 44].forEach((x) => u.row(y, x - (x < 32 ? n : 0), x + (x > 32 ? n : 0), '#f5f5dc'));
  u.ellipse(32, 6, 4, 3, '#f472b6');
  u.p(32, 6, '#fde047');
  u.line(26, 22, 30, 24, INK);
  u.line(38, 22, 34, 24, INK);
  u.r(27, 25, 3, 3, INK);
  u.r(35, 25, 3, 3, INK);
  u.row(32, 29, 35, INK);
  if (f % 8 === 3) u.p(28, 25, '#ffffff');
  return pic;
}

/** The Sun Lizard (the Plateau): a frilled lizard, sunset orange, its frill a sun. Its attack: the
    frill flares open. */
export function drawLizard(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    O = ['#7c2d12', '#c2410c', '#f97316', '#fdba74'],
    g = grid(32),
    p = painter(g),
    open = wind || hit;
  // the frill: a fan of points behind the head
  if (open)
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.6 + (i / 6) * Math.PI * 1.1;
      p.poly([[11, 14], [11 + Math.cos(a) * 11, 14 + Math.sin(a) * 11], [11 + Math.cos(a + 0.25) * 9, 14 + Math.sin(a + 0.25) * 9]], i % 2 ? '#fde047' : O[2]);
    }
  p.ellipse(18, 20, 8, 4, O[2]);
  p.ellipse(9, 15, 4, 3, O[2]);
  p.thick(25, 21, 31, 26, 1, O[1]);
  p.r(13, 23, 2, 4, O[1]);
  p.r(21, 23, 2, 4, O[1]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  u.r(16, 26, 3, 3, INK);
  u.p(16, 26, '#fde047');
  u.row(34, 8, 14, O[0]);
  for (let x = 26; x < 50; x += 5) u.p(x, 36, O[3]);
  if (!open && f % 8 === 6) u.row(34, 4, 8, '#f472b6');
  return pic;
}

/** The Lamp Moth (the Fog): a soft grey moth with a glowing lantern-belly. Its attack: wings up,
    the glow flares. */
export function drawMoth(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    M = ['#3f3d52', '#7a7794', '#b9b6cf', '#e8e6f5'],
    g = grid(32),
    p = painter(g),
    flap = wind ? -3 : f % 4 < 2 ? 0 : 2;
  p.ellipse(9, 13 + flap, 7, 6, M[2]);
  p.ellipse(23, 13 + flap, 7, 6, M[2]);
  p.ellipse(10, 21, 5, 4, M[1]);
  p.ellipse(22, 21, 5, 4, M[1]);
  p.ellipse(16, 17, 3, 7, M[1]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  // eye spots on the wings, the glowing belly, feathery feelers
  u.ellipse(18, 26 + flap * 2, 3, 3, M[0]);
  u.ellipse(46, 26 + flap * 2, 3, 3, M[0]);
  u.ellipse(32, 40, 4, 5, hit ? '#fef08a' : '#fde68a');
  u.p(31, 38, '#ffffff');
  u.line(30, 22, 24, 12, M[3]);
  u.line(34, 22, 40, 12, M[3]);
  u.r(29, 24, 2, 2, INK);
  u.r(34, 24, 2, 2, INK);
  return pic;
}

/** The Pale Hound (the Fog): a lean grey hound, half fog, with white eyes. Its attack: it crouches,
    then bites. */
export function drawHound(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    H = ['#2f3442', '#5b6273', '#8f97a8', '#cfd5e0'],
    g = grid(32),
    p = painter(g),
    low = wind ? 2 : 0,
    step = f % 2;
  p.ellipse(18, 18 + low, 8, 4, H[2]);
  p.ellipse(9, 14 + low, 4, 3.5, H[2]);
  p.poly([[6, 15 + low], [1, 16 + low], [6, 18 + low]], H[2]);
  p.poly([[10, 11 + low], [12, 6 + low], [13, 11 + low]], H[1]);
  p.r(12 + step, 21 + low, 2, 6 - low, H[1]);
  p.r(22 - step, 21 + low, 2, 6 - low, H[1]);
  p.thick(25, 17 + low, 30, 12, 0, H[2]);
  const pic = finish(g, hit ? -3 : 0, bob),
    u = painter(pic, bob);
  const X = (x: number) => x + (hit ? -3 : 0);
  u.r(X(14), 26 + low * 2, 3, 2, '#ffffff');
  if (hit) {
    u.row(34, X(2), X(12), INK);
    [4, 8].forEach((x) => u.p(X(x), 35, '#ffffff'));
  }
  // its back half thins into fog
  for (let i = 0; i < 5; i++) u.p(44 + i * 3, 52 + ((f + i) % 3), H[3]);
  return pic;
}

/** The Fog Shroom (the Fog): a fat mushroom with a spotted grey-violet cap and sleepy eyes. Its
    attack: the cap squashes down and puffs spores. */
export function drawShroom(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    C = ['#3b2f5c', '#6a5a9a', '#a294d0'],
    g = grid(32),
    p = painter(g),
    sq = wind ? 2 : 0;
  p.r(11, 17, 10, 11, '#e7dcc8');
  p.ellipse(16, 13 + sq, 13, 8 - sq, C[1]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  [[14, 18], [30, 12], [44, 20], [24, 26]].forEach(([x, y]) => u.ellipse(x, y + sq * 2, 2.5, 2, C[2]));
  eyes(u, 25, 42, 10, INK, '#ffffff', f % 8 === 2);
  u.row(49, 29, 34, '#a8977c');
  if (hit) for (let i = 0; i < 6; i++) u.r(8 + i * 9, 4 - (i % 2) * 3, 2, 2, '#c4b5fd');
  return pic;
}

/** The Yeti Cub (the Summit): a round white furball with a blue face and little horns. Its attack:
    it raises a snowball over its head and throws. */
export function drawYeti(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    W = ['#94a3b8', '#cbd5e1', '#f1f5f9'],
    g = grid(32),
    p = painter(g);
  p.ellipse(16, 18, 10, 10, W[2]);
  p.r(10, 26, 4, 3, W[1]);
  p.r(18, 26, 4, 3, W[1]);
  p.poly([[9, 9], [7, 3], [12, 8]], '#a8a29e');
  p.poly([[23, 9], [25, 3], [20, 8]], '#a8a29e');
  // the arms: up with a snowball, thrown forward, or down
  if (wind) {
    p.thick(9, 14, 8, 4, 1, W[2]);
    p.ellipse(9, 2, 3, 3, '#ffffff');
  } else if (hit) p.thick(8, 16, 2, 14, 1, W[2]);
  else p.thick(7, 16, 6, 22, 1, W[2]);
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  u.ellipse(30, 32, 8, 6, '#60a5fa');
  eyes(u, 25, 29, 7, INK);
  u.row(36, 28, 33, '#1e3a8a');
  [[20, 20], [44, 24], [40, 46]].forEach(([x, y]) => u.p(x, y, W[0]));
  return pic;
}

/** The Frost Sprite (the Summit): a tiny ice fairy, a crystal for a body and snowflake wings. Its
    attack: it spins, then flings icicles. */
export function drawFrost(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    flap = f % 4 < 2 ? 0 : 1;
  p.poly([[16, 6], [21, 16], [16, 27], [11, 16]], ICE[0]);
  p.poly([[16, 9], [19, 16], [16, 23], [13, 16]], ICE[1]);
  p.ellipse(7, 12 - flap, 5, 3, '#bae6fd');
  p.ellipse(25, 12 - flap, 5, 3, '#bae6fd');
  const pic = finish(g, 0, bob),
    u = painter(pic, bob);
  eyes(u, 27, 28, 6, '#1e3a8a', '#ffffff');
  // sparkles circling it (faster on the spin)
  const sp = wind || hit ? 0.9 : 0.4;
  for (let i = 0; i < 3; i++) {
    const a = f * sp + (i * Math.PI * 2) / 3;
    u.p(Math.round(32 + Math.cos(a) * 22), Math.round(32 + Math.sin(a) * 14), '#ffffff');
  }
  if (hit) [[4, 26], [2, 34]].forEach(([x, y]) => u.row(y, x, x + 6, ICE[0]));
  return pic;
}

/** The Boulder (the Summit): a big round rock with snow on top and a stubborn face. Its attack: it
    leans back, then rolls. */
export function drawBoulder(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  p.ellipse(16, 17, 12, 11, STONE[2]);
  p.ellipse(15, 9, 8, 3, SNOW[0]);
  const pic = finish(g, hit ? -2 : wind ? 1 : 0, bob),
    u = painter(pic, bob);
  // cracks turning as it rolls
  for (let i = 0; i < 3; i++) {
    const a = f * 0.5 + i * 2.1;
    u.line(32 + Math.cos(a) * 8, 36 + Math.sin(a) * 8, 32 + Math.cos(a) * 18, 36 + Math.sin(a) * 16, STONE[1]);
  }
  u.line(18, 26, 26, 30, INK);
  u.line(40, 26, 32, 30, INK);
  u.r(20, 31, 4, 3, INK);
  u.r(32, 31, 4, 3, INK);
  u.row(42, 22, 34, INK);
  if (hit) [44, 50, 56].forEach((y, i) => u.row(y, 54 + i, 63, SNOW[1]));
  return pic;
}
