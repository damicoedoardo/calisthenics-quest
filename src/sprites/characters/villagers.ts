import type { ClipFrame } from '../clips';
import { drawFigure, type Ctx, type FigureSpec, type Look } from '../engine/figure';
import type { Grid, Ramp } from '../engine/grid';
import { R } from '../palette';

/* The people of the story who stopped, like you: Lia the dancer (Mirror Lake), Sol the runner
   (the Village of Almosts), the kid inside the Perfect Knight's armor, and Tamsin, who walks the
   Ember Road. Same body and manga
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

/** After you help her: dancing again. One arm held out, a brighter leotard, a flower in her hair. */
const LEOTARD_BRIGHT: Ramp = ['#17605a', '#2aa394', '#86e6d2'];
const LIA_AFTER: FigureSpec = {
  ...LIA,
  stance: { left: 'out' },
  a: LEOTARD_BRIGHT,
  layers: {
    outfit(c) {
      top(c, LEOTARD_BRIGHT, 41);
      for (let y = 42; y <= 50; y++) {
        const k = (y - 42) / 8,
          sway = y > 46 ? (c.P.f % 4 < 2 ? 1 : 0) : 0;
        c.l.row(y, Math.round(22 - 4 * k) + sway, Math.round(41 + 4 * k) + sway, y % 3 === 0 ? LEOTARD_BRIGHT[2] : LEOTARD_BRIGHT[1]);
      }
      c.u.row(41, 22, 41, LEOTARD_BRIGHT[0]);
    },
    head(c) {
      // a flower tucked behind her ear
      const { u, fxu, P } = c;
      u.r(44, 11, 4, 4, '#f472b6');
      u.p(45, 12, '#fde047');
      u.p(46, 13, '#fde047');
      // a sparkle or two, on and off
      if (P.f % 2) fxu.p(14, 10, '#f0fdfa');
      else fxu.p(50, 20, '#f0fdfa');
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

/** After you help her: running again, in new running shoes, the jersey bright and clean. */
const JERSEY_BRIGHT: Ramp = ['#9a4a0c', '#f08a1c', '#ffc46a'];
const SOL_AFTER: FigureSpec = {
  ...SOL,
  a: JERSEY_BRIGHT,
  layers: {
    ...SOL.layers,
    outfit(c) {
      top(c, JERSEY_BRIGHT);
      c.u.row(36, 22, 41, '#f8fafc');
      c.u.r(28, 38, 8, 5, '#f8fafc');
      c.u.row(40, 30, 33, '#111827');
      // a little wind behind her, on and off
      [44, 49, 54].forEach((y, i) => (c.P.f + i) % 2 && c.fx.row(y, 8 + i, 13 + i, '#e2e8f0'));
      // the shoes off the nail: white, with an orange stripe
      [22, 34].forEach((x) => {
        c.l.r(x, 58, 8, 4, '#f8fafc');
        c.l.row(58, x, x + 7, '#ffffff');
        c.l.line(x + 1, 61, x + 6, 59, JERSEY_BRIGHT[1]);
        c.l.row(61, x, x + 7, '#94a3b8');
      });
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

/** Tamsin walks the Ember Road ahead of you: a long rust travelling coat, a green scarf, a
    pack strap across her chest, and a small lantern hung from her belt that flickers. */
const TAMSIN_LOOK: Look = { sex: 'f', style: 'pony', hair: 'red', skin: 'light', head: 'manga' };
const COAT: Ramp = ['#5a2a16', '#8e4a24', '#c27a44'];
const SCARF: Ramp = ['#1f4a32', '#2f7a4e', '#5fb07a'];

const TAMSIN: FigureSpec = {
  id: 'tamsin',
  attack: 'swing',
  a: COAT,
  legs: ['#2a2420', '#40362e', '#5a4c40'],
  layers: {
    outfit(c) {
      // the coat, down past the knees, open at the front
      top(c, COAT, 45);
      for (let y = 46; y <= 54; y++) {
        c.l.row(y, 21, 27, y % 4 === 0 ? COAT[0] : COAT[1]);
        c.l.row(y, 36, 42, y % 4 === 0 ? COAT[0] : COAT[1]);
      }
      // the pack strap, shoulder to hip
      c.u.line(24, 31, 39, 45, R.leather[0]);
      c.u.line(25, 31, 40, 45, R.leather[1]);
      // a belt, and the lantern hung from it: its glow flickers
      c.u.row(45, 22, 41, R.leather[0]);
      c.l.r(37, 47, 4, 5, R.iron[1]);
      c.l.r(38, 48, 2, 3, c.P.f % 3 ? '#fbbf24' : '#fde68a');
      c.fx.p(36 + (c.P.f % 2), 46, '#fde68a');
    },
    head(c) {
      // the scarf, wrapped twice, one end hanging
      c.u.row(28, 23, 40, SCARF[1]);
      c.u.row(29, 23, 40, SCARF[0]);
      c.u.row(27, 25, 38, SCARF[2]);
      c.u.r(25, 30, 3, 6, SCARF[1]);
    },
  },
};

/** Villagers can be drawn as they are when you meet them, or `after` you helped them. */
export interface VillagerOpts {
  after: boolean;
}

export const drawLia = (o: Partial<VillagerOpts>, frame: ClipFrame, f: number): Grid => drawFigure(o.after ? LIA_AFTER : LIA, LIA_LOOK, frame, f);
export const drawSol = (o: Partial<VillagerOpts>, frame: ClipFrame, f: number): Grid => drawFigure(o.after ? SOL_AFTER : SOL, SOL_LOOK, frame, f);
export const drawKid = (_o: unknown, frame: ClipFrame, f: number): Grid => drawFigure(KID, KID_LOOK, frame, f);
export const drawTamsin = (_o: unknown, frame: ClipFrame, f: number): Grid => drawFigure(TAMSIN, TAMSIN_LOOK, frame, f);
