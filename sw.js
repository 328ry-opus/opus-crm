/* ========================================
   Opus CRM — Service Worker
   Cache-first for static assets, network-first for CDN.

   HOW TO UPDATE:
   When deploying new code, increment the version number below.
   This triggers the activate event which clears old caches.
   Users will see an update notification banner.
   ======================================== */

const CACHE_VERSION = 2;
const CACHE_NAME = `opus-crm-v${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './leads.html',
  './clients.html',
  './tasks.html',
  './settings.html',
  './lead-detail.html',
  './client-detail.html',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/dashboard.css',
  './css/detail.css',
  './css/pipeline.css',
  './css/settings.css',
  './css/responsive.css',
  './js/config.js',
  './js/repository.js',
  './js/store.js',
  './js/ui.js',
  './js/dashboard.js',
  './js/leads.js',
  './js/clients.js',
  './js/tasks.js',
  './js/detail.js',
  './js/settings.js',
  './js/shortcuts.js',
  './assets/favicon.svg',
  './assets/icon-192.svg',
  './assets/icon-512.svg',
  './manifest.json',
];

// Install — cache static assets, wait for activation
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  // Don't skipWaiting — let the user decide when to update
});

// Activate — clean old caches, then notify clients
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      // Notify all open tabs that a new version is available
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for local assets, network-first for CDN
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // CDN (Chart.js etc.) — network first, fallback to cache
  if (url.hostname !== location.hostname) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Local assets — cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      });
    })
  );
});

// Listen for skip-waiting message from the page
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
