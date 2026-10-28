// The pixel art in the sign-in email, as PNGs in public/email/ (email apps show hosted images,
// not the app's canvas sprites): the camp by the lake with the hero and the flame, and the flame
// alone for the signature, drawn from the game's own sprites; and the FORMA title in the pixel
// font as a picture, since Gmail and most email apps don't load web fonts.
//
//   node scripts/email-art.mjs        (needs Playwright with Chromium)
import { writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

register('./ts-hooks.mjs', import.meta.url);
const { framesFor } = await import('../src/sprites/registry.ts');
const { drawPlace } = await import('../src/sprites/places.ts');
const { PLACES } = await import('../src/story/places.ts');
const { STARTER_LOOKS } = await import('../src/sprites/characters/hero.ts');

const K = 3; // screen pixels per art pixel
const W = 186, TOP = 44; // the banner: the place's width, and the rows cut off its sky

const place = drawPlace(PLACES['lake-camp'], true, { w: W, st: 48 });
const hero = framesFor('hero', 'idle', { look: STARTER_LOOKS.m })[0];
const heroine = framesFor('hero', 'idle', { look: STARTER_LOOKS.f })[0];
const flame = framesFor('ember', 'idle', { stage: 'torch', mood: 'happy' })[0];

/** Stamps sprites onto a copy of the place, by their top-left corner. */
function scene(base, layers) {
  const g = base.map((row) => [...row]);
  for (const { s, x, y, flip } of layers)
    s.forEach((row, sy) =>
      row.forEach((c, sx) => {
        const gx = x + (flip ? row.length - 1 - sx : sx), gy = y + sy;
        if (c && g[gy] && gx >= 0 && gx < g[gy].length) g[gy][gx] = c;
      }),
    );
  return g.slice(TOP);
}

const banner = scene(place, [
  { s: hero, x: 6, y: 96 },
  { s: heroine, x: 116, y: 96, flip: true },
  { s: flame, x: 61, y: 44 },
]);

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(grid, file, k = K) {
  const data = await page.evaluate(({ grid, k }) => {
    const h = grid.length, w = grid[0].length, cv = document.createElement('canvas');
    cv.width = w * k;
    cv.height = h * k;
    const ctx = cv.getContext('2d');
    grid.forEach((row, y) => row.forEach((c, x) => { if (c) { ctx.fillStyle = c; ctx.fillRect(x * k, y * k, k, k); } }));
    return cv.toDataURL('image/png').split(',')[1];
  }, { grid, k });
  writeFileSync(new URL(`../public/email/${file}`, import.meta.url), Buffer.from(data, 'base64'));
  console.log('wrote public/email/' + file);
}
await png(banner, 'camp.png');
await png(flame, 'ember.png', 2);

// The title, on the email card's color, at 2x for sharp phone screens.
const title = await browser.newPage({ viewport: { width: 400, height: 120 }, deviceScaleFactor: 2 });
await title.setContent(`<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=block" rel="stylesheet">
<style>
  body { margin: 0; background: #121624; }
  #t { display: inline-block; padding: 8px 12px; text-align: center; background: #121624; }
  h1 { margin: 0; font: 400 24px 'Press Start 2P', monospace; letter-spacing: 3px; color: #fbbf24; text-shadow: 0 3px 0 #b45309; }
  p { margin: 12px 0 0; font: 400 10px 'Press Start 2P', monospace; color: #94a3b8; }
</style></head><body><div id="t"><h1>FORMA</h1><p>The Road Back</p></div></body></html>`, { waitUntil: 'networkidle' });
await title.evaluate(() => document.fonts.ready);
await title.locator('#t').screenshot({ path: new URL('../public/email/title.png', import.meta.url).pathname });
console.log('wrote public/email/title.png');
await browser.close();
