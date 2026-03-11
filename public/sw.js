const CACHE_NAME = 'ninjago-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sprite.png',
  '/audio/ninjago_menu_music_8bit.wav',
  '/audio/ninjago_battle_music_8bit.wav',
  '/audio/sfx_lightning_8bit.wav',
  '/audio/sfx_spinjitzu_8bit.wav'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
