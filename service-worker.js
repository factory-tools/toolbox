// V12: intentionally unregister offline caching to always load the newest GitHub Pages files.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',()=>{});
