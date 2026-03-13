/* ========================================
   Opus CRM — Service Worker
   Cache-first for static assets, network-first for data
   ======================================== */

const CACHE_NAME = 'opus-crm-v1';
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

// Install — cache static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for local assets, network-first for CDN
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // CDN (Chart.js) — network first, fallback to cache
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
