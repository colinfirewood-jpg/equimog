// Mode hors ligne : tous les fichiers de l'app sont gardés sur le téléphone.
// À chaque nouvelle version publiée, augmenter VERSION pour que les téléphones la récupèrent.
const VERSION = 'equimog-1.0.0';

const FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './vendor/jspdf.umd.min.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/nav.js',
  './js/ui.js',
  './js/store.js',
  './js/demo.js',
  './js/format.js',
  './js/questionnaire.js',
  './js/pdf.js',
  './js/export.js',
  './js/views/home.js',
  './js/views/nouveau.js',
  './js/views/saisie.js',
  './js/views/recap.js',
  './js/views/settings.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request)),
  );
});
