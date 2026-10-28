// The app icon: the pixel "F" of the FORMA wordmark, gold with an amber drop shadow and a dark
// outline, on the night tile. Drawn on a small grid and scaled by whole numbers only, so every
// pixel stays a sharp square at every size.
//
//   node scripts/icons.cjs            (needs Playwright with Chromium)
//   node scripts/icons.cjs --sheet    (also writes icons-sheet.png: every take side by side)
//
// Writes src/app/icon.svg (browser tab), src/app/apple-icon.png (180, iPhone home screen),
// public/icon-192.png, public/icon-512.png and public/icon-maskable-512.png (Android, install).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const C = {
  night: '#0b0d14',
  tile: '#181c2b',
  rim: '#30375a',
  outline: '#1c0f05',
  gold: '#fbbf24',
  light: '#fde68a',
  amber: '#b45309',
  deep: '#78350f',
  flame: '#f97316',
  ember: '#fde68a',
};

// The F of Press Start 2P (the wordmark's font): 7 wide, 7 tall, a 2 wide stem.
const F = ['#######', '##.....', '##.....', '######.', '##.....', '##.....', '##.....'];

// A small flame, the fire that is lit each day you show up.
const FLAME = ['..e..', '.eff.', '.fef.', 'fffff', '.fff.'];

/** Paint `rows` (chars mapped by `key`) onto the grid at (x, y), each char `s` cells square. */
function stamp(grid, rows, x, y, key, s = 1) {
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      const color = key[ch];
      if (!color) return;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) set(grid, x + i * s + dx, y + j * s + dy, color);
    }),
  );
}

function set(grid, x, y, color) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = color;
}

/** The F with its shadow and outline, `s` cells per font pixel, top left at (x, y). */
function drawF(grid, x, y, s, shadow) {
  const n = grid.length;
  const mask = Array.from({ length: n }, () => Array(n).fill(false));
  F.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== '#') return;
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
        const gx = x + i * s + dx, gy = y + j * s + dy;
        if (gy < n && gx < n) mask[gy][gx] = true;
      }
    }),
  );
  const on = (gx, gy) => gy >= 0 && gy < n && gx >= 0 && gx < n && mask[gy][gx];
  // Shadow: the letter dropped `shadow` cells down, like the wordmark's text-shadow.
  const shade = (gx, gy) => [...Array(shadow)].some((_, k) => on(gx, gy - k - 1));
  const body = (gx, gy) => on(gx, gy) || shade(gx, gy);
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
    if (body(gx, gy)) continue;
    const near = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => body(gx + dx, gy + dy)));
    if (near) grid[gy][gx] = C.outline;
  }
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
    if (on(gx, gy)) {
      // Lit from the top left: the top and left edge cells are light gold.
      grid[gy][gx] = !on(gx, gy - 1) || !on(gx - 1, gy) ? C.light : C.gold;
    } else if (shade(gx, gy)) {
      grid[gy][gx] = shade(gx, gy + 1) || on(gx, gy + 1) ? C.amber : C.deep;
    }
  }
}

function blank(n, color) {
  return Array.from({ length: n }, () => Array(n).fill(color));
}

/** A rounded tile frame: the rim one cell in from the edge, corners cut. */
function frame(grid, inset, color) {
  const n = grid.length, a = inset, b = n - 1 - inset;
  for (let i = a + 1; i < b; i++) {
    set(grid, i, a, color);
    set(grid, i, b, color);
    set(grid, a, i, color);
    set(grid, b, i, color);
  }
}

// The takes. Each returns a square grid of colors; the grid's edge cells are the background.
const TAKES = {
  // A: the wordmark's F alone on night, one cell per font pixel: big, chunky pixels.
  chunky() {
    const g = blank(13, C.night);
    drawF(g, 3, 2, 1, 1);
    return g;
  },
  // B: the same F at twice the detail, with room around it.
  title() {
    const g = blank(24, C.night);
    drawF(g, 5, 4, 2, 2);
    return g;
  },
  // C: the F with the day's flame in its corner, on the card navy with a pixel rim.
  flame() {
    const g = blank(24, C.night);
    for (let y = 3; y < 21; y++) for (let x = 3; x < 21; x++) g[y][x] = C.tile;
    frame(g, 2, C.rim);
    drawF(g, 5, 4, 2, 2);
    stamp(g, FLAME, 13, 15, { e: C.ember, f: C.flame }, 1);
    return g;
  },
  // D: the F as a quest badge: a gold framed slot, like an earned item.
  badge() {
    const g = blank(26, C.night);
    for (let y = 2; y < 24; y++) for (let x = 2; x < 24; x++) g[y][x] = C.tile;
    frame(g, 1, C.amber);
    frame(g, 2, C.gold);
    drawF(g, 6, 5, 2, 2);
    return g;
  },
};

