// Fog balance: the bot plays each zone, fast-forwarded, with the hero a simulated player really has
// when the zone opens and 6 workouts later. Prints every run and a win table.
//
//   pnpm sim                                  # writes sim-out/states/*.json and sim-out/scene-ids.json
//   pnpm build && pnpm start -p 3124          # in another terminal
//   node scripts/fog-balance.cjs steady 3     # player id from src/sim/players.ts, tries per zone
//
// Options (env): CLASS=mage plays every run as that class, ONLY=zone1-later,zone2-open picks snapshots,
// URL=http://localhost:3124 points at another server. Needs Playwright (a global install is fine:
// NODE_PATH=$(npm root -g)). The bot keeps its distance from foes, so treat its wins as what a careful
// player manages, and its class results as hints rather than proof.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [player = 'steady', triesArg = '3'] = process.argv.slice(2);
const tries = Number(triesArg);
const out = path.join(__dirname, '..', 'sim-out');
const url = process.env.URL || 'http://localhost:3124';
const only = (process.env.ONLY || '').split(',').filter(Boolean);
const seen = JSON.parse(fs.readFileSync(path.join(out, 'scene-ids.json'), 'utf8'));
const files = fs
  .readdirSync(path.join(out, 'states'))
  .filter((f) => f.startsWith(player + '-zone') && (!only.length || only.includes(f.slice(player.length + 1, -5))))
  .sort();
const DAY = 86400000;

/** Moves the save to today, last workout yesterday (warmed up, not rested), with every scene already seen. */
function shift(state, now) {
  const last = state.sessions.length ? new Date(state.sessions[state.sessions.length - 1].date).getTime() : now - DAY;
  const delta = now - DAY - last;
  const move = (d) => new Date(new Date(d).getTime() + delta).toISOString();
  return {
    ...state,
    sessions: state.sessions.map((s) => ({ ...s, date: move(s.date) })),
    days: [],
    draft: null,
    seenScenes: [...new Set([...state.seenScenes, ...seen])],
  };
}

(async () => {
  if (!files.length) throw new Error(`No snapshots for "${player}" in sim-out/states. Run pnpm sim first.`);
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const rows = [];
  for (const f of files) {
    const zone = Number(f.match(/zone(\d)/)[1]);
    const label = f.slice(player.length + 1, -5);
    const saved = JSON.parse(fs.readFileSync(path.join(out, 'states', f), 'utf8'));
    const base = process.env.CLASS ? { ...saved, profile: { ...saved.profile, classId: process.env.CLASS } } : saved;
    for (let k = 0; k < tries; k++) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const save = shift({ ...base, fog: { cleared: zone, runs: 0, best: {} } }, Date.now());
      await page.addInitScript((s) => localStorage.setItem('forma-state-v1', s), JSON.stringify(save));
      await page.goto(`${url}/?bot=fast`);
      await page.waitForTimeout(800);
      await page.locator('nav').getByText('Play').click();
      await page.waitForTimeout(300);
      const t0 = Date.now();
      await page.locator('main').getByRole('button', { name: 'Play' }).first().click();
      const end = await page
        .waitForSelector('[data-run-end]', { timeout: 180000 })
        .then((el) => el.getAttribute('data-run-end'))
        .catch(() => null);
      const r = end ? JSON.parse(end) : { won: null };
      const b = base.build ?? {};
      const row = { label, zone, try: k + 1, workouts: base.sessions.length, levels: `${b.health ?? 0}/${b.damage ?? 0}/${b.reach ?? 0}/${b.speed ?? 0}`, cls: base.profile.classId ?? '-', ...r, wall: (Date.now() - t0) / 1000, errors: errors.length };
      rows.push(row);
      const result = row.won ? 'WON' : row.won === false ? 'lost' : 'TIMEOUT';
      console.log(`${label} #${row.try} w${row.workouts} pts${row.levels} ${row.cls}: ${result} at ${row.seconds}s, boss at ${row.bossAt ?? '-'}, hp ${row.hp}/${row.maxHp} (${row.wall.toFixed(1)} s)${row.errors ? `, ${row.errors} errors: ${errors[0].slice(0, 120)}` : ''}`);
      await ctx.close();
    }
  }
  await browser.close();

  console.log('\nWins per snapshot:');
  for (const label of [...new Set(rows.map((r) => r.label))]) {
    const runs = rows.filter((r) => r.label === label);
    console.log(`  ${label.padEnd(12)} ${runs.filter((r) => r.won).length}/${runs.length}`);
  }
  const name = `fog-${player}${process.env.CLASS ? '-' + process.env.CLASS : ''}.json`;
  fs.writeFileSync(path.join(out, name), JSON.stringify(rows, null, 1));
  console.log(`\nWrote sim-out/${name}`);
})();
