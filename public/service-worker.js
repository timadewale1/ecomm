/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'my-thrift-cache-v1';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return the cached response if available
        if (response) {
          return response;
        }
  
        // Attempt to fetch the resource from the network
        return fetch(event.request).catch(() => {
          // Optionally, return a fallback resource if fetch fails
          return caches.match('/index.html'); // Ensure fallback.html is cached
        });
      })
    );
  });
