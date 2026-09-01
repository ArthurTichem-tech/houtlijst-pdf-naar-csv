const CACHE = 'houtlijst-v2';
const ROOT = self.registration.scope;
const OFFLINE_ASSETS = [
  '',
  'manifest.webmanifest',
  'favicon.svg',
  'icon-192.png',
  'icon-512.png',
  'pdf.worker.min.mjs',
  'tesseract-worker.min.js',
  'tessdata/eng.traineddata.gz',
  'tesseract-core/tesseract-core-lstm.wasm.js',
  'tesseract-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core/tesseract-core-relaxedsimd.wasm.js',
  'tesseract-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract-core/tesseract-core-simd.wasm.js',
  'tesseract-core/tesseract-core.wasm.js',
].map((path) => new URL(path, ROOT).href);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(OFFLINE_ASSETS.map((asset) => cache.add(asset)))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(ROOT))));
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => {
    const network = fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
      return response;
    });
    return cached || network;
  }));
});
