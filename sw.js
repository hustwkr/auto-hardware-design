"use strict";

/* ===== Service Worker — Pass-through only (no caching) ===== */
/* This file intentionally does NOT cache anything. All requests go to network. */

self.addEventListener('install', function () {
  // Skip waiting immediately so this version activates right away
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        return caches.delete(name);
      }));
    }).then(function () {
      self.clients.claim();
    })
  );
});

// All requests pass through to network — no caching
self.addEventListener('fetch', function (event) {
  // Do nothing — let the browser handle it normally
});
