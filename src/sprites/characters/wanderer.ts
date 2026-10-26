import type { ClipFrame } from '../clips';
import { drawFigure, type FigureSpec } from '../engine/figure';
import type { Grid } from '../engine/grid';
import { DEFAULT_LOOK } from './hero';
import { HOOD, LANTERN, R } from '../palette';

/* The Wanderer: a hooded stranger with a lantern and a walking staff. (Your Best Self, though the
   story keeps that quiet.) The face is hidden in the hood, so the base hair is off. */

const ROPE = { light: '#8c7350', dark: '#5a4630' };

const WANDERER: FigureSpec = {
  id: 'wanderer',
  attack: 'swing',
  a: HOOD,
  legs: ['#15131c', '#211e2c', '#2f2b3c'],
  glove: ['#2a2638', '#4a4560', '#6a6480'],
  hideHair: true,
  layers: {
    back(c) {
      for (let y = 28; y <= 61; y++) {
        const k = (y - 28) / 33;
        c.l.row(y, Math.round(18 - 7 * k), Math.round(45 + 7 * k), HOOD[0]);
      }
    },
    outfit(c) {
      const { u, l, w, P } = c;
      for (let y = 30; y <= 45; y++) {
        u.row(y, 20, 43, HOOD[1]);
        u.p(20, y, HOOD[2]);
        u.p(43, y, HOOD[0]);
      }
      for (let y = 44; y <= 60; y++) {
        const k = (y - 44) / 16,
          x0 = Math.round(20 - 3 * k),
          x1 = Math.round(43 + 3 * k);
        l.row(y, x0, x1, HOOD[1]);
        l.p(x0, y, HOOD[2]);
      }
      l.col(31, 46, 60, HOOD[0]);
      u.row(41, 21, 42, ROPE.light);
      u.row(42, 21, 42, ROPE.dark);
      u.r(33, 42, 2, 5, ROPE.light);
      (['L', 'R'] as const).forEach((s) => {
        const [x, y, ww, hh] = P.arms[s].rect;
        w.r(x - 1, y, ww + 2, hh, HOOD[1]);
        w.col(x - 1, y, y + hh - 1, HOOD[2]);
      });
    },
    head(c) {
      const { u, fxu } = c;
      u.ellipse(31.5, 17, 17, 16, HOOD[1]);
      u.poly(
        [
          [21, 7],
          [31, -1],
          [42, 7],
        ],
        HOOD[1],
      );
      u.poly(
        [
          [13, 25],
          [50, 25],
          [46, 34],
          [17, 34],
        ],
        HOOD[1],
      );
      u.ellipse(24, 10, 6, 5, HOOD[2]);
      u.ellipse(31.5, 22, 12, 10.5, HOOD[2]);
      u.ellipse(31.5, 22.5, 10.5, 9, '#0d0c13');
      fxu.r(25, 21, 3, 2, LANTERN.light);
      fxu.p(26, 21, LANTERN.hot);
      fxu.r(36, 21, 3, 2, LANTERN.light);
      fxu.p(37, 21, LANTERN.hot);
    },
    off(c) {
      const { w, fx, P } = c,
        [hx, hy] = P.arms.L.hand,
        I = R.iron;
      w.col(hx + 1, hy + 3, hy + 5, I[1]);
      w.r(hx - 2, hy + 5, 8, 2, I[0]);
      w.r(hx - 1, hy + 7, 6, 7, LANTERN.light);
      w.r(hx, hy + 8, 4, 5, LANTERN.bright);
      w.col(hx - 2, hy + 7, hy + 13, I[1]);
      w.col(hx + 5, hy + 7, hy + 13, I[1]);
      w.r(hx - 2, hy + 14, 8, 2, I[0]);
      const cx = hx + 1.5,
        cy = hy + 10;
      for (let a = 0; a < 360; a += 30) {
        const r = (a * Math.PI) / 180;
        if ((a / 30 + P.f) % 2) fx.p(cx + 9 * Math.cos(r), cy + 9 * Math.sin(r), LANTERN.ember);
      }
      fx.p(cx, cy - 1, '#ffffff');
    },
    weapon(c) {
      const { w, P } = c,
        Wd = R.wood,
        [hx, hy] = P.arms.R.hand,
        wx = hx + 4;
      w.r(hx + 4, hy + 1, 1, 2, Wd[1]);
      w.r(wx, hy - 30, 3, 46, Wd[1]);
      w.col(wx, hy - 30, hy + 15, Wd[2]);
      w.col(wx + 2, hy - 30, hy + 15, Wd[0]);
      w.r(wx - 1, hy - 33, 5, 4, Wd[1]);
      w.row(hy - 33, wx - 1, wx + 3, Wd[2]);
    },
  },
};

export function drawWanderer(_o: unknown, frame: ClipFrame, f: number): Grid {
  return drawFigure(WANDERER, DEFAULT_LOOK, frame, f);
}
