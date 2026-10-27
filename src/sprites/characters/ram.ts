import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, stamp, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Ram, a dungeon monster: a stocky amber ram with a curled ivory horn and its head held low.
   It snorts steam as it waits; its attack is the charge: it rears back, its eye goes red, then it
   slams forward in a cloud of dust. Drawn as 32x32 text rows, doubled with Scale2x. */

const ROWS = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '..................c.cc.cc.......',
  '.........jjjjj...cbbcbbcbbc.....',
  '.......jjhhhhhhh.bbbbbbccbbbb...',
  '......jhhjhhjhhhHbccbbcbbabbbb..',
  '......jhHxxxxjhhHHbbabbaabbccbb.',
  '.....jhHxxhHxxjhHbaabbbbbbcbbab.',
  '.....jhHxhHHHxjhHbbbccbbbbbaabbb',
  '.....jhHxxHHxxjhHbbcbbabbccbbbbb',
  '....ffjhHxxxxjhhHbbbaabbcbbabccb',
  '...fFFfjhhjhhhhHbccbbbbbbaabcbba',
  '..fffffwjhhjhhHHcbbabbccbbbbbaab',
  '..ffoffffjjHHHfbbaabbcbbabbccbbb',
  '.fFFFffffffffffbbbbccbaabbcbbabb',
  '.gfffffffffffffbbbcbbabbccbaabbb',
  'gNffffffffffffaaaaaaaaaaaaaaaaa.',
  'ngfffffffffffeeaaaaaaaaaaaaaaaa.',
  'gggfffffffffeeddaaaaaaaaaaaaaaa.',
  '.ggggfffeeee..dddda.aaddddaddd..',
  '..gm.gee......dddd.....dddd.ddd.',
  '..............ddd.......ddd..dd.',
  '..............ddd.......ddd..dd.',
  '.............kkkk......kkkk.kkk.',
  '.............kkkk......kkkk.kkk.',
  '................................',
  '................................',
  '................................',
  '................................',
];
const PAL: Record<string, string> = {
  // wool, dark to light
  a: '#7a3f12',
  b: '#b8651e',
  c: '#e89a48',
  // face, muzzle, nostril and mouth
  f: '#3a2c2a',
  e: '#241a18',
  g: '#6e5644',
  // light on the brow and the bridge of the snout, a wet glint over the nostril
  F: '#54403a',
  N: '#a68c72',
  n: '#1a1214',
  m: '#1a1214',
  // where the eye and its brow go (drawn over at 64x64)
  w: '#3a2c2a',
  o: '#3a2c2a',
  // horn: ivory, its ridges, and the deep shade inside the curl
  x: '#2a2018',
  h: '#e8dcc0',
  H: '#a89878',
  j: '#fff8e6',
  // legs and hooves
  d: '#4a3020',
  k: '#2a2630',
};
const EYE = ['#b45309', '#f59e0b', '#fde68a'];
const RAGE = ['#7f1d1d', '#ef4444', '#fecaca'];
const STEAM = ['#cbd5e1', '#f1f5f9'];
const DUST = ['#78716c', '#a8a29e'];
/** Rows from here down are the legs, which stay planted while the body breathes. */
const LEGS = 46;

export function drawRam(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(32);
  paintRows(painter(g), ROWS, PAL);
  const art = outline(autoshade(scale2x(g))),
    wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0;
  // the body breathes over planted legs
  const top = art.map((row, y) => (y < LEGS ? row : row.map(() => null))),
    out = art.map((row, y) => (y >= LEGS ? row : row.map(() => null)));
  stamp(out, shifted(top, 0, bob + (wind ? 2 : 0)));
  // the charge: rear back, then the whole ram lunges left
  const dx = hit ? -8 : wind ? 3 : 0,
    pic = shifted(out, dx, 0),
    u = painter(pic, bob + (wind ? 2 : 0)),
    ex = 8 + dx,
    ey = 31;
  // the eye under a heavy brow: amber, red as it winds up, white-hot on the hit
  const E = wind ? RAGE : hit ? [EYE[1], EYE[2], '#ffffff'] : EYE;
  u.row(ey - 1, ex - 1, ex + 3, '#120c0c');
  u.r(ex, ey, 3, 2, E[1]);
  u.p(ex + 2, ey, E[2]);
  u.p(ex, ey + 1, E[0]);
  // steam from the nostril: a slow snort when idle, hard bursts as it winds up
  // the nostril sits at the snout's tip (x 0, y 40)
  const n = dx,
    k = f % 8;
  if (wind)
    [[-1, 0], [-4, -2], [-6, 1], [-3, 3]].forEach(([x, y], i) => u.r(n + x, 40 + y, 2, 2, STEAM[i % 2]));
  else if (!hit && k >= 5) {
    const s = k - 5;
    u.r(n - s, 39 - s, 2, 2, STEAM[s % 2]);
    if (s > 0) u.p(n - s - 2, 41 - s, STEAM[0]);
  }
  // the hit: dust kicked up behind the hooves and speed lines along the back
  if (hit) {
    const v = painter(pic);
    [[52, 56, 3], [57, 52, 2], [60, 58, 2], [46, 59, 2]].forEach(([x, y, s], i) => v.r(x, y, s, s, DUST[i % 2]));
    [18, 26, 34].forEach((y, i) => v.row(y, 58 - i * 2, 63, DUST[1]));
  }
  return pic;
}
