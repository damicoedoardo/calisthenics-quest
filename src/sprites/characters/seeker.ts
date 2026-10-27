import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Seeker, a dungeon monster: one great cyan eye in a teal shell with a spiked crest, fins
   flapping at its sides and a crystal hanging under it. It keeps its distance and watches: the
   pupil darts around, it blinks. Its attack: the iris flares white, then fires. 32x32, doubled. */

const ROWS = [
  '................................',
  '...............c................',
  '..............cc...c............',
  '.........c....cb..cb....c.......',
  '.........cc..cbb..cb...cb.......',
  '.........cbbbbbbbbbbbbbbb.......',
  '.........bbbcccccbbbbbbbb.......',
  '........bbcccccccccbbbbbbb......',
  '.......bccccccccccbbbbbbbbb.....',
  '......bccbbbbbbbbbbbbbbbbbbb....',
  '.....bcbaaaaaaaaaaaaaaaaaabbb...',
  '.....bbawwwwwwiiiiiwwwwwwwabb...',
  '....bbawwwwwiiiiiiiiiwwwwwwabb..',
  '....bawwwwwiiiIIIIIiiiwwwwwwab..',
  '....bwwwwwwiiIIIIIIIiiwwwwwwwb..',
  '....bwwwwwwiiIIIIIIIiiwwwwwwwb..',
  '....bwwwwwwiiIIIIIIIiiwwwwwwwb..',
  '....bawwwwwiiiIIIIIiiiwwwwwwab..',
  '....bbawwwwwiiiiiiiiiwwwwwwabb..',
  '.....bbaawwwwwiiiiiwwwwwwaabb...',
  '.....abbbaaawwwwwwwwwwaaabbba...',
  '......abbbbbaaaaaaaaaabbbbba....',
  '.......aabbbbbbbbbbbbbbbbaa.....',
  '.........aaabbbbbbbbbbaaa.......',
  '............aaaaaaaaaa..........',
  '...............Gg...............',
  '..............GGgg..............',
  '.............GGGggg.............',
  '.............GGGggg.............',
  '..............GGgg..............',
  '...............Gg...............',
  '................................',
];
const SHELL = { a: '#0f3b3d', b: '#1f6f6a', c: '#4fb0a0' };
const EYE = { w: '#dff7fb', i: '#22b8cf', I: '#0e7490' };
const HOT = { w: '#ffffff', i: '#a5f3fc', I: '#67e8f9' };
const CRYSTAL = { g: '#a5f3fc', G: '#22b8cf' };
const FIN = ['#134e4a', '#2b8a80'];
const PUPIL = '#082f3a';
/** Where the pupil looks, frame by frame: left (at you) most of the time, a glance around. */
const LOOK = [[-3, 0], [-3, 0], [-3, 0], [-1, -2], [2, -1], [-3, 0], [-3, 1], [-3, 0]];

export function drawSeeker(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    k = f % 8,
    g = grid(32),
    p = painter(g);
  // fins, up and down as it flaps
  const flap = wind || hit ? -2 : [0, -1, -2, -1, 0, 1, 1, 0][k];
  p.poly([[5, 14], [0, 9 + flap], [1, 15 + flap], [5, 19]], FIN[1]);
  p.poly([[27, 14], [31, 9 + flap], [31, 15 + flap], [27, 19]], FIN[1]);
  p.line(4, 15, 1, 11 + flap, FIN[0]);
  p.line(27, 15, 30, 11 + flap, FIN[0]);
  paintRows(p, ROWS, { ...SHELL, ...(wind ? HOT : EYE) });
  // the crystal swings a little
  paintRows(p, ROWS, CRYSTAL, [0, 0, 1, 1, 0, 0, -1, -1][k], 0);
  // a blink: the lids close over the eye
  if (k === 6 && !wind && !hit) for (let y = 11; y <= 20; y++) for (let x = 5; x <= 27; x++) if (g[y][x] === EYE.w || g[y][x] === EYE.i || g[y][x] === EYE.I) g[y][x] = y === 15 ? SHELL.a : SHELL.b;
  const pic = shifted(outline(autoshade(scale2x(g))), 0, bob),
    u = painter(pic, bob);
  if (k !== 6 || wind || hit) {
    const [lx, ly] = wind || hit ? [-2, 0] : LOOK[k],
      cx = 33 + lx,
      cy = 31 + ly;
    // the pupil narrows to a slit as it locks on
    if (wind) u.r(cx - 1, cy - 5, 2, 10, PUPIL);
    else u.ellipse(cx, cy, hit ? 2 : 4, hit ? 2 : 4, PUPIL);
    u.r(cx - 6, cy - 6, 3, 3, '#ffffff');
    u.p(cx + 4, cy + 4, '#ffffff');
  }
  // the shot leaving the eye
  if (hit) {
    u.ellipse(10, 31, 5, 4, HOT.I);
    u.ellipse(9, 31, 3, 2, '#ffffff');
    [[2, 25], [1, 37], [16, 22], [16, 40]].forEach(([x, y]) => u.r(x, y, 2, 2, HOT.i));
  } else if (wind) [[33, 14], [20, 31], [46, 31]].forEach(([x, y]) => u.p(x, y, HOT.i));
  return pic;
}
