/* E-Horta — Service Worker
 * Estratégias:
 *  - Navegação (documentos): stale-while-revalidate — primeira visita popula o
 *    cache "pages"; visitas seguintes respondem da cópia local e atualizam em
 *    segundo plano; offline usa a última cópia (shell da loja).
 *  - Estáticos (`/_next/static/`, `/icons`): stale-while-revalidate.
 *  - API (`/api/`) e não-GET: passam direto (nunca cachear dados mutáveis).
 */
const CACHE_VERSION = 'v1';
const PAGES_CACHE = `e-horta-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `e-horta-assets-${CACHE_VERSION}`;

const ASSET_PREFIXES = ['/_next/static/', '/icons/', '/favicon'];

self.addEventListener('install', () => {
  // Não deixa uma versão antiga esperando: ativa a atual imediatamente.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('e-horta-') && !key.endsWith(`-${CACHE_VERSION}`))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.webmanifest') return;

  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request, PAGES_CACHE));
    return;
  }

  if (ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE));
  }
});

/**
 * Serve a cópia em cache imediatamente quando existe e atualiza do servidor em
 * segundo plano; sem cópia, busca na rede e popula o cache (fallback offline
 * para `Response.error()`).
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const refresh = () =>
    fetch(request).then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });

  if (cached) {
    refresh().catch(() => undefined);
    return cached;
  }

  return (await refresh().catch(() => undefined)) ?? Response.error();
}