import type { ClipFrame } from '../clips';
import { drawFigure, type FigureSpec, type Look } from '../engine/figure';
import { mix, painter, type Grid } from '../engine/grid';
import { drawSword } from '../parts/weapons';
import { DEFAULT_LOOK } from './hero';
import { R } from '../palette';

/* The Perfect Knight: flawless plate from head to toe, not one scratch. A closed helm with a thin
   visor slit (nobody inside can be seen), a red plume, a kite shield and a long sword. */

const PLATE = R.silver;
const SHINE = '#ffffff';
const PLUME = R.red;

/** The knight as the dungeon boss loses its plates in stages: 0 spotless, 1 the pauldrons and two
    tassets gone and the breastplate scratched, 2 the helm gone too and the breastplate split, the
    kid inside showing. Stage 0 is the Chapter 3 knight exactly. */
const knightSpec = (stage: 0 | 1 | 2): FigureSpec => ({
  id: stage ? `knight${stage}` : 'knight',
  attack: 'swing',
  a: PLATE,
  legs: [PLATE[0], PLATE[1], PLATE[2]],
  glove: R.iron,
  hideHair: stage < 2,
  glow: '#e2e8f0',
  layers: {
    outfit(c) {
      const { u, l, w, P } = c;
      for (let y = 30; y <= 47; y++) {
        const [x0, x1] = y <= 45 ? c.torsoRange(y) : [21, 42];
        u.row(y, x0, x1, PLATE[1]);
        u.p(x0, y, PLATE[2]);
        u.p(x1, y, PLATE[0]);
      }
      // breastplate with a polished ridge down the middle
      u.r(24, 31, 16, 10, PLATE[2]);
      u.r(25, 32, 14, 8, PLATE[1]);
      u.col(31, 31, 40, SHINE);
      u.col(32, 31, 40, PLATE[2]);
      u.row(41, 22, 41, PLATE[0]);
      // belt of plates, and tassets over the thighs
      u.row(42, 22, 41, R.gold[1]);
      [22, 27, 32, 37].forEach((x, i) => {
        if (stage && i % 2) return;
        l.r(x, 44, 5, 5, PLATE[1]);
        l.row(44, x, x + 4, PLATE[2]);
        l.row(48, x, x + 4, PLATE[0]);
      });
      // knee plates
      [24, 35].forEach((x) => {
        l.r(x, 52, 5, 3, PLATE[2]);
        l.p(x + 2, 53, SHINE);
      });
      // round pauldrons (the first to fall)
      if (!stage) [17, 41].forEach((x) => {
        u.ellipse(x + 3, 31, 5, 4, PLATE[1]);
        u.row(28, x + 1, x + 5, PLATE[2]);
        u.p(x + 2, 29, SHINE);
      });
      (['L', 'R'] as const).forEach((s) => {
        const [x, y, ww, hh] = P.arms[s].rect;
        w.r(x, y, ww, hh, PLATE[1]);
        w.row(y, x, x + ww - 1, PLATE[2]);
      });
      // scratches and a dent: it isn't spotless anymore
      if (stage) {
        u.line(25, 33, 29, 37, PLATE[0]);
        u.line(35, 32, 38, 35, PLATE[0]);
        u.p(27, 38, PLATE[0]);
      }
      // the breastplate split down the middle, the tunic showing through
      if (stage === 2) {
        u.col(31, 30, 41, '#3b3f5c');
        u.col(32, 30, 41, '#5b6185');
        u.line(30, 34, 28, 38, PLATE[0]);
      }
    },
    head(c) {
      const { u, fxu } = c;
      if (stage === 2) return;
      // the helm: a smooth dome over the whole head, with a cheek guard down to the chin
      u.ellipse(31.5, 17, 13, 14, PLATE[1]);
      u.r(19, 17, 26, 12, PLATE[1]);
      u.ellipse(27, 11, 6, 5, PLATE[2]);
      u.p(26, 9, SHINE);
      u.p(27, 9, SHINE);
      // the visor: a dark slit and a ridge
      u.r(21, 19, 22, 3, '#0d0c13');
      u.row(18, 20, 43, PLATE[2]);
      u.row(22, 20, 43, PLATE[0]);
      u.col(31, 23, 28, PLATE[0]);
      // breathing holes
      [25, 27, 36, 38].forEach((x) => u.p(x, 25, PLATE[0]));
      // a red plume
      u.poly([[30, 4], [34, 3], [44, 8], [46, 15], [40, 10]], PLUME[1]);
      u.line(33, 4, 44, 10, PLUME[2]);
      fxu.p(24, 20, mix(PLATE[2], '#ffffff', 0.5));
      // stage 1: a crack across the dome
      if (stage) {
        u.line(37, 7, 34, 12, PLATE[0]);
        u.line(34, 12, 38, 17, PLATE[0]);
        u.line(35, 13, 31, 15, PLATE[0]);
      }
    },
    off(c) {
      const [hx, hy] = c.P.arms.L.hand,
        cx = hx - 2,
        top = hy - 10,
        { w } = c;
      // a kite shield
      w.poly([[cx - 8, top], [cx + 8, top], [cx + 8, top + 10], [cx, top + 22], [cx - 8, top + 10]], PLATE[0]);
      w.poly([[cx - 7, top + 1], [cx + 7, top + 1], [cx + 7, top + 10], [cx, top + 20], [cx - 7, top + 10]], PLATE[1]);
      w.r(cx - 1, top + 3, 2, 14, R.gold[1]);
      w.r(cx - 5, top + 7, 10, 2, R.gold[1]);
      w.row(top + 1, cx - 7, cx + 7, PLATE[2]);
      // a chipped corner and a crack once the plates start to go
      if (stage) {
        w.poly([[cx + 4, top], [cx + 9, top], [cx + 9, top + 6]], null);
        w.line(cx + 4, top + 1, cx + 1, top + 9, PLATE[0]);
      }
    },
    weapon(c) {
      drawSword(c, PLATE, '#e2e8f0');
    },
  },
});
const KNIGHT = knightSpec(0);
const STAGES = [KNIGHT, knightSpec(1), knightSpec(2)];
/** The kid's own look, for the face that shows once the helm is off. */
const KID_FACE: Look = { sex: 'm', style: 'short', hair: 'brown', skin: 'light', head: 'manga' };

