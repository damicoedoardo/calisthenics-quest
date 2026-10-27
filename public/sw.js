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

// The page sends the files it loaded before this worker took over (on the very first visit), so
// they are cached too and the app can start offline after a single visit.
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'cache' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        data.urls
          .filter((u) => typeof u === 'string' && isStatic(new URL(u)))
          .map((u) =>
            cache.match(u).then((hit) => {
              if (hit) return;
              // Ask the way the browser did: the font stylesheet is a plain <link> (no-cors), the
              // font files themselves are fetched with CORS, and a cached answer must match.
              const req = new Request(u, { mode: new URL(u).hostname === 'fonts.googleapis.com' ? 'no-cors' : 'cors' });
              return fetch(req)
                .then((res) => (res.ok || res.type === 'opaque' ? cache.put(u, res) : undefined))
                .catch(() => {});
            }),
          ),
      ),
    ),
  );
});

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
