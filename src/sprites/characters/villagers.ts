import type { ClipFrame } from '../clips';
import { drawFigure, type Ctx, type FigureSpec, type Look } from '../engine/figure';
import type { Grid, Ramp } from '../engine/grid';
import { R } from '../palette';

/* The people of the story who stopped, like you: Lia the dancer (Mirror Lake), Sol the runner
   (the Village of Almosts), and the kid inside the Perfect Knight's armor. Same body and manga
   head as the hero, in their own clothes. */

/** A plain top, sleeves and a hem, in one ramp. */
function top(c: Ctx, A: Ramp, to = 45) {
  const { u, w, P } = c;
  for (let y = 30; y <= to; y++) {
    const [x0, x1] = c.torsoRange(y);
    u.row(y, x0, x1, A[1]);
    u.p(x0, y, A[2]);
    u.p(x1, y, A[0]);
  }
  u.r(30, 30, 4, 3, c.skin[1]);
  u.row(30, 30, 33, c.skin[0]);
  (['L', 'R'] as const).forEach((s) => {
    const [x, y, ww, hh] = P.arms[s].rect;
    w.r(x, y, ww, Math.min(3, hh), A[1]);
    w.row(y, x, x + ww - 1, A[2]);
  });
}

const LIA_LOOK: Look = { sex: 'f', style: 'long', hair: 'black', skin: 'deep', head: 'manga' };
const LEOTARD = R.teal;

const LIA: FigureSpec = {
  id: 'lia',
  attack: 'swing',
  a: LEOTARD,
  legs: ['#1f2937', '#374151', '#4b5563'],
  layers: {
    outfit(c) {
      top(c, LEOTARD, 41);
      // a wrap skirt that flares a little
      for (let y = 42; y <= 50; y++) {
        const k = (y - 42) / 8;
        c.l.row(y, Math.round(22 - 4 * k), Math.round(41 + 4 * k), y % 3 === 0 ? LEOTARD[2] : LEOTARD[1]);
      }
      c.u.row(41, 22, 41, LEOTARD[0]);
    },
  },
};

const SOL_LOOK: Look = { sex: 'f', style: 'pony', hair: 'blonde', skin: 'tan', head: 'manga' };
const JERSEY = R.orange;

const SOL: FigureSpec = {
  id: 'sol',
  attack: 'swing',
  a: JERSEY,
  legs: ['#111827', '#1f2937', '#374151'],
  layers: {
    outfit(c) {
      top(c, JERSEY);
      // a white stripe and a race number
      c.u.row(36, 22, 41, '#f8fafc');
      c.u.r(28, 38, 8, 5, '#f8fafc');
      c.u.row(40, 30, 33, '#111827');
      // running shorts
      c.l.r(22, 46, 20, 5, '#1f2937');
      c.l.row(46, 22, 41, '#374151');
    },
    head(c) {
      // a sweatband
      c.u.row(9, 20, 43, '#f8fafc');
      c.u.row(10, 20, 43, '#e2e8f0');
    },
  },
};

const KID_LOOK: Look = { sex: 'm', style: 'short', hair: 'brown', skin: 'light', head: 'manga' };
const TUNIC: Ramp = ['#3b3f5c', '#5b6185', '#8a90b4'];

const KID: FigureSpec = {
  id: 'kid',
  attack: 'swing',
  a: TUNIC,
  legs: ['#2e2a24', '#4a4236', '#6a5e4a'],
  layers: {
    outfit(c) {
      // a tunic a size too big, sleeves past the elbows
      top(c, TUNIC, 49);
      c.l.row(49, 21, 42, TUNIC[0]);
    },
  },
};

export const drawLia = (_o: unknown, frame: ClipFrame, f: number): Grid => drawFigure(LIA, LIA_LOOK, frame, f);
export const drawSol = (_o: unknown, frame: ClipFrame, f: number): Grid => drawFigure(SOL, SOL_LOOK, frame, f);
export const drawKid = (_o: unknown, frame: ClipFrame, f: number): Grid => drawFigure(KID, KID_LOOK, frame, f);