export function drawKnight(_o: unknown, frame: ClipFrame, f: number): Grid {
  return drawFigure(KNIGHT, DEFAULT_LOOK, frame, f);
}

export interface KnightBossOpts {
  /** How many plates have fallen: 0, 1 or 2 (see knightSpec). */
  stage: 0 | 1 | 2;
}

/** The Perfect Knight as the dungeon's boss: the knight at its stage, with the fallen plates
    lying at its feet. */
export function drawKnightBoss({ stage }: KnightBossOpts, frame: ClipFrame, f: number): Grid {
  const g = drawFigure(STAGES[stage], stage === 2 ? KID_FACE : DEFAULT_LOOK, frame, f),
    u = painter(g);
  // the fallen plates on the floor: a pauldron, a tasset, then the helm
  if (stage >= 1) {
    u.ellipse(9, 60, 4, 2, PLATE[1]);
    u.row(58, 7, 11, PLATE[2]);
    u.r(52, 59, 5, 3, PLATE[1]);
    u.row(59, 52, 56, PLATE[2]);
  }
  if (stage === 2) {
    u.ellipse(56, 55, 6, 5, PLATE[1]);
    u.r(51, 55, 11, 2, '#0d0c13');
    u.p(54, 52, SHINE);
    u.poly([[58, 50], [62, 49], [63, 53]], PLUME[1]);
  }
  // a glint still sweeps the plate that's left
  if (stage < 2 && f % 8 === 3) u.p(26, 32, SHINE);
  return g;
}
