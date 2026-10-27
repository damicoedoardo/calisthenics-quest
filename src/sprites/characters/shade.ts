import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { HOLLOW_EYES, SHADOW } from '../palette';
import { paintRows, shifted } from './pixel';

/* The Shade, a dungeon monster: a shade of you. Your spiky hair and your shoulders, but made of
   shadow, with red eyes and a cloak that frays into smoke instead of legs. It reaches for you with
   one clawed hand. It teleports: on the wind-up it comes apart into dithered smoke, on the hit it
   is back, slashing. 32x32 rows, doubled. */

const ROWS = [
  '................................',
  '..............c.................',
  '.............cc....c............',
  '..........c.cccc..cc............',
  '..........cccccccccc...c........',
  '...........cccccccccccc.........',
  '.........cccccccccccccc.........',
  '..........cssssccccccccccc......',
  '..........ssssssscccccccc.......',
  '..........sssssssscccccc........',
  '...........ssssssscccccccc......',
  '...........sssssssccccc.........',
  '............sssssscccc..........',
  '.............ssssbb.............',
  '..........bbbbbbbbbbbbb.........',
  '.........bbbbbbbbbbbbbbb........',
  '........bbbbbbbbbbbbbabbb.......',
  '.......bbbbbabbbbbbbbabbb.......',
  '.....bbbbbbbabbbbbbbbaabb.......',
  '..b.bbbbb.bbabbbbbbbbaabb.......',
  '.bbbbbbb..bbbabbbbbbbaaab.......',
  'bbbbb.....bbbabbbbbbbbaab.......',
  '.bbb......bbbbabbbbbbbaab.......',
  '..b........bbbabbbbbbbbab.......',
  '...........bbbbabbbbbbbbaa......',
  '...........bbbbbabbbbbbbaaa.....',
  '............bbbbabbbbbbbbaaa....',
  '............bbb.bbbabbbbb.aaa...',
  '.............bb..bbb.bbbb..aa...',
  '.............b....bb..bbb...a...',
  '...................b...bb.......',
  '........................b.......',
];
/** Rows from here down are the frayed hem, which flickers. */
const HEM = 26;
const PAL = { a: SHADOW[1], b: SHADOW[2], c: SHADOW[3], s: SHADOW[1] };
const RIM = '#8b5cf6';
const SLASH = ['#c4b5fd', '#ffffff'];

export function drawShade(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    k = f % 8,
    g = grid(32),
    p = painter(g);
  paintRows(p, ROWS, PAL);
  // the hem never holds still: a few of its threads come and go
  for (let y = HEM; y < 32; y++) for (let x = 0; x < 32; x++) if (g[y][x] && (x * 7 + y * 3 + k) % 9 === 0) g[y][x] = null;
  let pic = shifted(outline(autoshade(scale2x(g))), hit ? -6 : 0, bob);
  // a violet rim light along the top and front edges, so it reads on a dark floor
  pic = pic.map((row, y) => row.map((c, x) => (c && c !== PAL.s && (!pic[y - 1]?.[x] || !row[x - 1]) && y < 56 ? RIM : c)));
  // teleporting: it comes apart into a checker of smoke
  if (wind) pic = pic.map((row, y) => row.map((c, x) => ((x + y + f) % 2 && y > 8 ? null : c)));
  const u = painter(pic, bob),
    dx = hit ? -6 : 0;
  // red eyes under the bangs, wider as it strikes
  const glow = k === 3 ? HOLLOW_EYES.core : HOLLOW_EYES.glow;
  [22, 29].forEach((x) => {
    u.r(x + dx, 19, 3, hit ? 3 : 2, glow);
    u.p(x + dx, 19, HOLLOW_EYES.core);
  });
  // the slash of its claws
  if (hit)
    [0, 4, 8].forEach((o) => {
      u.line(2, 26 + o, 12, 34 + o, SLASH[0]);
      u.line(3, 26 + o, 13, 34 + o, SLASH[1]);
    });
  return pic;
}
