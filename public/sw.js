// Service worker de SaveWise.
// Privacidad: NO guarda páginas ni datos financieros en el teléfono. Solo cachea archivos estáticos
// (JS/CSS con hash, íconos) y una pantalla "sin conexión".
const VERSION = "savewise-v1";
const PRECACHE = ["/offline", "/iconos/icono-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Archivos estáticos con hash en el nombre: nunca cambian, se sirven desde la caché.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/iconos/")) {
    event.respondWith(
      caches.match(request).then(
        (guardado) =>
          guardado ||
          fetch(request).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copia));
            }
            return respuesta;
          }),
      ),
    );
    return;
  }

  // Navegación: siempre a la red (datos frescos y privados). Sin conexión: pantalla "offline".
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let aviso;
  try {
    aviso = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(String(aviso.titulo || "SaveWise"), {
      body: String(aviso.cuerpo || ""),
      icon: "/iconos/icono-192.png",
      badge: "/iconos/icono-192.png",
      data: { url: typeof aviso.url === "string" ? aviso.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Solo rutas internas: un aviso nunca puede abrir un sitio externo.
  const destino = new URL(event.notification.data?.url || "/", self.location.origin);
  const url = destino.origin === self.location.origin ? destino.href : self.location.origin;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url.startsWith(self.location.origin));
      if (abierta) return abierta.navigate(url).then((v) => v && v.focus());
      return self.clients.openWindow(url);
    }),
  );
});
