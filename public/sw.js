/**
 * Service worker de EndulzApp.
 *
 * Solo hace dos cosas: mostrar la notificación que llega por push y abrir el
 * grupo correcto al tocarla. A propósito NO cachea nada — una app que depende
 * de datos vivos (quién se unió, qué antojos hay) servida desde un caché
 * viejo confunde más de lo que ayuda, y ya tenemos `AutoRefresh` para eso.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "EndulzApp", body: event.data.text() };
  }

  const title = payload.title || "EndulzApp";
  const options = {
    body: payload.body || "",
    icon: "/icon",
    badge: "/icon",
    // Agrupa por evento: si llegan dos avisos del mismo grupo, el segundo
    // reemplaza al primero en vez de apilarse.
    tag: payload.tag || "endulzapp",
    renotify: true,
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Si la app ya está abierta, se reutiliza esa ventana en vez de abrir
      // otra — en celular abrir una segunda instancia se siente roto.
      for (const client of clientList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
