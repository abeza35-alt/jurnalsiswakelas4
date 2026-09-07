// Service Worker - Catatan Pengumpulan Tugas SDIT Muhammadiyah Harjamukti
const CACHE_VERSION = 'sditmuha-v60';
const CORE_CACHE = `core-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-16.png',
  './icons/icon-32.png',
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-128.png',
  './icons/icon-144.png',
  './icons/icon-152.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-256.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/logo.png',
  './audio/lagu-dasbor.mp3'
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.1/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE_CACHE);
      await cache.addAll(CORE_ASSETS);
      const runtime = await caches.open(RUNTIME_CACHE);
      await Promise.all(
        CDN_ASSETS.map((url) =>
          fetch(url, { mode: 'no-cors' })
            .then((res) => runtime.put(url, res))
            .catch(() => {})
        )
      );
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== CORE_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);
        const cache = await caches.open(
          request.url.startsWith(self.location.origin) ? CORE_CACHE : RUNTIME_CACHE
        );
        cache.put(request, response.clone());
        return response;
      } catch (err) {
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 408, statusText: 'Offline' });
      }
    })()
  );
});
