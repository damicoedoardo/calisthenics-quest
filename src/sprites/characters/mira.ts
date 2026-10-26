import type { ClipFrame } from '../clips';
import { drawFigure, type Ctx, type FigureSpec, type Look } from '../engine/figure';
import type { Grid } from '../engine/grid';
import { R } from '../palette';

/* Mira the Smith: she turns your effort into steel. Same body and manga head as the hero, with a
   soot-dark shirt, a leather apron and her forge hammer. Her "attack" is a hammer strike. */

export const MIRA_LOOK: Look = { sex: 'f', style: 'pony', hair: 'red', skin: 'tan', head: 'manga' };

const SHIRT = ['#1f1d26', '#34313f', '#4c4859'];
const APRON = R.leather;
const SPARK = { hot: '#fff3c4', warm: '#fbbf24', ember: '#f97316' };

function hammer(c: Ctx) {
  const { w, fx, P } = c,
    [hx, hy] = P.arms.R.hand,
    Wd = R.wood,
    I = R.iron;
  if (P.right === 'up') {
    // raised over the shoulder
    w.thick(hx + 2, hy + 2, hx + 11, hy - 11, 2, Wd[1]);
    w.thick(hx + 7, hy - 16, hx + 17, hy - 8, 6, I[1]);
    w.line(hx + 8, hy - 18, hx + 18, hy - 10, I[2]);
  } else if (P.right === 'fwd') {
    // the blow lands
    w.thick(hx + 2, hy + 1, hx + 13, hy + 3, 2, Wd[1]);
    w.r(hx + 11, hy - 3, 6, 10, I[1]);
    w.col(hx + 11, hy - 3, hy + 6, I[2]);
    if (P.fx === 'slash')
      [
        [hx + 19, hy + 1, SPARK.hot],
        [hx + 21, hy - 2, SPARK.warm],
        [hx + 22, hy + 4, SPARK.ember],
        [hx + 18, hy - 5, SPARK.warm],
        [hx + 24, hy + 1, SPARK.ember],
      ].forEach(([x, y, col]) => fx.p(x as number, y as number, col as string));
  } else {
    // resting head-down at her side
    w.r(hx + 1, hy - 1, 2, 9, Wd[1]);
    w.col(hx + 1, hy - 1, hy + 7, Wd[2]);
    w.r(hx - 2, hy + 8, 8, 6, I[1]);
    w.row(hy + 8, hx - 2, hx + 5, I[2]);
    w.col(hx - 2, hy + 8, hy + 13, I[2]);
  }
}

const MIRA: FigureSpec = {
  id: 'mira',
  attack: 'swing',
  a: SHIRT,
  legs: ['#2a1d14', '#3e2c1f', '#5a4230'],
  glove: APRON,
  glow: SPARK.warm,
  layers: {
    outfit(c) {
      const { u, w, P } = c;
      for (let y = 30; y <= 47; y++) {
        const [x0, x1] = y <= 45 ? c.torsoRange(y) : [21, 42];
        u.row(y, x0, x1, SHIRT[1]);
        u.p(x0, y, SHIRT[2]);
        u.p(x1, y, SHIRT[0]);
      }
      u.r(30, 30, 4, 3, c.skin[1]);
      u.row(30, 30, 33, c.skin[0]);
      // apron: straps, bib, skirt over the thighs
      u.col(27, 30, 34, APRON[1]);
      u.col(36, 30, 34, APRON[1]);
      u.r(26, 34, 12, 18, APRON[1]);
      u.col(26, 34, 51, APRON[2]);
      u.col(37, 34, 51, APRON[0]);
      u.row(51, 26, 37, APRON[0]);
      u.r(29, 41, 6, 4, APRON[0]);
      u.row(41, 29, 34, APRON[2]);
      u.col(33, 38, 40, R.iron[2]);
      u.row(43, 21, 42, R.leather[0]);
      u.r(30, 43, 4, 1, R.bronze[2]);
      // rolled sleeves
      (['L', 'R'] as const).forEach((s) => {
        const [x, y, ww, hh] = P.arms[s].rect;
        w.r(x, y, ww, Math.min(3, hh), SHIRT[1]);
        w.row(y + Math.min(3, hh) - 1, x, x + ww - 1, SHIRT[2]);
      });
    },
    weapon: hammer,
  },
};

export function drawMira(_o: unknown, frame: ClipFrame, f: number): Grid {
  return drawFigure(MIRA, MIRA_LOOK, frame, f);
}
