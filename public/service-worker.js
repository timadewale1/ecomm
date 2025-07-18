/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'my-thrift-cache-v1';
const urlsToCache = [
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/logo.png',
  '/logoInvert.png',
  '/offline.html',
  '/pwa-assets/step-1.jpg',
  '/pwa-assets/step-2.jpg',
  '/pwa-assets/step-3.jpg',
  '/pwa-assets/step-4.jpg',
  '/pwa-assets/step-5.jpg',
  '/apple-splash-640-1136.jpg',
  '/apple-splash-750-1334.jpg',
  '/apple-splash-828-1792.jpg',
  '/apple-splash-1125-2436.jpg',
  '/apple-splash-1136-640.jpg',
  '/apple-splash-1170-2532.jpg',
  '/apple-splash-1179-2556.jpg',
  '/apple-splash-1206-2622.jpg',
  '/apple-splash-1242-2208.jpg',
  '/apple-splash-1284-2778.jpg',
  '/apple-splash-1242-2688.jpg',
  '/apple-splash-1290-2796.jpg',
  '/apple-splash-1320-2868.jpg',
  '/apple-splash-1334-750.jpg',
  '/apple-splash-1488-2266.jpg',
  '/apple-splash-1536-2048.jpg',
  '/apple-splash-1620-2160.jpg',
  '/apple-splash-1640-2360.jpg',
  '/apple-splash-1668-2224.jpg',
  '/apple-splash-1668-2388.jpg',
  '/apple-splash-1792-828.jpg',
  '/apple-splash-2048-1536.jpg',
  '/apple-splash-2048-2732.jpg',
  '/apple-splash-2160-1620.jpg',
  '/apple-splash-2208-1242.jpg',
  '/apple-splash-2224-1668.jpg',
  '/apple-splash-2266-1488.jpg',
  '/apple-splash-2360-1640.jpg',
  '/apple-splash-2388-1668.jpg',
  '/apple-splash-2436-1125.jpg',
  '/apple-splash-2532-1170.jpg',
  '/apple-splash-2556-1179.jpg',
  '/apple-splash-2622-1206.jpg',
  '/apple-splash-2688-1242.jpg',
  '/apple-splash-2732-2048.jpg',
  '/apple-splash-2778-1284.jpg',
  '/apple-splash-2796-1290.jpg',
  '/apple-splash-2868-1320.jpg'

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
  if (isBot) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Optionally cache new requests here
        return response;
      })
      .catch(() => {
        // Offline fallback logic
        return caches.match(event.request).then((res) => {
          if (res) return res;

          // Only fallback to offline page for HTML requests
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

