/* Service worker del portal: permite abrir la portada, la agenda y la guía
   sin señal (zonas con cobertura débil). Sube VERSION para invalidar cachés. */
const VERSION = 'vsr-v2';
const SHELL = ['/', '/agenda.html', '/que-hacer.html', '/guia-practica.html', '/alojamientos.html', '/gastronomia.html',
  '/css/tw-base.css', '/css/styles.css', '/css/fonts.css', '/fonts/rubik-latin.woff2', '/fonts/rubik-latin.woff2'];
const NO_CACHE = /^\/(admin|api\/(vote|ratings|track|bot|weather))/;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return (await cache.match(req)) || (req.mode === 'navigate' ? cache.match('/') : Promise.reject(err));
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || fresh;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || NO_CACHE.test(url.pathname)) return;
  if (req.mode === 'navigate' || url.pathname === '/api/data') e.respondWith(networkFirst(req));
  else if (/\.(?:css|js|woff2|webp|jpe?g|png|svg)$/.test(url.pathname)) e.respondWith(staleWhileRevalidate(req));
});
