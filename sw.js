/* inDrive حسابات — service worker
   Toujours la DERNIÈRE version : réseau d'abord, et chaque page reçue remplace la copie de secours
   (sous "./" ET "./index.html"), pour ne jamais retomber sur une ancienne version sans internet. */
const CACHE = "indrive-v26";
const FILES = ["./manifest.json", "./id-icon-180.png", "./id-icon-192.png", "./id-icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(FILES).catch(() => {});
    try { const r = await fetch("./index.html", { cache: "reload" }); if (r.ok) { await c.put("./index.html", r.clone()); await c.put("./", r.clone()); } } catch (err) { /* hors ligne */ }
  }));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x)))));
  self.clients.claim();
});
const isPage = (req) => req.mode === "navigate" || /\/(index\.html)?(\?.*)?$/.test(new URL(req.url).pathname + new URL(req.url).search);
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  if (isPage(req)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const r = await Promise.race([fetch(req, { cache: "no-store" }), new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 6000))]);
        if (r && r.ok) { await c.put("./index.html", r.clone()); await c.put("./", r.clone()); }
        return r;
      } catch (err) {
        return (await c.match("./index.html")) || (await c.match("./")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => {}); return r; }).catch(() => caches.match(req)));
});
