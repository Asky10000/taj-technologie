/* Service worker TAJ Technologie — installable (PWA), sûr pour une app qui
   évolue souvent : l'API n'est jamais mise en cache, les navigations passent
   par le réseau d'abord (app toujours à jour), seuls les statiques sont cachés. */
const CACHE = 'taj-v1';
const SHELL = ['/'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // seulement le même domaine
  if (url.pathname.startsWith('/api')) return;      // jamais l'API

  // Navigations : réseau d'abord, repli sur le cache (ou l'accueil) hors-ligne.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((r) => r || caches.match('/')),
      ),
    );
    return;
  }

  // Statiques : cache d'abord, sinon réseau (et mise en cache).
  const isStatic =
    url.pathname.startsWith('/_next/static') ||
    /\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|css|js)$/.test(url.pathname);

  if (!isStatic) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request)
          .then((resp) => {
            if (resp && resp.ok) {
              const copy = resp.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return resp;
          })
          .catch(() => cached),
    ),
  );
});
