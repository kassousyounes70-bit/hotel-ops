/* Hôtel Le Mirage — service worker: app shell works offline, data goes through Firestore's own offline cache */
const V = 'hotel-shell-v1';
const CDN = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => c.addAll(['/', '/manifest.json', '/icon-192.png', '/icon-512.png']).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Our own files: network first (so a new deploy shows up), cache as the offline fallback.
  if (u.origin === self.location.origin) {
    e.respondWith(
      fetch(r).then(res => {
        if (res && res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => caches.match(r).then(m => m || caches.match('/')))
    );
    return;
  }

  // Script/font CDNs: cache first, filled on first online visit.
  if (CDN.includes(u.hostname)) {
    e.respondWith(
      caches.match(r).then(m => m || fetch(r).then(res => {
        if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }))
    );
  }
  // Everything else (Firestore, Auth) is left alone.
});
