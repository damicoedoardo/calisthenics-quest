import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { R } from '../palette';
import { paintRows, shifted } from './pixel';

/* The Warden of the Ashes, the dungeon's mid-boss: a hulking golem in ash-grey plate, a horned
   helm with a burning visor, embers glowing through the cracks in its armor and a chain for a
   belt. It holds a great iron maul upright. Its attack: the maul swings back over its head, then
   slams down in front of it in a burst of embers. 32x32 rows, doubled. */

const ROWS = [
  '.......dd..............dd.......',
  '........dd............dd........',
  '.........dd..dddddd..dd.........',
  '..........ddcccccccbdd..........',
  '..........cccccccccbbb..........',
  '..........cccccccccbbb..........',
  '..........ciiiiiiiiiib..........',
  '..........ciiiiiiiiiib..........',
  '...cccc...cccccccccbbb...bbbb...',
  '.ccddddcc.aaaaaaaaaaaa.cbbbbbbb.',
  'ccddddccccaaaaaaaaaaaacbbbbbbbbb',
  'cccccccccccbbbbbbbbbbbbbbbbbbbba',
  '.cccccccccbbbbbbbbbbbbaaaaaaaaa.',
  '...cbbbb.ccbbbbbbbbbbbaa.aaaa...',
  '...cbbbb.ccbbbbbbbbbbbaa.aaaa...',
  '...cbebb.cbbbbbbbbbbbbaa.aeaa...',
  '...cbbbb.cbbbbbbbbbbbbaa.aaaa...',
  '...cbbbb.cbbbbbbbbbbbbaa.aaaa...',
  '...cbbbb.cbbbbbbbbbbbbaa.aaaa...',
  '..aaaaaa.iciciciciciciii.aaaaa..',
  '..aaaaaa.iiiiiiiiiiiiiii.aaaaa..',
  '..aaaaaa.cbbbbbbbbbbbbaa.aaaaa..',
  '..........cbbbb...bbbaa.........',
  '..........cbebb...bbbaa.........',
  '..........ddddd...cccbb.........',
  '..........cbbbb...bbbea.........',
  '..........cbbeb...bbbaa.........',
  '..........cbbbb...bbbaa.........',
  '.........ccccccc.bbbbbbb........',
  '.........aaaaaaa.aaaaaaa........',
  '................................',
  '................................',
];
const ASH = { a: '#27272a', b: '#3f3f46', c: '#5c5c66', d: '#8a8a96', i: '#141216' };
const EMBER = ['#9a3412', '#f97316', '#fde68a'];
const HAFT = R.wood;
const IRON = R.iron;

export function drawWarden(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g),
    // the cracks breathe: brighter, then dimmer
    hot = wind || hit || f % 4 < 2;
  paintRows(p, ROWS, { ...ASH, e: hot ? EMBER[1] : EMBER[0], f: hot ? EMBER[2] : EMBER[1] });
  // the maul: upright at its side, swung back over its head, or slammed down in front
  if (wind) {
    p.thick(5, 13, 18, 3, 2, HAFT[1]);
    p.r(17, 0, 9, 5, IRON[1]);
    p.row(0, 17, 25, IRON[2]);
  } else if (hit) {
    p.thick(4, 18, 1, 25, 2, HAFT[1]);
    p.r(0, 24, 8, 6, IRON[1]);
    p.row(24, 0, 7, IRON[2]);
  } else {
    p.thick(4, 22, 4, 9, 2, HAFT[1]);
    p.r(1, 3, 8, 6, IRON[1]);
    p.row(3, 1, 8, IRON[2]);
    p.col(1, 3, 8, IRON[2]);
  }
  const dx = hit ? -4 : wind ? 2 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, bob),
    u = painter(pic, bob);
  // eyes burning in the visor slit
  const eye = wind || hit ? EMBER[2] : EMBER[1];
  [25, 33].forEach((x) => {
    u.r(x + dx, 13, 5, 2, eye);
    u.p(x + dx + (hit ? 0 : 1), 13, '#ffffff');
  });
  // the furnace in its chest: a grate with fire behind the bars, roaring as it attacks
  const fx = 25 + dx,
    fy = 26;
  u.r(fx, fy, 14, 10, ASH.i);
  u.r(fx + 1, fy + 1, 12, 8, hot ? EMBER[1] : EMBER[0]);
  u.r(fx + 3, fy + 3, 8, 5, wind || hit ? '#ffffff' : hot ? EMBER[2] : EMBER[1]);
  for (let x = fx + 2; x < fx + 13; x += 3) u.col(x, fy + 1, fy + 8, ASH.i);
  u.row(fy + 9, fx, fx + 13, ASH.c);
  // rivets on the pauldrons, spikes on the crown
  [[6, 20], [12, 19], [52, 20], [58, 21]].forEach(([x, y]) => u.p(x + dx, y, ASH.d));
  [26, 31, 36].forEach((x) => {
    u.col(x + dx, 3, 5, ASH.d);
    u.p(x + dx, 2, ASH.c);
  });
  // iron bands on the maul's head
  if (!wind && !hit) [8, 14].forEach((y) => u.row(y + 1, 2 + dx, 17 + dx, IRON[0]));
  // embers drifting up off its shoulders
  [
    [12, 16, 0],
    [50, 18, 3],
    [30, 4, 5],
  ].forEach(([x, y, ph]) => {
    const k = (f + ph) % 8;
    if (k < 6) u.p(x + dx + (k % 2), y - k * 2, k < 3 ? EMBER[2] : EMBER[1]);
  });
  // the slam: embers and ash bursting off the floor, cracks running from the impact
  if (hit) {
    const v = painter(pic);
    [[2, 46, 2], [10, 42, 1], [16, 47, 2], [6, 40, 1], [20, 44, 1]].forEach(([x, y, s], i) => v.r(x, y, s, s, EMBER[i % 3]));
    v.line(4, 61, 0, 63, EMBER[0]);
    v.line(12, 61, 18, 63, EMBER[0]);
  }
  return pic;
}
