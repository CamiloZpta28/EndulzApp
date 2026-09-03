import { headers } from "next/headers";

/**
 * El origen público de esta petición (`https://mi-app.vercel.app`).
 *
 * Sale de los headers en vez de una variable de entorno para que el enlace de
 * invitación salga correcto en localhost, en cada preview de Vercel y en
 * producción sin tocar la configuración. `NEXT_PUBLIC_SITE_URL` queda solo
 * como red de seguridad si algún proxy no manda `host`.
 */
export async function getSiteOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");

  if (host) {
    const proto =
      headerList.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
}
