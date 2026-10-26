/** Draws a pixel sprite from rows of characters; each character maps to a color, '.' is empty. */
export function Sprite({ rows, palette }: { rows: string[]; palette: Record<string, string> }) {
  return (
    <>
      {rows.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === '.' || !palette[c] ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={palette[c]} />,
        ),
      )}
    </>
  );
}

interface PixelArtProps {
  rows: string[];
  palette: Record<string, string>;
  size: number;
  className?: string;
  label: string;
}

/** A standalone sprite scaled to `size` pixels wide, crisp edges, with a little padding. */
export function PixelArt({ rows, palette, size, className, label }: PixelArtProps) {
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  return (
    <svg viewBox={`-1 -1 ${w + 2} ${h + 2}`} width={size} height={(size * (h + 2)) / (w + 2)} shapeRendering="crispEdges" className={className} role="img" aria-label={label}>
      <Sprite rows={rows} palette={palette} />
    </svg>
  );
}
