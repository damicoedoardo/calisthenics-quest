import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';

/* The Quiet Miles, the Ember Road's second world: its own monster, its mid-boss and its boss.
   - The Unsent: a letter that was never sent, folded, its wax seal unbroken, drifting after you.
   - The Silent Bell: an old bronze bell hung in a crooked wooden frame, nobody to ring it.
   - The Distance: a tall shape made of fog, arms too long, a lantern glass where its face should
     be, and nothing lit inside it. "It wears a lot of faces." */

const PAPER = ['#8f8a7a', '#c9c2ad', '#ece6d2', '#fffdf5'];
const WAX = ['#7f1d1d', '#b91c1c', '#ef4444'];
const INK = '#1e1b2e';
const LAMP = ['#b45309', '#f59e0b', '#fde68a', '#fffbeb'];

/* The Unsent. It flutters as it drifts, folded corners lifting. Its attack: it opens a crack and
   the words fly out. */
export function drawUnsent(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    hit = frame.fx === 'impact',
    wind = frame.right === 'up',
    bob = frame.bob ?? 0,
    flap = [0, 1, 2, 1][f % 4],
    cx = 32,
    cy = 34 + bob;
  // the envelope, a little tilted, its flap open a crack on the attack
  p.poly([[cx - 17, cy - 10 + flap], [cx + 17, cy - 12], [cx + 18, cy + 11], [cx - 16, cy + 12 - flap]], PAPER[2]);
  if (hit || wind) p.poly([[cx - 17, cy - 10], [cx + 17, cy - 12], [cx, cy - 22]], PAPER[1]);
  const out = outline(autoshade(g)),
    u = painter(out);
  // the fold lines meeting in the middle
  u.line(cx - 16, cy - 9 + flap, cx, cy + 2, PAPER[0]);
  u.line(cx + 16, cy - 11, cx, cy + 2, PAPER[0]);
  u.line(cx - 15, cy + 11 - flap, cx - 4, cy + 3, PAPER[1]);
  u.line(cx + 17, cy + 10, cx + 4, cy + 3, PAPER[1]);
  // the wax seal, never broken
  u.ellipse(cx, cy + 2, 3, 2.5, WAX[1]);
  u.p(cx - 1, cy + 1, WAX[2]);
  u.p(cx + 1, cy + 3, WAX[0]);
  // two sad eyes, looking up, and a small mouth
  const ey = cy - 4;
  u.r(cx - 9, ey, 2, 3, INK);
  u.r(cx + 7, ey, 2, 3, INK);
  u.p(cx - 9, ey, PAPER[3]);
  u.p(cx + 7, ey, PAPER[3]);
  u.line(cx - 11, ey - 2, cx - 8, ey - 3, INK);
  u.line(cx + 10, ey - 2, cx + 7, ey - 3, INK);
  // the address it never reached, a few scrawled lines
  u.row(cy + 7, cx + 6, cx + 12, INK);
  u.row(cy + 9, cx + 5, cx + 10, PAPER[0]);
  // words flying out on the attack; a faint trail of fog behind it otherwise
  if (hit)
    for (let i = 0; i < 6; i++) {
      const k = (f + i * 2) % 5;
      u.r(cx - 8 + i * 3, cy - 18 - k * 2 - (i % 2) * 2, 2, 1, INK);
    }
  else for (let i = 0; i < 3; i++) u.p(cx - 20 - i * 2, cy + 6 + ((f + i) % 3), '#55609a');
  return out;
}

const BRONZE = ['#4a2f12', '#7c5320', '#b07c32', '#e0b45c', '#fbe3a0'];
const BEAM = ['#2a1a10', '#4a3020', '#6b4a30'];
const VERD = '#5f9a86';

/* The Silent Bell. It hangs still, swaying a little. Its attack: it swings and tolls, its mouth
   opening wide, rings of sound pulsing off the rim. */
