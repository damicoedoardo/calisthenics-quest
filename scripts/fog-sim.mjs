// The Fog simulator: plays hundreds of bot runs per snapshot of a simulated player, on every core,
// without a browser. It runs the game's own engine (src/game/dungeon/engine.ts) with the bot
// (src/game/dungeon/bot.ts), so what it measures is the game itself.
//
//   pnpm sim                                   # writes sim-out/states/*.json (snapshots at each zone)
//   pnpm fog:sim steady 100                    # win rates per zone, for each class
//   pnpm fog:tune steady 60                    # finds each zone's hp/dmg for the target win rates
//   pnpm fog:sheet                             # fog:sim steady 48, written to src/balance/fog-sheet.md
//
// Options (env): CLASSES=archer,mage (default: all four), ONLY=zone1-open,zone1-later picks
// snapshots, SCALE='{"2":1.2}' plays zone 2 with its hp and dmg 1.2x, DIALS='{"fire":1.5}' turns the
// engine's dials, TARGET=0.33,0.67 sets what the tuner aims for (wins when a zone opens, and later
// on), EDGE='{"bossHp":0.7,"picks":3}' plays every run as if the zone's chapter had run out of
// hearts (a weaker boss and free skills at the start; edgeFor in src/lib/fog.ts).
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
  return { ...state, sessions: state.sessions.map((s) => ({ ...s, date: move(s.date) })), days: [], draft: null };
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
  const { ZONES, powerOf, edgeFor } = await import(`${root}src/lib/fog.ts`);
  const forced = process.env.EDGE ? JSON.parse(process.env.EDGE) : null;
  const { buildOf } = await import(`${root}src/lib/stats.ts`);
  const now = Date.now();
  parentPort.on('message', (job) => {
    const state = JSON.parse(readFileSync(job.file, 'utf8'));
    const power = powerOf(shift(state, now), new Date(now));
    // Every run starts in the starter kit (as after a death); the bot wears what drops if its points allow.
    const build = buildOf(state);
    const z = ZONES[job.zone];
    const zone = { ...z, hp: z.hp * job.scale, dmg: z.dmg * job.scale };
    const edge = forced ?? edgeFor(state, z);
    const out = [];
    for (let i = 0; i < job.runs; i++) {
      const seed = job.seed + i * 7919;
      out.push({ ...playRun({ zone, power, classId: job.cls, seed, build, edge }), seed });
    }
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
    const table = [];
    for (const snap of snaps) {
      const per = await measure(snap, scales[snap.zone] ?? 1);
      table.push({ snap, rates: per.map((p) => rate(p.res)) });
      const all = per.flatMap((p) => p.res);
      const reached = all.filter((r) => r.bossAt !== null).length / all.length;
      const lost = all.filter((r) => !r.won).map((r) => r.floor);
      const deep = lost.length ? (lost.reduce((a, b) => a + b, 0) / lost.length).toFixed(1) : '-';
      console.log(`${snap.label.padEnd(12)} ${per.map((p) => `${pct(rate(p.res))} ${mins(p.res).padStart(5)}`.padStart(14)).join('')}   ${pct(reached)}, floor ${deep}`);
      // A run this long means something held a room shut: worth a look (replay it with its seed).
      const long = per.flatMap((p) => p.res.filter((r) => r.seconds > 25 * 60).map((r) => `${p.cls} seed ${r.seed} (floor ${r.floor}.${r.room}, ${Math.round(r.seconds / 60)}m)`));
      if (long.length) console.log(`  ! ${long.length} past 25 min: ${long.slice(0, 6).join(', ')}${long.length > 6 ? ', ...' : ''}`);
    }
    // Each class's average over the zones, against the four's (CLASS_FAIR in src/balance/classes.ts).
    const { CLASS_FAIR } = await import(`${root}src/balance/classes.ts`);
    const fair = ['open', 'later'].map((kind) => {
      const rows = table.filter((t) => t.snap.label.endsWith(kind));
      const avg = classes.map((_, i) => rows.reduce((n, t) => n + t.rates[i], 0) / (rows.length || 1)),
        mean = avg.reduce((a, b) => a + b, 0) / avg.length;
      return { kind, avg, mean, ok: avg.every((a) => Math.abs(a - mean) <= CLASS_FAIR) };
    });
    console.log('');
    for (const f of fair) console.log(`${`${f.kind} (average)`.padEnd(16)} ${f.avg.map((a, i) => `${classes[i]} ${pct(a)}`).join('  ')}   all four ${pct(f.mean)}: ${f.ok ? 'fair' : `a class is more than ${pct(CLASS_FAIR)} off`}`);
    // SHEET=1 writes the result next to the balance sheet (pnpm fog:sheet).
    if (process.env.SHEET) {
      const { writeFileSync } = await import('node:fs');
      const row = (cells) => `| ${cells.join(' | ')} |`;
      const md = [
        '# Fog sheet',
        '',
        `Written by \`pnpm fog:sheet\` (the Fog bot, ${runs} runs per class per point, player \`${player}\`). Do not edit by hand. The goals: \`src/balance/classes.ts\` and \`src/balance/dungeon.ts\`; the rule: \`docs/handbook/game/balance.md\`.`,
        '',
        '## Classes',
        '',
        `Each class's win rate, averaged over the zones, against the four's average (fair: within ${Math.round(CLASS_FAIR * 100)} points).`,
        '',
        row(['When', ...classes, 'All four', '']),
        row(['---', ...classes.map(() => '---'), '---', '---']),
        ...fair.map((f) => row([f.kind === 'open' ? 'The day a zone opens' : 'Six workouts later', ...f.avg.map((a) => pct(a).trim()), pct(f.mean).trim(), f.ok ? 'fair' : '**off**'])),
        '',
        '## Zones',
        '',
        'Win rate by zone and class. Goal: about 1 in 3 the day a zone opens, about 2 in 3 six workouts later.',
        '',
        row(['Zone', 'When', ...classes, 'All four']),
        row(['---', '---', ...classes.map(() => '---'), '---']),
        ...[...table]
          .sort((x, y) => x.snap.zone - y.snap.zone || (x.snap.label.endsWith('open') ? -1 : 1))
          .map((t) => row([String(t.snap.zone + 1), t.snap.label.endsWith('open') ? 'opens' : '+6 workouts', ...t.rates.map((r) => pct(r).trim()), pct(t.rates.reduce((a, b) => a + b, 0) / t.rates.length).trim()])),
        '',
      ].join('\n');
      writeFileSync(`${root}src/balance/fog-sheet.md`, md);
      console.log('Wrote src/balance/fog-sheet.md');
    }
  } else {
    // For each zone, the scale on its enemies' hp and damage that puts the average of
    // "when it opens" and "later" (6 workouts on, 18 for the last two zones: laterBy in src/sim/season.ts) on the middle of the two targets.
    // The win rate falls with the scale along an S curve: logit(rate) = a - b * ln(scale). One
    // measurement and a typical slope give the first guess; each new one fits the curve again, so a
    // zone usually lands in two or three measurements. All zones search at once, so no core waits.
    const ZONES = [...new Set(snaps.map((s) => s.zone))];
    const { ZONES: zones } = await import(`${root}src/lib/fog.ts`);
    console.log(`Aim: ${pct(aimOpen)} of runs won when a zone opens, ${pct(aimLater)} later on (all classes together).\n`);
    const logit = (p) => Math.log(p / (1 - p));
    // Measured on zone 2: from scale 1 to 1.5 the win rate fell from 74% to 16%.
    const SLOPE = 6;
    const tuneZone = async (z) => {
      const open = snaps.find((s) => s.zone === z && s.label.endsWith('open')),
        later = snaps.find((s) => s.zone === z && s.label.endsWith('later'));
      const both = [open, later].filter(Boolean);
      const aim = both.length === 2 ? (aimOpen + aimLater) / 2 : open ? aimOpen : aimLater;
      const at = async (scale) => {
        const r = await Promise.all(both.map((s) => measure(s, scale)));
        const rates = r.map((per) => rate(per.flatMap((p) => p.res)));
        const avg = rates.reduce((a, b) => a + b, 0) / rates.length,
          n = r.flat().reduce((k, p) => k + p.res.length, 0);
        // Half a win either way, so 0% and 100% still have a place on the curve.
        return { scale, rates, avg, y: logit((avg * n + 0.5) / (n + 1)), per: r };
      };
      const now1 = await at(1),
        pts = [now1];
      let best = now1;
      for (let i = 0; i < 6 && Math.abs(best.avg - aim) > 0.04; i++) {
        // The slope: the line through the two points closest to the aim (the curve bends near 0%
        // and 100%), or the typical one while there is only one.
        let b = SLOPE;
        const [p, q] = [...pts].sort((u, v) => Math.abs(u.y - logit(aim)) - Math.abs(v.y - logit(aim)));
        if (q && Math.abs(Math.log(p.scale / q.scale)) > 0.01) b = Math.min(20, Math.max(1.5, -(p.y - q.y) / Math.log(p.scale / q.scale)));
        // From the closest point, along that slope to the aim; never more than 2x in one go.
        const step = Math.min(Math.log(2), Math.max(-Math.log(2), (best.y - logit(aim)) / b)),
          next = Math.min(3, Math.max(0.3, best.scale * Math.exp(step)));
        if (pts.some((p) => Math.abs(Math.log(p.scale / next)) < 0.005)) break;
        const m = await at(next);
        pts.push(m);
        if (Math.abs(m.avg - aim) < Math.abs(best.avg - aim)) best = m;
      }
      return { z, both, now1, best, tries: pts.length };
    };
    const found = await Promise.all(ZONES.map(tuneZone));
    for (const { z, both, now1, best, tries } of found) {
      const zone = zones[z];
      const show = (m) => both.map((s, i) => `${s.label.split('-')[1]} ${pct(m.rates[i])}`).join(', ');
      console.log(`Zone ${z + 1} ${zone.name}: now hp ${zone.hp}, dmg ${zone.dmg} → ${show(now1)}`);
      console.log(`  scale ${best.scale.toFixed(2)}: hp ${(zone.hp * best.scale).toFixed(2)}, dmg ${(zone.dmg * best.scale).toFixed(2)} → ${show(best)}   (${tries} measured)`);
      for (const [i, s] of both.entries()) console.log(`    ${s.label.padEnd(12)} ${best.per[i].map((p) => `${p.cls} ${pct(rate(p.res))}`).join('  ')}`);
    }
  }
  console.log(`\n${((performance.now() - t0) / 1000).toFixed(1)} s`);
  for (const w of workers) w.terminate();
}
