// Finds a short how-to video on YouTube for every library exercise that has no hand pick in
// src/exercises/videos.ts, and writes them to src/exercises/videos.found.json.
// Run it on a machine that can reach YouTube (the cloud machine can't).
// No API key: it asks YouTube's own search endpoint, like the website does. Order of choice, per exercise:
//   1. a Bodybuilding.com clip of that name (the catalog came from that site, the clips are short
//      silent demos), 2. an OPEX / "(Exercise Library)" demo, 3. the first short plain video
//   (under 4 minutes, not a Short) whose title shares the exercise's main words.
// Usage: node scripts/find-videos.mjs [--limit N] [--jobs 8]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const OUT = new URL('../src/exercises/videos.found.json', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('../src/exercises/catalog.json', import.meta.url), 'utf8'));
const picked = new Set(
  [...readFileSync(new URL('../src/exercises/videos.ts', import.meta.url), 'utf8').matchAll(/^ {2}'?([^':]+(?::[^':]+)?)'?: \{ id: /gm)].map((m) => m[1]),
);
const found = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const limit = Number(process.argv[process.argv.indexOf('--limit') + 1]) || Infinity;

const STOP = new Set(['with', 'the', 'and', 'on', 'to', 'a', 'of', 'in', 'for', 'version', 'position']);
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w));
const seconds = (t) => (t ?? '').split(':').reduce((a, b) => a * 60 + Number(b), 0);

// YouTube's own JSON search endpoint (InnerTube, what the website and tools like yt-dlp call):
// much lighter than the HTML page. When YouTube refuses, every worker waits and the lookup is
// retried with a longer pause each time, instead of being counted as a miss.
const SEARCH = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false';
const CLIENT = { clientName: 'WEB', clientVersion: '2.20251031.00.00', hl: 'en', gl: 'US' };
let calmUntil = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function search(q) {
  let data;
  for (let tries = 0; ; tries++) {
    while (Date.now() < calmUntil) await sleep(calmUntil - Date.now());
    try {
      const res = await fetch(SEARCH, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept-language': 'en-US,en;q=0.9', 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' },
        body: JSON.stringify({ context: { client: CLIENT }, query: q }),
      });
      if (res.status === 429 || res.status >= 500) throw new Error(`status ${res.status}`);
      data = await res.json();
      break;
    } catch (e) {
      if (tries >= 6) throw e;
      const wait = 5000 * 2 ** tries; // 5 s, 10 s, 20 s ... about 5 minutes at most
      calmUntil = Math.max(calmUntil, Date.now() + wait);
      console.log(`YouTube said no (${e.message}), all wait ${wait / 1000} s`);
    }
  }
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (o.videoRenderer?.videoId) {
      const v = o.videoRenderer;
      out.push({ id: v.videoId, title: v.title?.runs?.map((r) => r.text).join('') ?? '', secs: seconds(v.lengthText?.simpleText) });
      return;
    }
    for (const k in o) walk(o[k]);
  })(data);
  return out;
}

/** Share of the exercise's main words that the title has. */
function overlap(name, title) {
  const want = words(name);
  const have = new Set(words(title));
  return want.filter((w) => have.has(w) || have.has(w.replace(/s$/, ''))).length / Math.max(1, want.length);
}

function choose(name, results) {
  const ok = (v) => v.secs > 0 && v.secs <= 240 && v.id.length === 11;
  const bb = results.find((v) => ok(v) && /bodybuilding\.com/i.test(v.title) && overlap(name, v.title) >= 0.75);
  if (bb) return bb;
  const lib = results.find((v) => ok(v) && /opex exercise library|\(exercise library\)/i.test(v.title) && overlap(name, v.title) >= 0.75);
  if (lib) return lib;
  return results.find((v) => ok(v) && overlap(name, v.title) >= 0.6);
}

const todo = catalog.filter((x) => !picked.has(x.id) && !found[x.id]).slice(0, limit);
console.log(`${picked.size} hand picks, ${Object.keys(found).length} found before, ${todo.length} to look up`);
let misses = 0;
let done = 0;
const JOBS = Number(process.argv[process.argv.indexOf('--jobs') + 1]) || 8;
async function lookUp(x) {
  let pick;
  try {
    pick = choose(x.name, await search(`${x.name} Bodybuilding.com`)) ?? choose(x.name, await search(`how to ${x.name} exercise`));
  } catch (e) {
    console.log(`error ${x.id}: ${e.message}`);
  }
  if (pick) found[x.id] = { id: pick.id, title: pick.title.slice(0, 90) };
  else misses++;
  done++;
  console.log(`${done}/${todo.length} ${pick ? 'ok  ' : 'MISS'} ${x.id}${pick ? ` -> ${pick.id} ${pick.title}` : ''}`);
  if (done % 50 === 0) writeFileSync(OUT, JSON.stringify(sortKeys(found), null, 0).replace(/\},"/g, '},\n"') + '\n');
}
// JOBS lookups at a time, each worker pausing a little between its own lookups.
const queue = [...todo];
await Promise.all(
  Array.from({ length: JOBS }, async () => {
    for (let x = queue.shift(); x; x = queue.shift()) {
      await lookUp(x);
      await new Promise((r) => setTimeout(r, 300));
    }
  }),
);
function sortKeys(o) {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}
writeFileSync(OUT, JSON.stringify(sortKeys(found), null, 0).replace(/\},"/g, '},\n"') + '\n');
console.log(`done: ${Object.keys(found).length} found in all, ${misses} missed this run`);
