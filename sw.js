const VERSION = 'v2.1.2';
const STATIC = `anadolu-static-${VERSION}`;
const RUNTIME = `anadolu-runtime-${VERSION}`;

/** Yalnız kritik ve küçük dosyalar — büyük 512 install sırasında manifest’ten gelir */
const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.webmanifest',
  './styles/main.css',
  './styles/tokens.css',
  './styles/_base.css',
  './styles/motion.css',
  './js/main.js',
  './js/config.js',
  './js/app.js',
  './js/utils/sanitize.js',
  './js/utils/markdown.js',
  './js/services/storage.js',
  './js/services/offlineQueue.js',
  './js/services/gemini.js',
  './js/dom/messageRenderer.js',
  './js/dom/virtualList.js',
  './js/features/theme.js',
  './js/features/pwa.js',
  './js/features/speech.js',
  './js/features/modal.js',
  './assets/icons/icon-192.png',
];

const RUNTIME_ALLOWED = /\.(css|js|png|webp|woff2|webmanifest)$/i;

async function precacheAll(cache, urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        await cache.add(url);
      } catch (err) {
        console.warn('[SW] precache skip:', url, err);
      }
    }),
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC).then((cache) => precacheAll(cache, PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC && k !== RUNTIME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (RUNTIME_ALLOWED.test(url.pathname) || url.pathname.includes('/js/')) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstPage(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(STATIC);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return (
      (await caches.match(request)) ||
      (await caches.match('./index.html')) ||
      (await caches.match('./offline.html'))
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || networkPromise || new Response('Offline', { status: 504 });
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
