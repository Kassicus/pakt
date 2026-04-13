/* pakt service worker — runtime-only caching, no precache */
const SW_VERSION = "v1";
const STATIC_CACHE = `pakt-static-${SW_VERSION}`;
const PHOTO_CACHE = `pakt-photos-${SW_VERSION}`;
const PHOTO_CACHE_MAX = 120;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("pakt-") && !k.endsWith(SW_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/chunks/") ||
      url.pathname.startsWith("/_next/static/css/") ||
      url.pathname.startsWith("/_next/static/media/")) &&
    !url.search
  );
}

function isPhoto(url) {
  return (
    url.hostname.endsWith(".blob.vercel-storage.com") ||
    url.hostname.endsWith(".public.blob.vercel-storage.com")
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
        if (maxEntries) await trimCache(cache, maxEntries);
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || fetch(request);
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const excess = keys.length - maxEntries;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") return; // network-only for HTML

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isPhoto(url)) {
    event.respondWith(staleWhileRevalidate(request, PHOTO_CACHE, PHOTO_CACHE_MAX));
    return;
  }
  // default: pass through
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
