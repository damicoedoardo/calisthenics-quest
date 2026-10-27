// iOS launch screens (apple-touch-startup-image) for the common iPhones, drawn like the title
// screen: the FORMA wordmark in the pixel font on the app's ink background. iOS shows one only
// when its size matches the phone exactly, hence one per screen size.
//
//   node scripts/splash.cjs        (needs Playwright with Chromium, and a network for the font)
//
// Writes public/splash/<width>x<height>.png for each size in src/app/splash-sizes.json, which the
// layout also reads to link them.
const path = require('path');
const { chromium } = require('playwright');
const { SPLASH } = require('../src/app/splash-sizes.json');

const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Geist:wght@400&display=block" rel="stylesheet">
<style>
  html, body { margin: 0; height: 100%; background: #0b0d14; }
  body { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
  h1 { margin: 0; font: 400 36px 'Press Start 2P', monospace; letter-spacing: 3px; color: #fbbf24; text-shadow: 0 4px 0 #b45309; }
  p { margin: 0; font: 400 12px 'Press Start 2P', monospace; color: #94a3b8; }
</style></head><body><h1>FORMA</h1><p>The Road Back</p></body></html>`;

(async () => {
  const browser = await chromium.launch();
  for (const { w, h, dpr } of SPLASH) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(__dirname, '..', 'public', 'splash', `${w * dpr}x${h * dpr}.png`);
    await page.screenshot({ path: out });
    await page.close();
    console.log('wrote', path.relative(process.cwd(), out));
  }
  await browser.close();
})();
