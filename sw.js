// BNFC Monitor Service Worker v2
const CACHE = 'bnfc-2627-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './auth.js',
  './manifest.json',
  './images/logo.png',
  './images/Alexandra.png',
  './images/Ari.png',
  './images/Ashleigh.png',
  './images/Catherine D.png',
  './images/Catherine S.png',
  './images/Daphne.png',
  './images/Elizabeth.png',
  './images/Francesca.png',
  './images/Kat.png',
  './images/Kayla.png',
  './images/Lila.png',
  './images/Matilda.png',
  './images/Rayna.png',
  './images/Scarlett.png',
  './images/Silje.png',
];

// Always go to network for these
const NETWORK_ONLY = [
  'firebasedatabase.app',
  'googleapis.com',
  'firebaseapp.com',
  'gstatic.com',
  'accounts.google.com',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Network only for Firebase, Google Auth, CDN
  if (NETWORK_ONLY.some(domain => url.includes(domain))) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Cache first for app assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
