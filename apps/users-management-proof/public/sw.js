const CACHE = 'cmz-shell-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;
    const cacheableDestination = [
        'document',
        'script',
        'style',
        'image',
        'font',
    ].includes(event.request.destination);
    if (event.request.mode !== 'navigate' && !cacheableDestination) return;
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                if (response.ok && response.type === 'basic') {
                    const copy = response.clone();
                    void caches
                        .open(CACHE)
                        .then((cache) => cache.put(event.request, copy));
                }
                return response;
            })
            .catch(() =>
                caches
                    .match(event.request)
                    .then((hit) => hit ?? caches.match('/index.html'))
            )
    );
});
