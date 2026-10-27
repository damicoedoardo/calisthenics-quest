import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { R } from '../palette';
import { paintRows, shifted } from './pixel';

/* The Summit as the dungeon's boss: the mountain's spirit. A snow-capped peak rising out of a
   cloud, with a calm face in the rock and a gold flag on top, and the wind always moving around it
   in long ribbons. Not angry: it's the last climb. Its attack: it draws a breath (the ribbons pull
   in), then a gust of wind blows out to the left. 32x32 rows, doubled. */

const ROWS = [
  '................................',
  '................................',
  '...............ww...............',
  '..............wwwv..............',
  '..............wwwv..............',
  '.............wwwwvv.............',
  '.............wwwwvv.............',
  '............wwwwwvvv............',
  '...........wwwwwwvvav.vv........',
  '...........bwwbbwvaaavvvv.......',
  '...........bbbbbbbaaavvvv.......',
  '..........bbbbbbbbaaaavaav......',
  '.........bbbbbbbbbaaaaaaaa......',
  '.........bbbbbbbbbaaaaaaaaa.....',
  '........bbbbbbbbbbaaaaaaaaa.....',
  '........bbbbbbbbbbbaaaaaaaaa....',
  '.......bbbbbbbbbbbbaaaaaaaaa....',
  '.......bbbbbbbbbbbbaaaaaaaaaa...',
  '......bbbbbbbbbbbbbaaaaaaaaaa...',
  '.....bbbbbbbbbbbbbbaaaaaaaaaaa..',
  '.....bbbbbbbbbbbbbbaaaaaaaa.....',
  '....bkkkkkbbbbbbbbbbaakkkkka....',
  '....kkkkkkkkkkkkkkkkkkkkkkkk....',
  '....kkkkkkkkkkkkkkkkkkkkkkkkk...',
  '....kkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '..KKKKKKKKKKKKKKKKKKKKKKKKK.K...',
  '...........KKKKKKKKKKKKKK.......',
  '.............KKKKK..KKKKK.......',
  '..............KKK.....K.........',
  '................................',
];
const PAL = { a: '#334155', b: '#475569', w: '#f1f5f9', v: '#cbd5e1', k: '#e2e8f0', K: '#94a3b8' };
const WIND = ['#bae6fd', '#e0f2fe', '#ffffff'];
const FACE = '#1e293b';

export function drawSummitSpirit(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    k = f % 8,
    g = grid(32),
    p = painter(g);
  paintRows(p, ROWS, PAL);
  // the flag on the top, waving
  p.col(16, 0, 2, R.wood[1]);
  const wave = [0, 1, 0, -1][f % 4];
  p.poly([[17, 0], [21, 0 + (wave > 0 ? 1 : 0)], [20, 1], [21, 2 + (wave < 0 ? 0 : 1)], [17, 2]], R.gold[1]);
  const bob = frame.bob ?? 0,
    pic = shifted(outline(autoshade(scale2x(g))), hit ? -3 : 0, bob),
    u = painter(pic, bob),
    dx = hit ? -3 : 0;
  // a calm face in the rock: eyes shut, a small mouth; open and round on the gust
  if (hit) {
    u.r(23 + dx, 30, 3, 3, FACE);
    u.r(33 + dx, 30, 3, 3, FACE);
    u.ellipse(28 + dx, 38, 2.5, 2.5, FACE);
  } else {
    u.line(22 + dx, 31, 25 + dx, 32, FACE);
    u.line(33 + dx, 32, 36 + dx, 31, FACE);
    if (wind) u.r(27 + dx, 37, 3, 2, FACE);
    else u.row(37, 27 + dx, 30 + dx, FACE);
  }
  // the wind: ribbons curling around it, pulled in close on the breath
  const reach = wind ? 0.6 : 1;
  for (let r = 0; r < 3; r++) {
    const y0 = 18 + r * 14,
      ph = f * 0.8 + r * 2;
    for (let i = 0; i < 26; i++) {
      const t = i / 25,
        x = 32 + (t - 0.5) * 62 * reach,
        y = y0 + Math.sin(t * Math.PI * 2 + ph) * 4;
      // each ribbon is drawn only partway, so it reads as moving
      if ((i + k * 3 + r * 5) % 26 < 14) u.r(x + dx, y, 3, 1, WIND[(i + r) % 3]);
    }
  }
  // the gust: long streaks blowing out to the left
  if (hit) {
    const v = painter(pic);
    [20, 28, 36, 44].forEach((y, i) => {
      v.row(y, 0, 14 - i * 2, WIND[1]);
      v.row(y + 1, 2, 10 - i * 2, WIND[0]);
    });
  }
  return pic;
}
