// Nipëi OS service worker — read-only offline for the aldeia's weak signal.
// Pages: network first, fall back to the last copy (Hoje if the page was never opened).
// Static assets (/_next/static): cache first. Server actions (POST) and APIs are never cached.
// Logging out (/login) wipes the page cache so another person on the device sees nothing.
const PAGINAS = "nipei-paginas-v1";
const ESTATICOS = "nipei-estaticos-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![PAGINAS, ESTATICOS].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/")) {
    e.respondWith(caches.open(ESTATICOS).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }

  if (req.mode === "navigate") {
    if (url.pathname === "/login" || url.pathname === "/entrar") {
      e.waitUntil(caches.delete(PAGINAS));
      return;
    }
    e.respondWith(
      fetch(req).then((r) => {
        if (r.ok && !r.redirected) caches.open(PAGINAS).then((c) => c.put(url.pathname + url.search, r.clone()));
        return r;
      }).catch(async () => {
        const c = await caches.open(PAGINAS);
        return (await c.match(url.pathname + url.search)) || (await c.match(url.pathname)) || (await c.match("/hoje")) ||
          new Response("<meta charset=utf-8><p style='font-family:sans-serif;padding:2rem'>Sem conexão. Abra a Hoje quando tiver sinal para ela ficar disponível offline.</p>", { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }),
    );
  }
});
