const CACHE_NAME = 'factory-toolbox-v4-20260801-1525';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './style.css?v=20260801-1525',
  './app.js?v=20260801-1525',
  './manifest.json?v=20260801-1525'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // HTML/navigation uses network first so GitHub updates appear immediately.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other files use cache first, with a network fallback.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
