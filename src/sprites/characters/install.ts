import type { PixelArt } from './pixel';

/* The install guide's pictures (sprite `installStep`): a small phone showing where to tap for each
   step, the spot to tap ringed in gold. Drawn in code on a character grid, one character per pixel
   (see pixel.ts), so a step is easy to move or recolor. */

export type InstallStep =
  /** Safari's bottom bar, the Share button lit. */
  | 'iosShare'
  /** The share sheet, "Add to Home Screen" lit. */
  | 'iosAdd'
  /** Chrome on iPhone: the share button in the address bar at the top. */
  | 'iosChromeShare'
  /** The browser's ⋮ menu at the top right (Android). */
  | 'androidMenu'
  /** The open menu, "Install app" lit. */
  | 'androidAdd'
  /** A home screen, FORMA's icon lit. */
  | 'home'
  /** Safari's compass. */
  | 'safari';

const W = 32,
  H = 56;

const PALETTE = {
  k: '#0b0d14', // outline, ink
  f: '#4b5468', // the phone's frame
  s: '#1e293b', // screen
  l: '#475569', // page lines
  t: '#334155', // browser bars
  d: '#94a3b8', // dim icons
  w: '#e2e8f0', // sheets and menus
  m: '#cbd5e1', // rows on a sheet
  g: '#fbbf24', // the lit button
  G: '#fde68a', // the gold ring
  o: '#f97316', // FORMA's flame
  y: '#fde047', // its tip
  b: '#3b82f6',
  e: '#22c55e',
  p: '#a855f7',
  r: '#ef4444',
  c: '#06b6d4',
  W: '#ffffff',
};

type Canvas = string[][];

const blank = (w: number, h: number): Canvas => Array.from({ length: h }, () => Array<string>(w).fill('.'));
const rect = (c: Canvas, x: number, y: number, w: number, h: number, ch: string) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (c[j]?.[i] !== undefined) c[j][i] = ch;
};
/** A one-pixel box outline. */
const ring = (c: Canvas, x: number, y: number, w: number, h: number, ch: string) => {
  rect(c, x, y, w, 1, ch);
  rect(c, x, y + h - 1, w, 1, ch);
  rect(c, x, y, 1, h, ch);
  rect(c, x + w - 1, y, 1, h, ch);
};
/** Text rows stamped at (x, y); '.' leaves the canvas as it is. */
const stamp = (c: Canvas, x: number, y: number, rows: string[]) =>
  rows.forEach((row, j) => [...row].forEach((ch, i) => ch !== '.' && c[y + j]?.[x + i] !== undefined && (c[y + j][x + i] = ch)));

// The iOS share button: a box with an arrow out of its top.
const SHARE = ['..g..', '.ggg.', 'g.g.g', '..g..', 'gg.gg', 'g...g', 'ggggg'];
// "Add to Home Screen": a square with a plus.
const ADD = ['kkkkkkk', 'k.....k', 'k..k..k', 'k.kkk.k', 'k..k..k', 'k.....k', 'kkkkkkk'];
// "Install app": a phone with an arrow down into it.
const INSTALL = ['.kkkkk.', '.k.k.k.', '.k.k.k.', '.kkkkk.', '.k...k.', '.k...k.', '.kkkkk.'];
// FORMA's icon: a small flame on ink.
const FORMA = ['kkkkkk', 'kk.okk', 'kkooyk', 'koyyok', 'kooook', 'kkkkkk'];

/** The phone: frame, notch, screen, home bar. */
function phone(): Canvas {
  const c = blank(W, H);
  rect(c, 1, 0, W - 2, H, 'k');
  rect(c, 0, 1, W, H - 2, 'k');
  rect(c, 1, 1, W - 2, H - 2, 'f');
  rect(c, 2, 3, W - 4, H - 6, 's');
  rect(c, 12, 3, 8, 2, 'k');
  rect(c, 11, H - 4, 10, 1, 'd');
  return c;
}

/** A web page's lines, from row y down to row `to`. */
function page(c: Canvas, y: number, to: number) {
  const lengths = [18, 22, 14, 20, 24, 10, 22, 16, 20, 12];
  rect(c, 5, y, 12, 2, 'd');
  for (let j = y + 4, n = 0; j <= to; j += 3, n++) rect(c, 5, j, lengths[n % lengths.length], 1, 'l');
}

