import { grid, painter, type Grid } from '../engine/grid';

/* Small sprites drawn as text: each character is one pixel, mapped to a color by the sprite's
   palette; '.' is empty. Edit the rows to redraw them. These are the chapter cast that hasn't
   moved to 64x64 yet. */

export interface PixelArt {
  rows: string[];
  palette: Record<string, string>;
}

/** The rows as a grid with a 1-pixel margin, so outlines and scaling have room. */
export function drawPixelArt({ rows, palette }: PixelArt): Grid {
  const w = Math.max(...rows.map((r) => r.length)),
    g = grid(w + 2, rows.length + 2),
    p = painter(g);
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== '.' && palette[ch] && p.p(x + 1, y + 1, palette[ch])));
  return g;
}

const MIRA_ROWS = [
  '.....RRRRRR.....',
  '....RRRRRRRR....',
  '...RRSSSSSSRR...',
  '...RSESSSSESR...',
  '...RSSSSSSSSR...',
  '...RRSSmmSSRR...',
  '....R.SSSS.R....',
  '...LLLLLLLLLL...',
  '..LLLAAAAAALLL..',
  '..SLLAAAAAALLS..',
  '..S.LAAAAAAL.S..',
  '..S.LAAAAAAL.S..',
  '..S.LAAAAAAL.S..',
  '....LAAAAAAL....',
  '....PPP..PPP....',
  '...BBBB..BBBB...',
];

const BOOK_ROWS = [
  '.LLLLLLLLLLLLLL.',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  '.LLLLLLLLLLLLLL.',
  '.......LL.......',
];

const SLIME_ROWS = [
  '......GGGG......',
  '....GGGGGGGG....',
  '...GGgGGGGGGG...',
  '..GGGGGGGGGGGG..',
  '..GGkGGGGGGkGG..',
  '.GGGkGGGGGGkGGG.',
  '.GGGGGGmmGGGGGG.',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGG',
  '.GGGGGGGGGGGGGG.',
];

const MIRROR_ROWS = [
  '...DDDDDD...',
  '..DggggggD..',
  '.DgGggggggD.',
  '.DgGggggggD.',
  '.DggggwgggD.',
  '.DgggwggggD.',
  '.DggwgggggD.',
  '.DgggggrggD.',
  '.DggggrrggD.',
  '.DggggggggD.',
  '..DggggggD..',
  '...DDDDDD...',
  '.....DD.....',
  '....DDDD....',
];

const GOLEM_ROWS = [
  '.....SSSSSS.....',
  '....SsSSSSsS....',
  '....SSrSSrSS....',
  '....SSSSSSSS....',
  '..SSSSSSSSSSSS..',
  '.SSSsSSSSSSsSSS.',
  'SSSSSSSSSSSSSSSS',
  'SSS.SSSSSSSS.SSS',
  'SS..SSSsSSSS..SS',
  'SS..SSSSSSSS..SS',
  '....SSS..SSS....',
  '...SSSS..SSSS...',
];

const SUMMIT_ROWS = [
  '.......F........',
  '.......FFF......',
  '.......F........',
  '......WWW.......',
  '.....WWWWW......',
  '....WWMMMWW.....',
  '...WMMMMMMMW....',
  '..MMMMMMMMMMM...',
  '.MMMMMMMMMMMMM..',
  'MMMMMMMMMMMMMMM.',
];

export const MIRA: PixelArt = {
  rows: MIRA_ROWS,
  palette: { R: '#b91c1c', S: '#e7c9a9', E: '#111', m: '#9f1239', L: '#78350f', A: '#a16207', P: '#1f2937', B: '#0f172a' },
};
export const BOOK: PixelArt = { rows: BOOK_ROWS, palette: { L: '#78350f', p: '#f5ecd7' } };
export const SLIME: PixelArt = { rows: SLIME_ROWS, palette: { G: '#64748b', g: '#94a3b8', k: '#0f172a', m: '#0f172a' } };
export const MIRROR: PixelArt = { rows: MIRROR_ROWS, palette: { D: '#a16207', g: '#1e293b', G: '#334155', w: '#e2e8f0', r: '#ef4444' } };
export const GOLEM: PixelArt = { rows: GOLEM_ROWS, palette: { S: '#78716c', s: '#57534e', r: '#f59e0b' } };
export const SUMMIT: PixelArt = { rows: SUMMIT_ROWS, palette: { F: '#fbbf24', W: '#f8fafc', M: '#475569' } };
