// Finds a short how-to video on YouTube for every library exercise that has no hand pick in
// src/exercises/videos.ts, and writes them to src/exercises/videos.found.json.
// Run it on a machine that can reach YouTube (the cloud machine can't).
// No API key: it reads YouTube's public search page. Order of choice, per exercise:
//   1. a Bodybuilding.com clip of that name (the catalog came from that site, the clips are short
//      silent demos), 2. an OPEX / "(Exercise Library)" demo, 3. the first short plain video
//   (under 4 minutes, not a Short) whose title shares the exercise's main words.
// Usage: node scripts/find-videos.mjs [--limit N]
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

async function search(q) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=en&gl=US`;
  const res = await fetch(url, { headers: { 'accept-language': 'en-US,en;q=0.9', 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', cookie: 'CONSENT=YES+1' } });
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    if (o.videoRenderer?.videoId) {
      const v = o.videoRenderer;
      out.push({ id: v.videoId, title: v.title?.runs?.map((r) => r.text).join('') ?? '', secs: seconds(v.lengthText?.simpleText) });
      return;
    }
    for (const k in o) walk(o[k]);
  })(JSON.parse(m[1]));
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
for (const [i, x] of todo.entries()) {
  let pick;
  try {
    pick = choose(x.name, await search(`${x.name} Bodybuilding.com`)) ?? choose(x.name, await search(`how to ${x.name} exercise`));
  } catch (e) {
    console.log(`error ${x.id}: ${e.message}`);
  }
  if (pick) found[x.id] = { id: pick.id, title: pick.title.slice(0, 90) };
  else misses++;
  console.log(`${i + 1}/${todo.length} ${pick ? 'ok  ' : 'MISS'} ${x.id}${pick ? ` -> ${pick.id} ${pick.title}` : ''}`);
  if (i % 25 === 24) writeFileSync(OUT, JSON.stringify(sortKeys(found), null, 0).replace(/\},"/g, '},\n"') + '\n');
  await new Promise((r) => setTimeout(r, 700));
}
function sortKeys(o) {
  return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}
writeFileSync(OUT, JSON.stringify(sortKeys(found), null, 0).replace(/\},"/g, '},\n"') + '\n');
console.log(`done: ${Object.keys(found).length} found in all, ${misses} missed this run`);