function draw(step: InstallStep): Canvas {
  const c = phone();
  switch (step) {
    case 'iosShare': {
      page(c, 7, 38);
      // Safari's bottom bar: the address, then back, forward, share, bookmarks, tabs.
      rect(c, 2, 41, W - 4, 9, 't');
      rect(c, 5, 42, W - 10, 2, 'l');
      stamp(c, 4, 46, ['.d', 'd.', '.d']);
      stamp(c, 9, 46, ['d.', '.d', 'd.']);
      stamp(c, 14, 43, SHARE);
      ring(c, 12, 41, 9, 10, 'G');
      ring(c, 20, 46, 3, 3, 'd');
      rect(c, 25, 46, 3, 3, 'd');
      return c;
    }
    case 'iosAdd': {
      page(c, 7, 14);
      // The share sheet slides up; its fourth row is the one.
      rect(c, 2, 17, W - 4, H - 20, 'w');
      rect(c, 13, 18, 6, 1, 'd');
      for (const y of [21, 27, 33]) {
        rect(c, 5, y, 5, 5, 'm');
        rect(c, 12, y + 2, 12, 1, 'm');
      }
      rect(c, 3, 39, W - 6, 9, 'G');
      ring(c, 3, 39, W - 6, 9, 'g');
      stamp(c, 5, 40, ADD);
      rect(c, 14, 42, 13, 1, 'k');
      rect(c, 14, 44, 9, 1, 'k');
      return c;
    }
    case 'iosChromeShare': {
      // Chrome's address bar on top, its share button at the right end.
      rect(c, 2, 5, W - 4, 10, 't');
      rect(c, 4, 8, 16, 3, 'l');
      stamp(c, 23, 6, SHARE);
      ring(c, 21, 5, 9, 10, 'G');
      page(c, 18, 48);
      return c;
    }
    case 'androidMenu': {
      rect(c, 2, 5, W - 4, 8, 't');
      rect(c, 4, 7, 19, 4, 'l');
      for (const y of [7, 9, 11]) rect(c, 26, y - 1, 2, 1, 'g');
      ring(c, 24, 4, 6, 10, 'G');
      page(c, 16, 48);
      return c;
    }
    case 'androidAdd': {
      rect(c, 2, 5, W - 4, 8, 't');
      rect(c, 4, 7, 19, 4, 'l');
      page(c, 16, 48);
      // The menu drops from the top right; "Install app" sits among its rows.
      rect(c, 9, 6, 20, 38, 'k');
      rect(c, 10, 7, 18, 36, 'w');
      for (const y of [9, 14, 19, 36]) {
        rect(c, 12, y, 3, 3, 'm');
        rect(c, 17, y + 1, 9, 1, 'm');
      }
      rect(c, 10, 25, 18, 9, 'G');
      ring(c, 10, 25, 18, 9, 'g');
      stamp(c, 10, 26, INSTALL);
      rect(c, 18, 28, 8, 1, 'k');
      rect(c, 18, 30, 6, 1, 'k');
      return c;
    }
    case 'home': {
      // Apps in rows of four, FORMA's ringed in gold; the dock at the bottom.
      const colors = 'bepcrbgepcbrecpb';
      let n = 0;
      for (let row = 0; row < 4; row++)
        for (let col = 0; col < 4; col++) {
          const x = 4 + col * 6,
            y = 8 + row * 8;
          if (row === 2 && col === 1) {
            stamp(c, x - 1, y - 1, FORMA);
            ring(c, x - 2, y - 2, 8, 8, 'G');
            ring(c, x - 3, y - 3, 10, 10, 'g');
          } else rect(c, x, y, 4, 4, colors[n++ % colors.length]);
        }
      rect(c, 3, 42, W - 6, 8, 't');
      for (let col = 0; col < 4; col++) rect(c, 6 + col * 6, 44, 4, 4, colors[(col * 3) % colors.length]);
      return c;
    }
    case 'safari': {
      const s = blank(16, 16);
      stamp(s, 0, 0, [
        '.....kkkkkk.....',
        '...kkbbbbbbkk...',
        '..kbbcbbbbcbbk..',
        '.kbbbbbbbbbbrbk.',
        '.kbcbbbbbbbrrbk.',
        'kbbbbbbbbbrrrbbk',
        'kbbbbbbbbrrrbbbk',
        'kcbbbbbbrkrbbbck',
        'kbbbbbbrkrbbbbbk',
        'kbbbbbWWWbbbbbbk',
        'kbbbbWWWbbbbbbbk',
        '.kbbWWWbbbbbcbk.',
        '.kbWWbbbbbbbbbk.',
        '..kbbcbbbbcbbk..',
        '...kkbbbbbbkk...',
        '.....kkkkkk.....',
      ]);
      return s;
    }
  }
}

/** One step's picture. */
export function installStepArt(step: InstallStep): PixelArt {
  return { rows: draw(step).map((r) => r.join('')), palette: PALETTE };
}
