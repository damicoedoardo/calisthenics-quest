import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { shifted } from './pixel';

/* The Snooze Clock, a dungeon monster and one of Tomorrow's: a cracked grandfather clock that
   floats a little off the floor, its dial a sleepy face, its pendulum swinging slow. It never
   moves; it ticks out a spiral of clock hands. Its attack: its eyes snap open and the bell on its
   crown rings. 32x32, doubled. */

const WOOD = ['#3b2414', '#6b4226', '#9a6a3e'];
const BRASS = ['#7c5a1e', '#c9a23a', '#f2dc8a'];
const DIAL = '#f4ecd8';
const GLASS = '#1d2a3a';
const FACE = '#1e1b2e';
const Z = '#c7d2fe';

export function drawClock(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    g = grid(32),
    p = painter(g);
  // the case: a crown, a wide head round the dial, a narrow waist with the pendulum's window, a base
  p.poly([[10, 4], [16, 1], [22, 4]], WOOD[1]);
  p.r(9, 4, 15, 12, WOOD[1]);
  p.r(11, 16, 11, 10, WOOD[1]);
  p.r(9, 26, 15, 3, WOOD[1]);
  p.r(10, 29, 2, 1, WOOD[0]);
  p.r(21, 29, 2, 1, WOOD[0]);
  // the dial and the window
  p.ellipse(16, 10, 5, 5, BRASS[1]);
  p.ellipse(16, 10, 4, 4, DIAL);
  p.r(13, 17, 7, 8, GLASS);
  // the bell on the crown
  p.ellipse(16, 1, 2, 1.5, BRASS[1]);

  const shake = hit ? (f % 2 ? 1 : -1) : 0,
    pic = shifted(outline(autoshade(scale2x(g))), shake, bob),
    u = painter(pic, bob),
    X = (x: number) => x + shake;
  // the pendulum, swinging slow behind the glass
  const sw = Math.round(Math.sin((f / 8) * Math.PI * 2) * 4);
  u.line(X(32), 35, X(32 + sw), 44, BRASS[0]);
  u.ellipse(X(32 + sw), 46, 2.5, 2.5, BRASS[1]);
  u.p(X(31 + sw), 45, BRASS[2]);
  // a crack across the glass and down the case
  u.line(X(28), 36, X(31), 41, '#64748b');
  u.line(X(40), 12, X(42), 18, WOOD[0]);
  // the face on the dial: heavy lids and a slow smile, or wide awake and ringing
  if (wind || hit) {
    [27, 34].forEach((x) => {
      u.r(X(x), 17, 3, 3, FACE);
      u.p(X(x), 17, '#ffffff');
    });
    u.line(X(26), 15, X(30), 16, FACE);
    u.line(X(38), 15, X(34), 16, FACE);
    u.ellipse(X(32), 24, 2, hit ? 2 : 1, FACE);
  } else {
    [26, 34].forEach((x) => {
      u.row(18, X(x), X(x + 4), FACE);
      u.r(X(x + 1), 19, 3, 1, FACE);
    });
    u.row(23, X(30), X(34), FACE);
    // the hands, pointing at "later"
    u.line(X(32), 20, X(32), 14, BRASS[0]);
  }
  // brass trim along the head and the base
  u.row(8, X(18), X(46), BRASS[1]);
  u.row(52, X(18), X(46), BRASS[1]);
  // a lazy z drifting off it, or the bell's ring
  if (wind || hit) {
    u.line(X(26), 0, X(23), 2, BRASS[2]);
    u.line(X(38), 0, X(41), 2, BRASS[2]);
    if (hit) {
      u.line(X(22), 5, X(19), 5, BRASS[2]);
      u.line(X(42), 5, X(45), 5, BRASS[2]);
    }
  } else {
    const k = f % 8,
      zx = 48 + (k >> 2),
      zy = 14 - k * 2;
    if (k < 6) {
      u.row(zy, zx, zx + 3, Z);
      u.line(zx + 3, zy, zx, zy + 3, Z);
      u.row(zy + 3, zx, zx + 3, Z);
    }
  }
  return pic;
}
