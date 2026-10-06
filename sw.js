const NOME_DO_CACHE = "app-cache-v1"
const PARA_CAHEAR = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './icon.png'
]

self.addEventListener(
    'install',
    (event) => {
        event.waitUntil(
            caches.open(NOME_DO_CACHE).then(
                (cache) => {
                    return cache.addAll(PARA_CAHEAR);
                }
            )
        );
    }
);

self.addEventListener(
    'fetch',
    (event) => {
        event.respondWith(
            caches.match(event.request).then(
                (response) => {
                    return response || fetch(event.request());
                }
            )
        );
    }
);