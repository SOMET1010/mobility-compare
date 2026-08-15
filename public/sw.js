/*
 * Service worker MOBILIS — hors-ligne partiel (exigence CDC §8).
 * Stratégie volontairement conservatrice :
 *   - /assets/* (fichiers empreints par Vite, immuables) : cache d'abord ;
 *   - navigations : réseau d'abord, repli sur la coquille en cache si hors
 *     connexion (les favoris et récents vivent déjà dans localStorage) ;
 *   - tout le reste (API tierces, tuiles carte) : jamais intercepté.
 * Le nom de cache change à chaque révision incompatible → purge automatique.
 */
const CACHE = 'mobilis-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
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
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // tiers : jamais interceptés

  // Ressources empreintes (immuables) : cache d'abord.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Navigations SPA : réseau d'abord, repli hors-ligne sur la coquille.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/__shell', copy));
          return response;
        })
        .catch(() => caches.match('/__shell')),
    );
  }
});
