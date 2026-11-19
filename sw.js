/* Word Quest service worker. The page is network first (so a new version arrives as soon as he is online)
   and falls back to the cached copy offline. Manifest, icons and fonts are cache first. */
'use strict';
const CACHE = 'wqroman-2026-11-19r1';
const CORE = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './fonts/cinzel-latin-600-normal.woff2', './fonts/cinzel-latin-700-normal.woff2', './fonts/atkinson-hyperlegible-latin-400-normal.woff2', './fonts/atkinson-hyperlegible-latin-700-normal.woff2', './fonts/atkinson-hyperlegible-latin-400-italic.woff2'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    // one missing file (an icon not made yet) must not stop the rest
    Promise.all(CORE.map(u => cache.add(u).catch(() => null)))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('wqroman-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function isPage(req, url){
  return req.mode === 'navigate' || (url.origin === self.location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('.html')));
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(isPage(req, url)){
    event.respondWith(fetch(req).then(res => {
      if(res && res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put('./', copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.open(CACHE).then(c => c.match(req, {ignoreSearch:true}).then(r => r || c.match('./')))));
    return;
  }
  if(url.origin === self.location.origin){
    event.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => {
      if(hit) return hit;
      return fetch(req).then(res => {
        if(res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => {});
        return res;
      });
    })));
  }
});