export function drawBellMid(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    hit = frame.fx === 'impact',
    wind = frame.right === 'up',
    bob = frame.bob ?? 0,
    swing = hit ? 4 : wind ? -3 : [0, 1, 0, -1][f % 4],
    cx = 32 + swing,
    top = 14 + bob;
  // the crooked wooden frame it hangs in, and the beam across
  p.thick(10, 62, 13, 8, 3, BEAM[1]);
  p.thick(54, 62, 51, 8, 3, BEAM[1]);
  p.r(8, 6, 48, 4, BEAM[2]);
  // the bell: a crown, a flared body, a thick lip
  p.r(cx - 4, top - 4, 8, 5, BRONZE[2]);
  p.poly([[cx - 10, top], [cx + 10, top], [cx + 13, top + 18], [cx + 18, top + 30], [cx - 18, top + 30], [cx - 13, top + 18]], BRONZE[2]);
  p.r(cx - 19, top + 29, 38, 4, BRONZE[3]);
  const out = outline(autoshade(g)),
    u = painter(out);
  // the rope it hangs from, the wood grain, green age on the bronze
  u.col(32, 10, top - 5, '#a8854e');
  u.row(7, 12, 52, BEAM[0]);
  [[cx - 9, top + 6], [cx + 7, top + 11], [cx - 13, top + 24], [cx + 12, top + 26]].forEach(([x, y], i) => {
    u.r(x, y, 2 + (i % 2), 2, VERD);
  });
  u.row(top + 20, cx - 14, cx + 14, BRONZE[1]);
  u.row(top + 31, cx - 17, cx + 17, BRONZE[4]);
  // a long face on the bronze: closed, sad eyes, and a mouth that opens to toll
  const ey = top + 12;
  u.line(cx - 8, ey, cx - 4, ey + 1, BRONZE[0]);
  u.line(cx + 4, ey + 1, cx + 8, ey, BRONZE[0]);
  if (hit) {
    u.ellipse(cx, ey + 8, 3, 3, BRONZE[0]);
    u.p(cx, ey + 9, '#000000');
  } else u.row(ey + 8, cx - 2, cx + 2, BRONZE[0]);
  // the clapper under the lip, swinging the other way
  u.ellipse(cx - swing * 0.8, top + 36, 3, 3, BRONZE[1]);
  // rings of sound off the rim when it tolls
  if (hit)
    for (let i = 0; i < 3; i++) {
      const r = 21 + i * 3 + (f % 2);
      u.p(cx - r, top + 30 - i * 3, BRONZE[4]);
      u.p(cx + r, top + 30 - i * 3, BRONZE[4]);
      u.p(cx - r + 1, top + 26 - i * 4, BRONZE[3]);
      u.p(cx + r - 1, top + 26 - i * 4, BRONZE[3]);
    }
  return out;
}

const MIST = ['#20264a', '#343d6e', '#55609a', '#8f98c8', '#c8ceea'];
const GLASS = ['#2b2f45', '#6b7392', '#b9c0dc'];

/* The Distance. It stands tall and thin, swaying like fog in a draught, its lantern-glass face
   empty. Its attack: the long arms reach out toward you, and a cold light flickers in the glass. */
export function drawDistanceBoss(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g),
    hit = frame.fx === 'impact',
    wind = frame.right === 'up',
    bob = frame.bob ?? 0,
    sway = wind || hit ? 0 : [0, 1, 1, 0, -1, -1][f % 6],
    cx = 32 + sway,
    top = 6 + bob;
  // the body: a tall drape of fog, wider at the bottom, ragged hem
  p.poly([[cx - 7, top + 14], [cx + 7, top + 14], [cx + 14, top + 40], [cx + 18, 60], [cx - 18, 60], [cx - 14, top + 40]], MIST[2]);
  // the long arms: hanging nearly to the ground, or reaching out
  if (hit || wind) {
    p.thick(cx - 8, top + 18, cx - 28, top + 24, 3, MIST[2]);
    p.thick(cx + 8, top + 18, cx + 28, top + 24, 3, MIST[2]);
  } else {
    p.thick(cx - 9, top + 18, cx - 22, top + 46, 3, MIST[3]);
    p.thick(cx + 9, top + 18, cx + 22, top + 46, 3, MIST[3]);
  }
  // its head: a lantern's glass, an iron cap and ring on top
  p.r(cx - 6, top + 2, 12, 12, GLASS[1]);
  p.r(cx - 7, top, 14, 3, '#3f3f46');
  const out = outline(autoshade(g)),
    u = painter(out);
  u.col(cx, top - 4, top - 1, '#52525b');
  u.p(cx - 1, top - 5, '#52525b');
  u.p(cx + 1, top - 5, '#52525b');
  // the glass panes, empty; a cold flicker inside on the attack
  u.col(cx, top + 3, top + 13, '#3f3f46');
  u.r(cx - 5, top + 4, 4, 8, GLASS[0]);
  u.r(cx + 1, top + 4, 4, 8, GLASS[0]);
  if (hit || wind) {
    const c = f % 2 ? '#c7d2fe' : '#e0e7ff';
    u.r(cx - 3, top + 7, 2, 3, c);
    u.r(cx + 2, top + 7, 2, 3, c);
  } else {
    u.p(cx - 4, top + 5, GLASS[2]);
    u.p(cx + 2, top + 5, GLASS[2]);
  }
  // fingers, long and thin, at the ends of the arms
  const hands: [number, number][] = hit || wind ? [[cx - 29, top + 24], [cx + 28, top + 24]] : [[cx - 22, top + 47], [cx + 21, top + 47]];
  for (const [hx, hy] of hands) for (let i = -1; i <= 1; i++) u.line(hx + i, hy, hx + i * 2, hy + 3, MIST[3]);
  // the fog it is made of, curling off its edges and its hem
  for (let i = 0; i < 6; i++) {
    const k = (f + i * 3) % 6,
      side = i % 2 ? 1 : -1;
    u.p(cx + side * (12 + i + (k % 3)), top + 28 + i * 4 - k, MIST[4]);
  }
  for (let x = cx - 17; x <= cx + 17; x += 3) u.p(x + ((f + x) % 2), 60 + ((x + f) % 3 ? 0 : 1), MIST[3]);
  // the lantern glow it doesn't have: a faint ring where the light should be
  u.p(cx - 8, top + 8, LAMP[0]);
  u.p(cx + 7, top + 8, LAMP[0]);
  return out;
}

