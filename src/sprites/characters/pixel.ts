import { grid, painter, type Grid, type Painter } from '../engine/grid';

/* Sprites drawn as text: each character is one pixel, mapped to a color by the sprite's palette;
   '.' is empty. The dungeon's monsters are drawn this way at 32x32 and doubled with Scale2x (one
   character is two sprite pixels), the same as the hero's body. */

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

/** Paints text rows with their top-left corner at (x, y). Characters missing from the palette are
    left empty, so one set of rows can hold parts that only some frames show. */
export function paintRows(p: Painter, rows: string[], palette: Record<string, string>, x = 0, y = 0) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => palette[ch] && p.p(x + i, y + j, palette[ch])));
}

/** The grid moved by (dx, dy), same size; what falls off the edge is dropped. */
export function shifted(g: Grid, dx: number, dy: number): Grid {
  const h = g.length,
    w = g[0].length,
    out = grid(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const c = g[y][x],
        X = x + dx,
        Y = y + dy;
      if (c && X >= 0 && X < w && Y >= 0 && Y < h) out[Y][X] = c;
    }
  return out;
}
