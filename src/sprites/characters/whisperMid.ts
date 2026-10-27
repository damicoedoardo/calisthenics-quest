import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, type Grid } from '../engine/grid';
import { paintRows, shifted } from './pixel';

/* The Whisper, the Fog's mid-boss: a wisp like the ones on the road, grown big and gone violet.
   Five tongues of flame for a crown, a round head with wide pale eyes and the wisp's jagged grin,
   a long tail curling under it, and two little wisps of its own circling it, the whispers it
   trades places with. Its attack: its eyes go wide and its flames shrink in, then it lunges with
   its mouth open in a ring of pale light. 32x32 rows, doubled. */

const ROWS = [
  '................................',
  '................................',
  '.............b..................',
  '............bb...............b..',
  '...........bLb..............bb..',
  '..........bLLb.......b.....bLb..',
  '.........bLlLb......bb....bLLb..',
  '........bLllLb.....bLb...bLLb...',
  '.......bLlllLb....bLLb..bLLb....',
  '......bLllLLbb...bLlLb.bLLbb....',
  '.....bbLLLLbbbb.bLlLbbbLLbb.....',
  '....bbbbLLbbbbbbbLLbbbLbbbb.....',
  '...bbbbbbbbbbbbbbbbbbbbbbbbv....',
  '..bblllbbbbbbbbbbbbbbbbbbbbvv...',
  '..bllllbbbbbbbbbbbbbbbbbbbbvv...',
  '.bbblbbbbbbbbbbbbbbbbbbbbbbvvv..',
  '.bbbbbbbbbbbbbbbbbbbbbbbbbvvvv..',
  '.bbbbbbbbbbbbbbbbbbbbbbbbbvvvv..',
  '.bbbbbbbbbbbbbbbbbbbbbbbbvvvvv..',
  '..bbbbbbbbbbbbbbbbbbbbbbbvvvv...',
  '..bbbbbbbbbbbbbbbbbbbbbbvvvvv...',
  '...bbbbbbbbbbbbbbbbbbbbvvvvv....',
  '....bbbbbbbbbbbbbbbbbbvvvvv.....',
  '......bbbbbbbbbbbbbbvvvvv.......',
];
/* The tail, swaying more the further down it goes. */
const TAIL = [
  'bbbbbbbbvvv...',
  '.bbbbbbbvv....',
  '..bbbbbbvv....',
  '...bbbbbv.....',
  '....bbbbv.....',
  '.....bbbv.....',
  '......bbv.....',
  '.......bv.....',
  '........bb....',
  '.........b....',
];
/* One of its little wisps. */
const MOTE = ['.b..', 'bLb.', 'bbbv', 'bbvv', '.vv.', '..v.'];
const BODY = { b: '#7c3aed', v: '#5b21b6', l: '#a78bfa', L: '#c4b5fd' };
const SHRUNK = { b: '#6d28d9', v: '#4c1d95', l: '#8b5cf6', L: '#a78bfa' };
const EYE = ['#ede9fe', '#ffffff'];
const MOUTH = '#1e0b3d';
const SWAY = [0, 1, 2, 1, 0, -1, -2, -1];
const GLOW = ['#c4b5fd', '#ede9fe'];

export function drawWhisperMid(_o: unknown, frame: ClipFrame, f: number): Grid {
  const wind = frame.right === 'up',
    hit = frame.fx === 'impact',
    bob = frame.bob ?? 0,
    pal = wind ? SHRUNK : BODY,
    g = grid(32),
    p = painter(g),
    s = SWAY[f % 8];
  // The crown of flames: drawn in short while it gathers itself.
  paintRows(p, ROWS, pal, 0, wind ? 2 : 0);
  TAIL.forEach((row, j) => paintRows(p, [row], pal, 8 + Math.round((s * j) / 6), 24 + j));
  // The flames' tips flicker.
  if (!wind) [[14, 1], [30, 2], [22, 4]].forEach(([x, y], i) => (f + i) % 3 && p.p(x, y, pal.b));
  const dx = hit ? -4 : wind ? 1 : 0,
    pic = shifted(outline(autoshade(scale2x(g))), dx, bob),
    u = painter(pic, bob);

  // Wide pale eyes under an angry slant, looking left; wider still as it gathers itself.
  const ey = wind ? 31 : 30,
    eh = wind ? 6 : hit ? 3 : 5;
  [15, 28].forEach((x, i) => {
    u.r(x + dx, ey, 6, eh, EYE[0]);
    u.r(x + dx + 1, ey + 1, 2, 2, EYE[1]);
    u.row(ey + eh - 1, x + dx, x + dx + 5, '#a78bfa');
    if (i === 0) u.thick(x + dx, ey - 2, x + dx + 6, ey, 2, MOUTH);
    else u.thick(x + dx - 1, ey, x + dx + 5, ey - 2, 2, MOUTH);
  });
  // The wisp's jagged grin, wide open as it strikes.
  if (hit) {
    u.r(21 + dx, 39, 9, 6, MOUTH);
    [22, 25, 28].forEach((x) => u.p(x + dx, 39, EYE[0]));
  } else {
    u.row(41, 21 + dx, 29 + dx, MOUTH);
    [22, 25, 28].forEach((x) => u.p(x + dx, 40, MOUTH));
    [23, 27].forEach((x) => u.p(x + dx, 42, MOUTH));
  }

  // Its two little wisps, circling it (they hide behind it for half the turn).
  const v = painter(pic);
  [0, 4].forEach((ph) => {
    const a = (((f + ph) % 8) / 8) * Math.PI * 2,
      x = Math.round(30 + dx + Math.cos(a) * 25),
      y = Math.round(46 + Math.sin(a) * 8) + bob;
    if (Math.sin(a) < -0.3) return;
    MOTE.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && v.r(x + i * 2 - 3, y + j * 2 - 4, 2, 2, BODY[c as keyof typeof BODY])));
    v.p(x - 2, y - 1, EYE[1]);
    v.p(x + 1, y - 1, EYE[1]);
  });

  // The strike throws a ring of pale light.
  if (hit)
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      if (i % 2) v.p(28 + Math.cos(a) * 27, 34 + Math.sin(a) * 25, GLOW[i % 4 === 1 ? 1 : 0]);
    }
  return pic;
}
