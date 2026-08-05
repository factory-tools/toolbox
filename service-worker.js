// V13: no offline cache. Browser always loads latest GitHub Pages files.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));
