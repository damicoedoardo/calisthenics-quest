import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid, type Painter } from '../engine/grid';
import { shifted } from './pixel';

/* The Excuse Jar, a dungeon monster: a big cracked clay urn, its lid askew, with eyes peering out
   of the dark crack down its front: something small and many lives in there. Its attack: it hops
   and the lid jumps. Hit it hard enough and it shatters into three Jar Imps, little soot imps who
   wear a shard of the jar as a helmet. 32x32, doubled. */

const CLAY = ['#6b2f1a', '#a4502c', '#d9814e'];
const BAND = '#2d1a12';
const DARK = '#140c10';
const EYE = ['#c084fc', '#f5d0fe'];
const SOOT = ['#2a2436', '#4b4260', '#7d7196'];
const EMBER = ['#f59e0b', '#fde68a'];

/** A pair of glowing eyes in the dark. */
function eyes(u: Painter, x: number, y: number, gap: number, shut: boolean, c = EYE) {
  [x, x + gap].forEach((ex) => {
    if (shut) u.row(y + 1, ex, ex + 2, c[0]);
    else {
      u.r(ex, y, 3, 2, c[0]);
      u.p(ex + 1, y, c[1]);
    }
  });
}

/** The urn's body, its neck and lip, painted at 32x32. */
function urn(p: Painter, sq: number) {
  p.ellipse(16, 20 + sq, 11, 9 - sq, CLAY[1]);
  p.r(10, 26, 13, 3, CLAY[1]);
  p.r(12, 8 + sq, 9, 4, CLAY[1]);
  p.r(10, 7 + sq, 13, 2, CLAY[2]);
  p.row(16 + sq, 6, 26, BAND);
  p.row(17 + sq, 6, 26, BAND);
}

export function drawJar(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    sq = wind ? 1 : 0,
    g = grid(32),
    p = painter(g);
  urn(p, sq);
  // the lid, sitting crooked, jumping up as it attacks
  const lift = hit ? -3 : wind ? -1 : 0;
  p.poly([[10, 6 + lift], [22, 4 + lift], [22, 6 + lift], [10, 8 + lift]], CLAY[0]);
  p.r(15, 3 + lift, 3, 2, CLAY[0]);
  const hop = hit ? -3 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), 0, hop + (frame.bob ?? 0)),
    u = painter(pic, hop + (frame.bob ?? 0));
  // the crack down its front, dark inside, and the eyes looking out of it
  u.poly([[27, 35], [37, 33], [40, 42], [36, 50], [38, 58], [28, 57], [25, 46]], DARK);
  // light on the round of the clay
  u.ellipse(19, 30, 3, 5, CLAY[2]);
  u.r(26, 18 + sq * 2, 2, 5, CLAY[2]);
  const k = f % 8;
  eyes(u, 30, 40 + (k > 5 ? 1 : 0), 4, !hit && k === 3);
  if (!hit) eyes(u, 31, 50, 3, k === 6, [EMBER[0], EMBER[1]]);
  // little cracks and a chip off the lip, a fingertip curled over the rim
  u.line(20, 30, 24, 34, CLAY[0]);
  u.line(44, 44, 48, 40, CLAY[0]);
  u.r(40, 14 + sq * 2, 3, 2, DARK);
  u.r(24, 15 + sq * 2, 2, 2, SOOT[1]);
  // soot puffing out of the mouth as it attacks
  if (wind || hit) [[26, 8], [36, 4], [30, 0]].forEach(([x, y], i) => u.r(x, y + hop, 3, 3, SOOT[i % 3]));
  return pic;
}

/** A Jar Imp: a little soot imp with a shard of the jar for a helmet. */
export function drawImp(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    g = grid(32),
    p = painter(g),
    hop = f % 4 < 2 ? 0 : 1;
  // the body, low in the frame like the others, two stubby legs
  p.ellipse(16, 24 - hop, 5, 4, SOOT[1]);
  p.r(13, 27, 2, 2, SOOT[0]);
  p.r(18, 27, 2, 2, SOOT[0]);
  // the shard helmet
  p.poly([[10, 21 - hop], [14, 16 - hop], [21, 17 - hop], [22, 21 - hop]], CLAY[1]);
  const dx = hit ? -6 : wind ? 2 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, 0),
    u = painter(pic);
  u.row(42 - hop * 2, 21 + dx, 44 + dx, BAND);
  eyes(u, 26 + dx, 46 - hop * 2, 6, false, [EMBER[0], EMBER[1]]);
  u.row(51 - hop * 2, 29 + dx, 34 + dx, DARK);
  return pic;
}

/** The Excuse Jar shattering, played once where it dies: it shakes, cracks of light run over it,
    then it bursts into shards and three Jar Imps tumble out. */
export function drawJarPop(_o: unknown, frame: ClipFrame, f: number): Grid {
  if (f < 2) {
    const g = grid(32),
      p = painter(g);
    urn(p, 0);
    const pic = shifted(outline(autoshade(scale2x(g))), f ? 1 : -1, 0),
      u = painter(pic);
    if (f === 1) {
      u.line(32, 16, 26, 40, '#fef3c7');
      u.line(26, 40, 34, 58, '#fef3c7');
      u.line(40, 30, 50, 44, '#fef3c7');
      u.line(16, 30, 22, 46, '#fef3c7');
    }
    return pic;
  }
  const out = grid(64),
    u = painter(out),
    t = f - 1;
  // shards flying out
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2,
      r = 12 + t * 10,
      x = 32 + Math.cos(a) * r,
      y = 36 + Math.sin(a) * r * 0.7;
    u.poly([[x, y], [x + 4, y + 1], [x + 1, y + 4]], i % 2 ? CLAY[1] : CLAY[2]);
  }
  // the three imps tumbling out
  if (frame.fx === 'burst')
    [[18, 34], [32, 26], [46, 34]].forEach(([x, y]) => {
      u.ellipse(x, y, 5, 4, SOOT[1]);
      u.poly([[x - 6, y - 2], [x - 2, y - 7], [x + 5, y - 6], [x + 6, y - 2]], CLAY[1]);
      eyes(u, x - 3, y, 4, false, [EMBER[0], EMBER[1]]);
    });
  // a puff of soot where it stood
  u.ellipse(32, 56, 16 + t * 4, 3, SOOT[0]);
  return outline(out);
}
