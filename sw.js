"use strict";

/* ===== Service Worker — Cache-first strategy for offline support ===== */
var CACHE_NAME = 'hw-design-v1';

var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/capacitor.js',
  '/js/safety.js',
  '/js/models/capacitor-model.js',
  '/js/models/safety-model.js',
  '/hwlogo.png'
];

// ── Install: cache all static assets upfront ────────────────
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function () {
      self.skipWaiting(); // activate immediately
    })
  );
});

// ── Activate: clean up stale caches from previous versions ──
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) {
          return name !== CACHE_NAME;
        }).map(function (name) {
          return caches.delete(name);
        })
      );
    }).then(function () {
      self.clients.claim(); // take control of all open pages
    })
  );
});

// ── Fetch: cache-first for known assets, network-first for API ──
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);

  // API calls go through the network first (with fallback to cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then(function (response) {
        // Optionally clone & cache successful API responses
        var cloned = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, cloned);
        });
        return response;
      }).catch(function () {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Static assets: cache-first strategy
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        return cached;
      }
      // Not in cache — fetch from network, then cache for next time
      return fetch(event.request).then(function (response) {
        var cloned = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, cloned);
        });
        return response;
      }).catch(function () {
        // If offline and nothing cached, return index.html for SPA routing
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        throw new Error('No network and no cache');
      });
    })
  );
});
