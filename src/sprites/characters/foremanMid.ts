import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Foreman, the Cold Forges' mid-boss: a squat bronze overseer built like a boiler, its little
   helmeted head sunk between huge shoulders, one lamp-eye in its visor and a smoking stack on its
   back. It wears a leather work apron and carries a riveting hammer; from the fingers of its other
   hand run green threads, out to the crew it keeps mending. Its attack: the hammer goes up over
   its head, then comes down in front of it in a spray of sparks while the threads snap taut.
   32x32 rows, doubled. */

const ROWS = [
  '................................',
  '.......................kk.......',
  '..........iiiii.......kiik......',
  '.........iiiiiii......kiik......',
  '........iiiiiiiii.....kiik......',
  '.......ccccccccccc...kbbbbk.....',
  '........kkkkkkkkk.....abba......',
  '........abbbbbbba.....abba......',
  '..cccc...abbbbba.......cccccc...',
  '.cbbbbc..aaaaaaa......cbbbbbbc..',
  '.cbbbbbc.cbbbbbbbbbbbcbbbbbbbba.',
  '.abbbbba.cbbbbbbbbbbbbabbbbbbba.',
  '..aaaaa.cbbbbbbbbbbbbbba.aaaaa..',
  '..cbbba.cbbbbbbbbbbbbbba.abbba..',
  '..cbbba.cbbllllllllllbba.abbba..',
  '..cbba.cbblllllllllllbbba.abba..',
  '..cbba.cbblllmmmmmlllbbba.abba..',
  '..cbba.cbblllmmmmmlllbbba.abba..',
  '.ccccc.cbbllllllllllllbba.ccccc.',
  '.cbbbba.cbllllllllllllba.abbbbba',
  '.abbbba.kkkkkkkkkkkkkkkk.abbbbba',
  '..aaaa..kkkkekkkkkkekkkk..aaaa..',
  '........abllllllllllllba........',
  '.........abllllllllllba.........',
  '..........abbb....bbba..........',
  '..........abbb....bbba..........',
  '.........kabbb....bbbak.........',
  '........kkkkkk....kkkkkk........',
  '................................',
  '................................',
  '................................',
  '................................',
];
const BRONZE = { a: '#5a3a1e', b: '#a0662f', c: '#d6a36b' };
const APRON = { l: '#4a3426', m: '#6b4a33' };
const IRON = { k: '#1c1917', i: '#57534e', e: '#fde68a' };
const HAFT = '#3b2414';
const HEAD = ['#3f3f46', '#71717a', '#a1a1aa'];
const LAMP = ['#b45309', '#fbbf24', '#fef3c7'];
const THREAD = ['#15803d', '#86efac'];
const SPARK = ['#f97316', '#fde68a', '#ffffff'];
const SMOKE = ['#57534e', '#78716c'];

export function drawForemanMid(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  paintRows(p, ROWS, { ...BRONZE, ...APRON, ...IRON });
  // The riveting hammer in its left fist: held upright, raised over its head, or slammed down.
  if (wind) {
    p.thick(3, 18, 5, 3, 2, HAFT);
    p.r(0, 0, 9, 4, HEAD[1]);
    p.row(0, 0, 8, HEAD[2]);
  } else if (hit) {
    p.thick(4, 19, 0, 26, 2, HAFT);
    p.r(0, 24, 6, 5, HEAD[1]);
    p.row(24, 0, 5, HEAD[2]);
  } else {
    p.thick(3, 22, 3, 8, 2, HAFT);
    p.r(0, 4, 7, 5, HEAD[1]);
    p.row(4, 0, 6, HEAD[2]);
    p.col(0, 4, 8, HEAD[2]);
  }
  const dx = hit ? -3 : wind ? 1 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, bob),
    u = painter(pic, bob);

  // The lamp-eye in its visor, looking left; it flares as it swings.
  const ex = 18 + dx,
    hot = wind || hit;
  u.r(ex, 12, 5, 3, LAMP[0]);
  u.r(ex + 1, 12, 3, 2, hot ? LAMP[2] : LAMP[1]);
  if (hot) u.p(ex, 13, '#ffffff');
  // A grille for a mouth under the visor.
  [20, 23, 26, 29].forEach((x) => u.col(x + dx, 15, 16, BRONZE.a));
  // Rivets round the boiler chest, a pocket of tools in the apron.
  [[20, 22], [28, 22], [36, 22], [44, 22], [4, 20], [56, 20]].forEach(([x, y]) => u.p(x + dx, y, BRONZE.c));
  u.r(29 + dx, 31, 9, 1, APRON.l);
  u.col(31 + dx, 28, 30, HEAD[2]);
  u.col(34 + dx, 27, 30, '#a16207');
  // Spools of thread on its belt.
  [32, 46].forEach((x) => {
    u.r(x + dx, 41, 4, 3, THREAD[0]);
    u.row(41, x + dx, x + 3 + dx, THREAD[1]);
  });
  // Smoke from its stack.
  const k = f % 8;
  u.r(46 + dx, 3 - (k >> 1), 3, 2, SMOKE[k % 2]);
  if (k < 5) u.r(49 + dx, 0 + ((k + 3) % 4), 2, 2, SMOKE[0]);

  // The threads off its right fingers, out to its crew: they sway, and snap taut on the strike.
  const tx = 58 + dx,
    ty = 42;
  for (let t = 0; t < 3; t++) {
    let x = tx - t * 2,
      y = ty + 1;
    for (let i = 0; i < 22 - t * 4; i++) {
      const wave = hit ? 0 : Math.round(Math.sin((i + f * 2 + t * 3) / 3) * (t + 1) * 0.6);
      u.p(x + wave, y, i % 5 === 0 ? THREAD[1] : THREAD[0]);
      y += 1;
      if (i % 3 === 1) x += t === 0 ? 1 : t === 1 ? 0 : -1;
    }
  }
  if (hit) [[59, 41], [55, 43], [62, 50]].forEach(([x, y]) => u.p(x + dx, y, THREAD[1]));

  // The strike: sparks off the floor in front of it.
  if (hit) {
    const v = painter(pic);
    [[2, 46, 2], [12, 44, 1], [16, 50, 2], [6, 40, 1], [20, 47, 1], [1, 53, 1]].forEach(([x, y, s], i) => v.r(x, y, s, s, SPARK[i % 3]));
    v.line(2, 61, 0, 63, SPARK[0]);
    v.line(10, 61, 15, 63, SPARK[0]);
  }
  return pic;
}
