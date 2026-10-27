// The Fog simulator: plays hundreds of bot runs per snapshot of a simulated player, on every core,
// without a browser. It runs the game's own engine (src/game/dungeon/engine.ts) with the bot
// (src/game/dungeon/bot.ts), so what it measures is the game itself.
//
//   pnpm sim                                   # writes sim-out/states/*.json (snapshots at each zone)
//   pnpm fog:sim steady 100                    # win rates per zone, for each class
//   pnpm fog:tune steady 60                    # finds each zone's hp/dmg for the target win rates
//
// Options (env): CLASSES=archer,mage (default: all four), ONLY=zone1-open,zone1-later picks
// snapshots, SCALE='{"2":1.2}' plays zone 2 with its hp and dmg 1.2x, DIALS='{"fire":1.5}' turns the
// engine's dials, TARGET=0.33,0.67 sets what the tuner aims for (wins when a zone opens, and 6
// workouts later).
import { readdirSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';

register('./ts-hooks.mjs', import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const DAY = 86_400_000;

/** The save moved to today, last workout yesterday (as scripts/fog-balance.cjs does). */
function shift(state, now) {
  const last = state.sessions.length ? new Date(state.sessions.at(-1).date).getTime() : now - DAY;
  const delta = now - DAY - last;
  const move = (d) => new Date(new Date(d).getTime() + delta).toISOString();
  return { ...state, sessions: state.sessions.map((s) => ({ ...s, date: move(s.date) })), tests: state.tests.map((t) => ({ ...t, date: move(t.date) })), days: [], draft: null };
}

if (!isMainThread) {
  const { playRun } = await import(`${root}src/game/dungeon/bot.ts`);
  const { DIALS } = await import(`${root}src/game/dungeon/engine.ts`);
  const { ATTENTION } = await import(`${root}src/game/dungeon/bot.ts`);
  const dials = JSON.parse(process.env.DIALS || '{}');
  // "attention" is the bot's: the share of shots it sees coming.
  if (dials.attention !== undefined) ATTENTION.share = dials.attention;
  delete dials.attention;
  Object.assign(DIALS, dials);
  const { ZONES, powerOf } = await import(`${root}src/lib/fog.ts`);
  const now = Date.now();
  parentPort.on('message', (job) => {
    const state = JSON.parse(readFileSync(job.file, 'utf8'));
    const power = powerOf(shift(state, now), new Date(now));
    const z = ZONES[job.zone];
    const zone = { ...z, hp: z.hp * job.scale, dmg: z.dmg * job.scale };
    const out = [];
    for (let i = 0; i < job.runs; i++) out.push(playRun({ zone, power, classId: job.cls, seed: job.seed + i * 7919 }));
    parentPort.postMessage(out);
  });
} else {
  const args = process.argv.slice(2);
  const tune = args[0] === 'tune';
  if (tune) args.shift();
  const [player = 'steady', runsArg = tune ? '60' : '100'] = args;
  const runs = Number(runsArg);
  const classes = (process.env.CLASSES || 'archer,mage,warrior,monk').split(',');
  const only = (process.env.ONLY || '').split(',').filter(Boolean);
  const scales = JSON.parse(process.env.SCALE || '{}');
  const [aimOpen, aimLater] = (process.env.TARGET || '0.33,0.67').split(',').map(Number);
  const dir = `${root}sim-out/states`;
  const snaps = readdirSync(dir)
    .filter((f) => f.startsWith(`${player}-zone`))
    .sort()
    .map((f) => ({ file: `${dir}/${f}`, label: f.slice(player.length + 1, -5), zone: Number(f.match(/zone(\d)/)[1]) }))
    .filter((s) => !only.length || only.includes(s.label));
  if (!snaps.length) throw new Error(`No snapshots for "${player}" in sim-out/states. Run pnpm sim first.`);

  // A pool of workers; each job is a slice of runs, so every core stays busy.
  const workers = Array.from({ length: Math.max(1, availableParallelism()) }, () => new Worker(fileURLToPath(import.meta.url)));
  const idle = [...workers];
  const queue = [];
  const next = () => {
    while (idle.length && queue.length) {
      const w = idle.pop(),
        { job, done } = queue.shift();
      w.once('message', (out) => {
        idle.push(w);
        done(out);
        next();
      });
      w.postMessage(job);
    }
  };
  const play = (job) => new Promise((done) => (queue.push({ job, done }), next()));

  /** Every class on one snapshot at a scale: the same seeds each time, so scales compare fairly. */
  async function measure(snap, scale) {
    const slice = Math.max(5, Math.ceil(runs / 4));
    const per = await Promise.all(
      classes.map(async (cls) => {
        const parts = [];
        for (let i = 0; i < runs; i += slice) parts.push(play({ file: snap.file, zone: snap.zone, cls, scale, runs: Math.min(slice, runs - i), seed: 1 + i * 104729 }));
        return { cls, res: (await Promise.all(parts)).flat() };
      }),
    );
    return per;
  }
  const rate = (res) => res.filter((r) => r.won).length / res.length;
  const pct = (x) => `${Math.round(x * 100)}%`.padStart(4);
  const t0 = performance.now();

  if (!tune) {
    const mins = (res) => {
      const t = res.filter((r) => r.won).map((r) => r.seconds).sort((a, b) => a - b);
      return t.length ? `${(t[Math.floor(t.length / 2)] / 60).toFixed(1)}m` : '-';
    };
    console.log(`${'snapshot'.padEnd(12)} ${classes.map((c) => c.padStart(14)).join('')}   reached the boss, deepest floor on a loss`);
    for (const snap of snaps) {
      const per = await measure(snap, scales[snap.zone] ?? 1);
      const all = per.flatMap((p) => p.res);
      const reached = all.filter((r) => r.bossAt !== null).length / all.length;
      const lost = all.filter((r) => !r.won).map((r) => r.floor);
      const deep = lost.length ? (lost.reduce((a, b) => a + b, 0) / lost.length).toFixed(1) : '-';
      console.log(`${snap.label.padEnd(12)} ${per.map((p) => `${pct(rate(p.res))} ${mins(p.res).padStart(5)}`.padStart(14)).join('')}   ${pct(reached)}, floor ${deep}`);
    }
  } else {
    // For each zone, the scale on its enemies' hp and damage that puts the average of
    // "when it opens" and "6 workouts later" on the middle of the two targets, by bisection.
    const ZONES = [...new Set(snaps.map((s) => s.zone))];
    const { ZONES: zones } = await import(`${root}src/lib/fog.ts`);
    console.log(`Aim: ${pct(aimOpen)} of runs won when a zone opens, ${pct(aimLater)} six workouts later (all classes together).\n`);
    for (const z of ZONES) {
      const open = snaps.find((s) => s.zone === z && s.label.endsWith('open')),
        later = snaps.find((s) => s.zone === z && s.label.endsWith('later'));
      const both = [open, later].filter(Boolean);
      const aim = both.length === 2 ? (aimOpen + aimLater) / 2 : open ? aimOpen : aimLater;
      const at = async (scale) => {
        const r = await Promise.all(both.map((s) => measure(s, scale)));
        const rates = r.map((per) => rate(per.flatMap((p) => p.res)));
        return { scale, rates, avg: rates.reduce((a, b) => a + b, 0) / rates.length, per: r };
      };
      // Bisection on a log scale, stopping once within 4 points of the aim.
      let lo = 0.3,
        hi = 3,
        best = await at(1);
      const now1 = best;
      for (let i = 0; i < 7 && Math.abs(best.avg - aim) > 0.04; i++) {
        const mid = Math.sqrt(lo * hi);
        const m = await at(mid);
        if (Math.abs(m.avg - aim) < Math.abs(best.avg - aim)) best = m;
        if (m.avg > aim) lo = mid;
        else hi = mid;
      }
      const zone = zones[z];
      const show = (m) => both.map((s, i) => `${s.label.split('-')[1]} ${pct(m.rates[i])}`).join(', ');
      console.log(`Zone ${z + 1} ${zone.name}: now hp ${zone.hp}, dmg ${zone.dmg} → ${show(now1)}`);
      console.log(`  scale ${best.scale.toFixed(2)}: hp ${(zone.hp * best.scale).toFixed(2)}, dmg ${(zone.dmg * best.scale).toFixed(2)} → ${show(best)}`);
      for (const [i, s] of both.entries()) console.log(`    ${s.label.padEnd(12)} ${best.per[i].map((p) => `${p.cls} ${pct(rate(p.res))}`).join('  ')}`);
    }
  }
  console.log(`\n${((performance.now() - t0) / 1000).toFixed(1)} s`);
  for (const w of workers) w.terminate();
}
