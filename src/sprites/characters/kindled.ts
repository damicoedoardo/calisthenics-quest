import type { ClipFrame } from '../clips';
import { autoshade, grid, outline, painter, scale2x, stamp, type Grid, type Painter } from '../engine/grid';
import { FLAME } from '../palette';
import { paintRows, shifted } from './pixel';

/* The flame's true form, from the finale: a small kid made of fire, your own spark, "your face from
   long before any of this". Ember's colors and Ember's face, with the hero's spiky hair as tongues
   of flame (long looks get locks down the back too). It hovers a little off the ground: the hair
   sways, the feet flicker, sparks rise. Drawn as 32x32 text rows, doubled with Scale2x; the face
   goes on top at 64x64. */

export interface KindledOpts {
  /** The player's hair, roughly: spiky tongues, or long locks down the back. */
  hair: 'short' | 'long';
}

/** Hair tips, two sways that alternate. */
const TIPS = [
  [
    '................................',
    '...............r................',
    '.........r....rr.....r..........',
    '...r.....rr..roor...rr....r.....',
    '....rr...ror.roor..ror...rr.....',
    '.....rrr.roorooooroooo.rrr......',
  ],
  [
    '................................',
    '................r...............',
    '..........r....rr.....r.........',
    '....r.....rr..roor...rr....r....',
    '.....rr...ror.roor..ror..rr.....',
    '.....rrr.roorooooroooo.rrr......',
  ],
];

const ROWS = [
  '......rrroooooooooooooorrr......',
  '.....rrooooOOooooooOOoooorr.....',
  '.....rrooOOooooooooooOOoorr.....',
  '.....roooooooooooooooooooor.....',
  '.....rooocoooccooccooocooor.....',
  '.....roocccoccccccccocccoor.....',
  '.....royccccccccccccccccyor.....',
  '......ryccccccccccccccccyr......',
  '......yccccccccccccccccccy......',
  '......yccccccccccccccccccy......',
  '.......yccccccccccccccccy.......',
  '........yyccccccccccccyy........',
  '..........yyyyyccyyyyy..........',
  '..............yyyy..............',
  '...........roooooooor...........',
  '.........rrooooyyoooorr.........',
  '........roo.ooyccyoo.oor........',
  '........roo.oyyccyyo.oor........',
  '........roo.oyyyyyyo.oor........',
  '........ryy.ooyyyyoo.yyr........',
  '.........y..roooooor..y.........',
  '............roo..oor............',
  '............roo..oor............',
  '............ryo..oyr............',
];
/** The feet are fire too: they flicker frame to frame. */
const FEET = ['.............y....y.............', '............y......y............'];

/** Long hair falls behind the head and shoulders. */
const LOCKS = Array.from({ length: 16 }, (_, j) => {
  const y = j + 7,
    tip = y >= 20,
    l = tip ? '..ro' : '.roo',
    r = tip ? 'or..' : 'oor.';
  return `${'.'.repeat(3)}${l}${'.'.repeat(18)}${r}${'.'.repeat(3)}`;
});

/** The waving arm, up and out past the head (cols 22-31, rows 13-21); on 'charge' it swings higher. */
const WAVE = [
  [
    '..........',
    '..........',
    '......yy..',
    '.....ryyr.',
    '....roo...',
    '...roo....',
    '..roo.....',
    '.roo......',
    'roo.......',
  ],
  [
    '.......yy.',
    '......ryyr',
    '......roo.',
    '.....roo..',
    '....roo...',
    '...roo....',
    '..roo.....',
    '.roo......',
    'roo.......',
  ],
];

const PAL: Record<string, string> = {
  r: FLAME.red[1],
  o: FLAME.orange[1],
  O: FLAME.orange[2],
  y: FLAME.yellow,
  c: FLAME.core,
};

const FLOAT = [0, 0, -1, -1, -2, -2, -1, -1];
const BLINK_FRAME = 6;

function face(p: Painter, f: number) {
  const E = FLAME.face,
    ey = 25;
  [20, 38].forEach((x) => {
    if (f === BLINK_FRAME) {
      // a blink: happy arcs
      p.row(ey + 4, x + 1, x + 4, E);
      p.p(x, ey + 3, E);
      p.p(x + 5, ey + 3, E);
      return;
    }
    // rounded, a big shine top-left and a small one bottom-right, like Ember's
    p.row(ey, x + 1, x + 4, E);
    p.r(x, ey + 1, 6, 6, E);
    p.row(ey + 7, x + 1, x + 4, E);
    p.r(x + 1, ey + 1, 2, 2, '#ffffff');
    p.p(x + 4, ey + 5, '#ffffff');
    p.row(ey + 6, x + 1, x + 3, FLAME.orange[0]);
  });
  // a small open smile and warm cheeks
  p.r(30, ey + 10, 4, 2, '#7f1d1d');
  p.row(ey + 11, 31, 32, FLAME.blush);
  p.r(16, ey + 8, 3, 2, FLAME.blush);
  p.r(45, ey + 8, 3, 2, FLAME.blush);
}

function sparks(p: Painter, f: number) {
  [
    [12, 30, 0],
    [52, 26, 3],
    [46, 10, 5],
    [16, 12, 2],
  ].forEach(([x, y, phase]) => {
    const k = (f + phase) % 8;
    if (k > 5) return;
    p.p(x + (k % 2), y - k * 2, FLAME.yellow);
    if (k < 4) p.p(x + (k % 2), y - k * 2 + 1, FLAME.orange[1]);
  });
}

export function drawKindled(o: Partial<KindledOpts>, frame: ClipFrame, f: number): Grid {
  const g = grid(32),
    p = painter(g);
  if (o.hair === 'long') paintRows(p, LOCKS, PAL, 0, 7);
  paintRows(p, TIPS[Math.floor(f / 2) % 2], PAL);
  paintRows(p, ROWS, PAL, 0, 6);
  paintRows(p, [FEET[f % 2]], PAL, 0, 30);
  if (frame.right === 'up') {
    // the right arm leaves its side and waves
    for (let y = 22; y <= 26; y++) for (let x = 20; x <= 23; x++) p.erase(x, y);
    paintRows(p, WAVE[frame.fx === 'charge' ? 1 : 0], PAL, 22, 13);
  }
  const art = outline(autoshade(scale2x(g)));
  face(painter(art), f);
  const out = shifted(art, 0, FLOAT[f % FLOAT.length]),
    fx = grid(64);
  sparks(painter(fx), f);
  stamp(out, fx);
  return out;
}
