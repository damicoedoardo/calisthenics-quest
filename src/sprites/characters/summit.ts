import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, outline, painter, type Grid } from '../engine/grid';
import { R } from '../palette';

/* The Summit, the last chapter: the mountain itself, a gold flag at the top and a sunrise behind
   it. The flag waves, the light pulses, clouds drift past the foot. */

const ROCK = ['#334155', '#475569', '#64748b'];
const SNOW = ['#94a3b8', '#e2e8f0', '#ffffff'];
const SUN = ['#f59e0b', '#fcd34d', '#fef3c7'];
const CLOUD = '#e2e8f0';

export function drawSummit(_o: unknown, frame: ClipFrame, f: number): Grid {
  const sky = grid(SIZE),
    s = painter(sky),
    pulse = (frame.bob ?? 0) > 0 ? 1 : 0;
  // sunrise behind the peak (no outline)
  s.ellipse(32, 20, 17 + pulse, 17 + pulse, SUN[0]);
  s.ellipse(32, 20, 14 + pulse, 14 + pulse, SUN[1]);
  s.ellipse(32, 20, 10, 10, SUN[2]);

  const g = grid(SIZE),
    p = painter(g);
  // two peaks
  p.poly([[1, 58], [16, 26], [26, 42], [33, 10], [63, 58]], ROCK[1]);
  // snow caps with ragged edges
  p.poly([[33, 10], [41, 24], [38, 23], [35, 27], [32, 22], [29, 26], [26, 22]], SNOW[1]);
  p.poly([[16, 26], [21, 35], [18, 33], [15, 36], [12, 33]], SNOW[1]);
  // flag: pole and a cloth that waves
  p.col(33, 0, 10, R.wood[1]);
  const wave = [0, 1, 0, -1][f % 4];
  p.poly([[34, 1], [43, 2 + wave], [42, 5], [43, 8 + wave], [34, 7]], R.gold[1]);

  const out = outline(autoshade(g)),
    u = painter(out);
  // ridge shading: the right face of each peak in shadow
  u.line(33, 11, 52, 42, ROCK[0]);
  u.line(16, 27, 24, 41, ROCK[0]);
  u.line(36, 30, 44, 48, ROCK[2]);
  u.row(4, 35, 41, R.gold[2]);
  // clouds drifting along the foot
  const drift = f % 8;
  [
    [4 + drift, 50, 7],
    [40 + drift, 53, 9],
  ].forEach(([x, y, w]) => {
    u.r(x, y, w, 3, CLOUD);
    u.r(x + 2, y - 2, w - 4, 2, CLOUD);
    u.row(y + 2, x, x + w - 1, SNOW[0]);
  });
  // merge the sky under the mountain
  sky.forEach((row, y) => row.forEach((c, x) => c && !out[y][x] && (out[y][x] = c)));
  return out;
}
