import { grid, painter, type Grid } from '../engine/grid';

/* Small sprites drawn as text: each character is one pixel, mapped to a color by the sprite's
   palette; '.' is empty. Handy for quick placeholders; the main cast is drawn at 64x64 in its own
   files. */

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
