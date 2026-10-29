import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid, type Painter } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Ash Golem, the big one at the end of each floor: a hunched brute of cinder rock, its small
   head sunk between boulder shoulders, two ember eyes, and fire showing through the cracks in its
   chest. Huge fists hang to the floor. Its attack: both fists go up over its head, then slam down
   in front of it, and the floor cracks. 32x32 rows, doubled; the arms are drawn by pose. */

const ROWS = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '..............dccd..............',
  '.............cbbbbc.............',
  '............cbbbbbba............',
  '............cbbbbbba............',
  '.......dcccccbbbbbbacccccd......',
  '.....dcbbbbbbbbbbbbbbbbbbbba....',
  '....cbbbbbbbbbbbbbbbbbbbbbbba...',
  '....cbbbbbbbbbbbbbbbbbbbbbbba...',
  '....cbbbbbbbbbbbbbbbbbbbbbbba...',
  '.....abbbbbbbbbbbbbbbbbbbbba....',
  '......cbbbbebbbbbbbbbbbbba......',
  '......cbbbbbeebbbbbbebbbba......',
  '......cbbbbbbbebbbbebbbbba......',
  '......cbbbbbbbbebbebbbbbba......',
  '.......cbbbbbbbbeebbbbbba.......',
  '.......cbbbbbbbbebbbbbbba.......',
  '........abbbbbbbbbbbbbaa........',
  '.........aaabbbbbbbbaa..........',
  '.........cbbba..cbbba...........',
  '.........cbbba..cbbba...........',
  '........cbbbba..cbbbba..........',
  '........cbbbba..cbbbba..........',
  '.......cbbbbba..cbbbbba.........',
  '.......aaaaaaa..aaaaaaa.........',
  '................................',
  '................................',
  '................................',
];
const ROCK = { a: '#292524', b: '#57534e', c: '#78716c', d: '#a8a29e' };
const EMBER = ['#9a3412', '#ea580c', '#fdba74'];
const ASH = '#d6d3d1';

/** An arm from the shoulder to the fist, then the fist itself. */
function arm(p: Painter, sx: number, sy: number, ex: number, ey: number, fx: number, fy: number) {
  p.thick(sx, sy, ex, ey, 3, ROCK.b);
  p.thick(ex, ey, fx, fy, 3, ROCK.b);
  p.ellipse(fx, fy, 3.5, 3, ROCK.c);
  p.ellipse(fx, fy + 1, 3, 2, ROCK.b);
}

export function drawAshGolem(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    hot = wind || hit || f % 4 < 2;
  // the arms behind the body: hanging, raised over the head, or slammed down in front
  if (wind) {
    arm(p, 6, 11, 4, 6, 9, 2);
    arm(p, 25, 11, 27, 6, 22, 2);
  } else if (!hit) {
    arm(p, 6, 12, 3, 17, 4, 23);
    arm(p, 25, 12, 28, 17, 27, 23);
  }
  paintRows(p, ROWS, { ...ROCK, e: hot ? EMBER[1] : EMBER[0] });
  // slammed down, the fists come in front of it
  if (hit) {
    arm(p, 6, 12, 5, 19, 10, 27);
    arm(p, 25, 12, 26, 19, 21, 27);
  }
  const pic = shifted(outline(autoshade(scale2x(g))), 0, bob + (hit ? 2 : 0)),
    u = painter(pic, bob + (hit ? 2 : 0));
  // ember eyes under a heavy brow
  const eye = wind || hit ? EMBER[2] : EMBER[1];
  u.row(15, 26, 37, ROCK.a);
  [27, 33].forEach((x) => {
    u.r(x, 17, 4, 2, eye);
    u.p(x + 1, 17, '#ffffff');
  });
  // the cracks glow brighter in their middle
  [[24, 32], [27, 35], [40, 33], [33, 39], [34, 41]].forEach(([x, y]) => u.p(x, y, hot ? EMBER[2] : EMBER[1]));
  // the fire in its chest, where the cracks meet
  u.ellipse(32, 41, 2.5, 2, hot ? EMBER[2] : EMBER[1]);
  u.p(32, 41, wind || hit ? '#ffffff' : EMBER[2]);
  // seams between the stones of its shoulders and belly
  u.line(14, 22, 18, 28, ROCK.a);
  u.line(50, 22, 46, 28, ROCK.a);
  u.line(20, 46, 26, 48, ROCK.a);
  u.line(44, 46, 38, 48, ROCK.a);
  // ash lying on the shoulders and the crown
  [[11, 20], [12, 20], [16, 19], [17, 19], [44, 19], [45, 19], [49, 20], [50, 20], [30, 10], [31, 10], [34, 11]].forEach(([x, y]) => u.p(x, y, ASH));
  // embers drifting up off its back
  [
    [14, 18, 0],
    [48, 17, 3],
    [32, 8, 5],
  ].forEach(([x, y, ph]) => {
    const k = (f + ph) % 8;
    if (k < 6) u.p(x + (k % 2), y - k * 2, k < 3 ? EMBER[2] : EMBER[1]);
  });
  // the slam: cracks running out from both fists, embers kicked up
  if (hit) {
    const v = painter(pic);
    v.line(18, 60, 12, 63, EMBER[1]);
    v.line(22, 60, 26, 63, EMBER[0]);
    v.line(42, 60, 38, 63, EMBER[0]);
    v.line(44, 60, 50, 63, EMBER[1]);
    [[14, 50, 2], [24, 48, 1], [40, 49, 2], [50, 47, 1], [32, 52, 1]].forEach(([x, y, s], i) => v.r(x, y, s, s, EMBER[(i % 2) + 1]));
  }
  return pic;
}
