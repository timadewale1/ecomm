/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'my-thrift-cache-v1';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/apple-splash-1284-2778.jpg'
  
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
  const userAgent = event.request.headers.get('User-Agent') || '';
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);

  if (isBot) {
    // Do not interfere with bot requests, let them hit the network directly
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      return fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});

