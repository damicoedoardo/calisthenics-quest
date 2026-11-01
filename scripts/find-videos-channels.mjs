// Matches the exercises that still have no video against every upload of a few demo channels
// (Bodybuilding.com, whose clips our catalog names come from, and the OPEX exercise library),
// with the official YouTube Data API. Reading a channel's whole upload list costs 1 quota unit per
// 50 videos, so this needs no searching and is never throttled. Writes src/exercises/videos.found.json
// (keeps what is there; hand picks in videos.ts always win). Run it where YouTube is reachable.
// The key comes from YOUTUBE_API_KEY in the environment or in .env.local (git-ignored); never commit it.
// No key? It reads the same lists with yt-dlp (`brew install yt-dlp`), a few requests per channel.
// Usage: node scripts/find-videos-channels.mjs [--channel @handle|UC...]... [--dry]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = new URL('../src/exercises/videos.found.json', import.meta.url);
const API = 'https://www.googleapis.com/youtube/v3';

function apiKey() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const file = new URL('../.env.local', import.meta.url);
  if (existsSync(file)) {
    const m = readFileSync(file, 'utf8').match(/^YOUTUBE_API_KEY=["']?([^"'\s]+)/m);
    if (m) return m[1];
  }
  return null;
}
const KEY = apiKey();

async function get(path, params) {
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key: KEY })}`;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${body.error?.message ?? ''}`); // the message never holds the key
  return body;
}

const args = process.argv.slice(2);
const channels = args.flatMap((a, i) => (a === '--channel' ? [args[i + 1]] : []));
if (channels.length === 0) channels.push('@bodybuildingcom', '@OPEXFitness');

/** Every upload of a channel with yt-dlp: one flat listing, no key. */
function uploadsByYtDlp(channel) {
  const url = channel.startsWith('UC') ? `https://www.youtube.com/channel/${channel}/videos` : `https://www.youtube.com/${channel}/videos`;
  const json = execFileSync('yt-dlp', ['--flat-playlist', '-J', '--sleep-requests', '1', url], { maxBuffer: 1 << 28, encoding: 'utf8' });
  const list = JSON.parse(json);
  const out = (list.entries ?? []).filter((e) => e.id && e.title).map((e) => ({ id: e.id, title: e.title }));
  console.log(`${list.channel ?? channel}: ${out.length} videos`);
  return out;
}

/** Every upload of a channel (by @handle or UC id): id and title. */
async function uploads(channel) {
  if (!KEY) return uploadsByYtDlp(channel);
  const by = channel.startsWith('UC') ? { id: channel } : { forHandle: channel };
  const ch = await get('channels', { part: 'contentDetails,snippet', ...by });
  const item = ch.items?.[0];
  if (!item) throw new Error(`No channel ${channel}: check its handle on youtube.com`);
  const list = item.contentDetails.relatedPlaylists.uploads;
  const out = [];
  let pageToken = '';
  do {
    const page = await get('playlistItems', { part: 'snippet', playlistId: list, maxResults: '50', ...(pageToken && { pageToken }) });
    for (const it of page.items ?? []) out.push({ id: it.snippet.resourceId.videoId, title: it.snippet.title });
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  console.log(`${item.snippet.title}: ${out.length} videos`);
  return out;
}

const STOP = new Set(['with', 'the', 'and', 'on', 'to', 'a', 'of', 'in', 'for', 'version', 'position', 'exercise', 'exercises']);
const stem = (w) => w.replace(/(es|s)$/, '');
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)).map(stem);
/** The move's name in a channel title: "Board Press - Triceps Exercise - Bodybuilding.com" -> "Board Press". */
const core = (title) => title.split(/ [-|–] /)[0];
const share = (a, b) => {
  const have = new Set(b);
  return a.filter((w) => have.has(w)).length / Math.max(1, a.length);
};

const catalog = JSON.parse(readFileSync(new URL('../src/exercises/catalog.json', import.meta.url), 'utf8'));
const picked = new Set(
  [...readFileSync(new URL('../src/exercises/videos.ts', import.meta.url), 'utf8').matchAll(/^ {2}'?([^':]+(?::[^':]+)?)'?: \{ id: /gm)].map((m) => m[1]),
);
const found = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const todo = catalog.filter((x) => !picked.has(x.id) && !found[x.id]);

const videos = [];
for (const c of channels) videos.push(...(await uploads(c)).map((v) => ({ ...v, w: words(core(v.title)) })));

// A match needs the name's words in the title AND the title's words in the name, both mostly,
// so "Barbell Squat" never takes "Barbell Squat To A Bench". Channels listed first win ties.
let hits = 0;
const misses = [];
for (const x of todo) {
  const n = words(x.name);
  let best = null;
  let bestScore = 0;
  for (const v of videos) {
    const a = share(n, v.w);
    const b = share(v.w, n);
    if (a < 0.8 || b < 0.8) continue;
    const score = a + b;
    if (score > bestScore) [best, bestScore] = [v, score];
  }
  if (best) {
    found[x.id] = { id: best.id, title: best.title.slice(0, 90) };
    hits++;
    console.log(`ok   ${x.id} -> ${best.id} ${best.title}`);
  } else misses.push(x.id);
}
console.log(`\n${hits} matched, ${misses.length} still without a video:\n${misses.join(' ')}`);
if (!args.includes('--dry')) {
  const sorted = Object.fromEntries(Object.entries(found).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify(sorted, null, 0).replace(/\},"/g, '},\n"') + '\n');
}
