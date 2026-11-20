// Brasil ao Vivo – service worker
// Network first: always show the latest events when online,
// fall back to the last saved copy when offline.
const CACHE = 'bav-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './fonts/dm-serif-display-latin-400-normal.woff2', './fonts/dm-serif-display-latin-400-italic.woff2', './fonts/manrope-latin-wght-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // only this site's own files
  // Pages always ask the server for the newest version (no 10-minute browser cache)
  const net = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req);
  e.respondWith(
    net
      .then(res => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(m => m || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
