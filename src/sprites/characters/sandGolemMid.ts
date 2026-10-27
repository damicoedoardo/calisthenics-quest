import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Sand Golem, the Plateau's mid-boss: a hunched brute of packed sand, its block of a head
   thrust forward under a great humped back, its near arm hanging to the ground on a fist the size
   of its head. While it walks it is warm sand, trickling off its fists, eyes glowing, stepping
   from foot to foot. When it stops it sets into grey stone: cracked, cold, eyes shut, perfectly
   still. Its attack: the near arm
   draws back, then slams down in front of it in a burst of sand or grit.
   32x32 rows, doubled. Upper-case letters are the near arm, which moves on its own. */

const ROWS = [
  '................................',
  '................................',
  '................ccccc...........',
  '.............cccbbbbbcc.........',
  '...........ccbbbbbbbbbbc........',
  '.....ccccccbbbbbbbbbbbbbc.......',
  '....cbbbbbbcbbbbbbbbbbbbbc......',
  '...cbbbbbbbbabbbbbbbbbbbbbc.....',
  '...cbbbbbbbbabbbbbbbbbbbbbba....',
  '...cbbbbbbbbabbbbbbbbbbbbbba....',
  '...cbbbbbbbaabbbbbbbbbbbbbbba...',
  '...abbbbbbbacbbbbbbbbbbbbbbba...',
  '...Caaaaaaaacbbbbbbbbbbbbbbbba..',
  '...CBBA..cbbbbbbbbbbbbbbbbbbba..',
  '..CBBBBA.cbbbbbbbbbbbbbbbbbba...',
  '..CBBBBA.cbbbbbbbbbbbbbbbbbba...',
  '..CBBBBA.cbbbbbbbbbbbbbbba.cba..',
  '..CBBBA..abbbbbbbbbbbbbbba.cbba.',
  '..CBBBA...abbbbbbbbbbbbba..cbba.',
  '..CBBBBA...aabbbbbbbbbaa...cbba.',
  '.CBBBBBBA..................cbbba',
  '.CBBBBBBBA.................abbba',
  '.ABBBBBBBA..................aaa.',
  '..AAAAAAA.......................',
];
/* A leg, drawn twice: the golem steps from one to the other as it walks. */
const LEG = [
  'cbbba.',
  'cbbba.',
  'cbbba.',
  'cbbbba',
  'aaaaaa',
];
const SAND = { a: '#9a6f3c', b: '#d9b07a', c: '#f2d6a2' };
const STONE = { a: '#3f3c3a', b: '#78716c', c: '#a8a29e' };
const GRAIN = ['#b8894f', '#f2d6a2'];
const CRACK = '#1c1917';
const EYE = ['#b45309', '#f59e0b', '#fff3c4'];

const arm = (s: Record<string, string>) => ({ A: s.a, B: s.b, C: s.c });

export function drawSandGolemMid(stone: boolean) {
  return (_o: unknown, frame: ClipFrame, f: number): Grid => {
    const wind = frame.right === 'up',
      hit = frame.fx === 'impact',
      // stone doesn't breathe
      bob = stone ? 0 : (frame.bob ?? 0),
      pal = stone ? STONE : SAND,
      g = grid(32),
      p = painter(g);
    // Walking, one foot lifts and then the other; stone stands square.
    const step = stone || wind || hit ? 0 : f % 4 < 2 ? 1 : 2;
    paintRows(p, LEG, pal, 18, 23 - (step === 2 ? 1 : 0));
    paintRows(p, LEG, pal, 12, 23 - (step === 1 ? 1 : 0));
    paintRows(p, ROWS, pal, 0, 3);
    // The near arm: hanging, drawn back, or slammed down in front.
    const [ax, ay] = wind ? [3, -2] : hit ? [-2, 1] : [0, 0];
    paintRows(p, ROWS, arm(pal), ax, 3 + ay);

    const dx = hit ? -2 : wind ? 1 : 0,
      pic = shifted(outline(autoshade(scale2x(g))), dx, bob),
      u = painter(pic, bob);

    // Its face: a heavy brow over two eyes, a slab of a jaw.
    u.row(18, 7 + dx, 21 + dx, pal.a);
    if (stone) {
      u.row(21, 8 + dx, 11 + dx, CRACK);
      u.row(21, 15 + dx, 18 + dx, CRACK);
    } else {
      const e = wind || hit ? EYE[2] : EYE[1];
      u.r(8 + dx, 20, 4, 2, e);
      u.r(15 + dx, 20, 4, 2, e);
      if (!(wind || hit)) {
        u.p(8 + dx, 20, EYE[2]);
        u.p(15 + dx, 20, EYE[2]);
      }
    }
    u.row(26, 9 + dx, 20 + dx, pal.a);
    [10, 13, 16, 19].forEach((x) => u.p(x + dx, 25, pal.a));

    if (stone) {
      // Cracks running through the hump, the head and the arm.
      const v = u;
      v.line(30 + dx, 12, 34 + dx, 19, CRACK);
      v.line(34 + dx, 19, 32 + dx, 25, CRACK);
      v.line(44 + dx, 16, 41 + dx, 24, CRACK);
      v.line(41 + dx, 24, 45 + dx, 30, CRACK);
      v.line(16 + dx, 13, 19 + dx, 17, CRACK);
      v.line(8 + dx + ax * 2, 32 + ay * 2, 10 + dx + ax * 2, 38 + ay * 2, CRACK);
      v.line(36 + dx, 30, 30 + dx, 34, CRACK);
      // flecks of lighter stone
      [[24, 14], [38, 22], [50, 26], [28, 32], [6 + ax * 2, 44 + ay * 2]].forEach(([x, y]) => v.p(x + dx, y, STONE.c));
    } else {
      // Wind ripples across its hump, like a dune's.
      [
        [14, 30, 46],
        [21, 28, 52],
        [28, 30, 54],
        [35, 34, 52],
      ].forEach(([y, x0, x1]) => {
        for (let x = x0; x <= x1; x++) if ((x + y) % 7 !== 0) u.p(x + dx, y + Math.round(Math.sin((x + y) / 4) * 1.5), GRAIN[0]);
      });
      // Sand grains in its skin, and sand trickling off its fists and its back.
      [[24, 14], [30, 22], [38, 18], [46, 24], [26, 30], [36, 34], [50, 32], [6 + ax * 2, 36 + ay * 2], [10 + ax * 2, 44 + ay * 2]].forEach(([x, y], i) =>
        u.p(x + dx, y, GRAIN[i % 2]),
      );
      [
        [58, 52, 0],
        [6 + ax * 2, 54 + ay * 2, 3],
        [16 + ax * 2, 54 + ay * 2, 5],
        [52, 24, 2],
      ].forEach(([x, y, ph]) => {
        const k = (f + ph) % 6;
        u.p(x + dx, y + k * 2, GRAIN[k % 2]);
        if (k < 3) u.p(x + dx, y + k * 2 + 1, GRAIN[0]);
      });
    }

    // The slam: a burst of sand, or of grit off the stone.
    if (hit) {
      const v = painter(pic),
        c = stone ? [STONE.c, STONE.b, STONE.a] : [SAND.c, SAND.b, GRAIN[0]];
      [[0, 50, 2], [4, 44, 2], [14, 46, 1], [20, 52, 2], [2, 56, 1], [18, 58, 1], [10, 41, 1]].forEach(([x, y, s], i) => v.r(x, y, s, s, c[i % 3]));
    }
    return pic;
  };
}
