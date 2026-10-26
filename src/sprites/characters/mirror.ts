import type { ClipFrame } from '../clips';
import { SIZE } from '../engine/figure';
import { autoshade, grid, mix, outline, painter, type Grid } from '../engine/grid';
import { GOLD_GHOST, R } from '../palette';

/* The Mirror, the Chapter 2 enemy: an ornate standing mirror. In the cracked glass stands your
   old self, gold and sure, looking down at you. A glint sweeps the glass; its attack flashes. */

const GLASS = ['#0f172a', '#1e293b', '#334155'];
const CRACK = '#cbd5e1';

export function drawMirror(_o: unknown, frame: ClipFrame, f: number): Grid {
  const g = grid(SIZE),
    p = painter(g, frame.bob ?? 0),
    G = R.gold,
    cx = 32,
    cy = 27,
    hit = frame.fx === 'impact';

  // stand and feet
  p.r(cx - 2, 47, 5, 8, G[1]);
  p.poly([[cx - 12, 60], [cx + 12, 60], [cx + 6, 54], [cx - 6, 54]], G[1]);
  // frame: oval with a crest and side scrolls
  p.ellipse(cx, cy, 17, 22, G[1]);
  p.poly([[cx - 5, 6], [cx, 0], [cx + 5, 6]], G[1]);
  p.ellipse(cx - 18, cy + 4, 3, 5, G[1]);
  p.ellipse(cx + 18, cy + 4, 3, 5, G[1]);
  p.ellipse(cx, cy, 13, 18, GLASS[1]);

  const out = outline(autoshade(g)),
    u = painter(out, frame.bob ?? 0),
    ghost = hit ? GOLD_GHOST[3] : mix(GOLD_GHOST[2], GLASS[1], 0.55),
    rim = hit ? GOLD_GHOST[4] : mix(GOLD_GHOST[3], GLASS[1], 0.35);
  // your old self in the glass
  u.poly([[cx - 8, cy + 16], [cx - 6, cy + 3], [cx + 6, cy + 3], [cx + 8, cy + 16]], ghost);
  u.ellipse(cx, cy - 5, 4.5, 5, ghost);
  u.line(cx - 4, cy - 9, cx - 1, cy - 11, rim);
  u.line(cx - 6, cy + 3, cx - 7, cy + 14, rim);
  // it looks down at you
  u.p(cx - 2, cy - 5, '#ffffff');
  u.p(cx + 2, cy - 5, '#ffffff');
  // the crack
  u.line(cx + 4, cy - 17, cx + 1, cy - 9, CRACK);
  u.line(cx + 1, cy - 9, cx + 6, cy - 2, CRACK);
  u.line(cx + 6, cy - 2, cx + 3, cy + 6, CRACK);
  u.line(cx + 1, cy - 9, cx + 9, cy - 11, CRACK);
  // a glint sweeping down the glass
  const k = f % 8;
  if (k < 5) {
    const y0 = cy - 14 + k * 6;
    u.line(cx - 10, y0 + 4, cx - 4, y0 - 2, GLASS[2]);
    u.line(cx - 9, y0 + 4, cx - 3, y0 - 2, '#e2e8f0');
  }
  // gems on the crest and the scrolls
  u.p(cx, 3, R.red[2]);
  u.r(cx - 18, cy + 3, 1, 2, R.red[2]);
  u.r(cx + 18, cy + 3, 1, 2, R.red[2]);
  return out;
}