const PICK = 'title';

/** SVG of a grid, one unit per cell. */
function svg(grid) {
  const n = grid.length;
  let rects = '';
  grid.forEach((row, y) => {
    let x = 0;
    while (x < n) {
      let w = 1;
      while (x + w < n && row[x + w] === row[x]) w++;
      if (row[x] !== grid[0][0]) rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${row[x]}"/>`;
      x += w;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="${grid[0][0]}"/>${rects}</svg>`;
}

/** HTML that draws `grid` at `size` px with whole-number cells, centered on its background. */
function page(grid, size, safe = 1) {
  const n = grid.length;
  const cell = Math.max(1, Math.floor((size * safe) / n));
  const off = Math.floor((size - cell * n) / 2);
  const cells = grid
    .flatMap((row, y) => row.map((c, x) => (c === grid[0][0] ? '' : `<i style="left:${off + x * cell}px;top:${off + y * cell}px;background:${c}"></i>`)))
    .join('');
  return `<!doctype html><html><head><style>
    html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:${grid[0][0]}}
    i{position:absolute;width:${cell}px;height:${cell}px}
  </style></head><body>${cells}</body></html>`;
}

async function png(browser, grid, size, out, safe) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(grid, size, safe));
  await p.screenshot({ path: out });
  await p.close();
  console.log('wrote', path.relative(process.cwd(), out));
}

(async () => {
  const root = path.join(__dirname, '..');
  const grid = TAKES[PICK]();
  const browser = await chromium.launch();
  fs.writeFileSync(path.join(root, 'src/app/icon.svg'), svg(grid));
  await png(browser, grid, 180, path.join(root, 'src/app/apple-icon.png'));
  await png(browser, grid, 192, path.join(root, 'public/icon-192.png'));
  await png(browser, grid, 512, path.join(root, 'public/icon-512.png'));
  // Android crops a maskable icon to a circle as small as 80% of it: keep the art inside that.
  await png(browser, grid, 512, path.join(root, 'public/icon-maskable-512.png'), 0.8);

  if (process.argv.includes('--sheet')) {
    const tiles = Object.entries(TAKES)
      .map(([name, take]) => {
        const g = take();
        const cell = Math.floor(180 / g.length);
        const art = g
          .flatMap((row, y) => row.map((c, x) => `<i style="left:${x * cell}px;top:${y * cell}px;width:${cell}px;height:${cell}px;background:${c}"></i>`))
          .join('');
        const small = svg(g);
        return `<figure><div class="ic" style="width:${cell * g.length}px;height:${cell * g.length}px">${art}</div>
          <img class="home" src="data:image/svg+xml;utf8,${encodeURIComponent(small)}"><img class="tab" src="data:image/svg+xml;utf8,${encodeURIComponent(small)}">
          <figcaption>${name}</figcaption></figure>`;
      })
      .join('');
    const p = await browser.newPage({ viewport: { width: 960, height: 330 }, deviceScaleFactor: 2 });
    await p.setContent(`<!doctype html><style>
      body{margin:0;padding:24px;background:#3a3f55;display:flex;gap:40px;font:600 16px system-ui;color:#fff}
      figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:12px}
      .ic{position:relative;border-radius:22%;overflow:hidden}.ic i{position:absolute}
      .home{width:60px;height:60px;border-radius:22%;image-rendering:pixelated}
      .tab{width:16px;height:16px;image-rendering:pixelated}
      img{display:inline-block}
    </style><body>${tiles}</body>`);
    await p.screenshot({ path: path.join(root, 'icons-sheet.png') });
    await p.close();
  }
  await browser.close();
})();
