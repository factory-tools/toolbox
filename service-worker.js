// V9: offline cache disabled to ensure GitHub Pages always loads the newest files.
self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k))); await self.clients.claim(); })()));
self.addEventListener('fetch', event => { event.respondWith(fetch(event.request)); });
