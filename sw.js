/* Service worker: app-shell caching + offline fallback.
   Network-first for HTML (so content stays fresh), cache-first for static assets. */
const CACHE = "gpm-v5";
const CORE = [
  "./", "index.html", "style.css", "script.js", "favicon.svg", "manifest.webmanifest", "cv.pdf",
  "news.html", "education.html", "experience.html", "presentations.html", "funding.html",
  "publications.html", "tree.html", "map.html", "tutoring.html"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // leave CDN / map tiles to the network

  const isHTML = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match("index.html")))
    );
  } else {
    e.respondWith(
      caches.match(req).then(m => m || fetch(req).then(r => {
        const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r;
      }))
    );
  }
});
