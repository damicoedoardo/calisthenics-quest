// FORMA service worker: the app keeps working in a gym with no signal.
// Pages are network-first (fresh deploys win), static assets cache-first.
const CACHE = 'forma-v3';
const SHELL = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const sameOrigin = (url) => url.origin === self.location.origin;
const isStatic = (url) =>
  (sameOrigin(url) && (url.pathname.startsWith('/_next/static/') || /\.(png|svg|webmanifest)$/.test(url.pathname))) ||
  url.hostname === 'fonts.googleapis.com' ||
  url.hostname === 'fonts.gstatic.com';

// The page sends the files it has loaded, with the name of its build: on the very first visit
// that caches what loaded before this worker took over, so the app can start offline after a
// single visit. The build names also let old deploys' files be dropped (see prune below).
const META = '/__sw/meta';
// Messages are handled one after another, so two never rewrite the bookkeeping at once.
let queue = Promise.resolve();
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'cache' || !Array.isArray(data.urls)) return;
  queue = queue.then(() => remember(data.urls.filter((u) => typeof u === 'string' && isStatic(new URL(u))), String(data.build || ''))).catch(() => {});
  event.waitUntil(queue);
});

async function remember(urls, build) {
  const cache = await caches.open(CACHE);
  await Promise.all(
    urls.map(async (u) => {
      if (await cache.match(u)) return;
      // Ask the way the browser did: the font stylesheet is a plain <link> (no-cors), the
      // font files themselves are fetched with CORS, and a cached answer must match.
      const req = new Request(u, { mode: new URL(u).hostname === 'fonts.googleapis.com' ? 'no-cors' : 'cors' });
      const res = await fetch(req).catch(() => null);
      if (res && (res.ok || res.type === 'opaque')) await cache.put(u, res);
    }),
  );
  if (!build) return;
  const hit = await cache.match(META);
  const meta = hit ? await hit.json() : { builds: [], tags: {} };
  for (const u of urls) meta.tags[u] = build;
  if (meta.builds[0] !== build) {
    meta.builds = [build, meta.builds[0]].filter(Boolean);
    await prune(cache, meta);
  }
  await cache.put(META, new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
}

// Each deploy brings new chunk files (their names are hashes of their contents), so without this
// the cache would grow with every deploy. Keep the files of this build and the one before it (a
// page still open on the old build may yet load one of its chunks); drop the rest. A file no page
// has reported yet counts as the previous build's, so it survives one more deploy.
async function prune(cache, meta) {
  const keep = new Set(meta.builds);
  for (const req of await cache.keys()) {
    if (!new URL(req.url).pathname.startsWith('/_next/static/')) continue;
    const tag = meta.tags[req.url] ?? (meta.tags[req.url] = meta.builds[1] ?? meta.builds[0]);
    if (!keep.has(tag)) {
      await cache.delete(req);
      delete meta.tags[req.url];
    }
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    // Each page is cached under its own path (the query string, like ?fast, is dropped), so
    // opening /lab offline gives the lab, not the home page.
    const key = url.origin + url.pathname;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(key, copy));
          }
          return res;
        })
        .catch(() => caches.match(key).then((hit) => hit || caches.match('/'))),
    );
    return;
  }

  if (!isStatic(url)) return;

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
