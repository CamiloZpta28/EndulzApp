"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca los datos del servidor sin recargar la página, para que lo que
 * hace otra persona aparezca solo.
 *
 * Se refresca al volver a la pestaña, al recuperar el foco y en un intervalo
 * mientras la pestaña está visible. `router.refresh()` vuelve a pedir solo el
 * payload RSC y conserva el estado del cliente — no se pierde lo que haya
 * escrito en un formulario ni la pestaña en la que estaba.
 *
 * Por qué no Supabase Realtime: la vía natural sería suscribirse a los
 * cambios de `members`, pero esos eventos se arman desde el WAL y traen
 * TODAS las columnas de la fila, `assigned_to` incluida. Es decir, le
 * llegarían los emparejamientos al navegador de cualquiera después del
 * sorteo, aunque el código no los lea — visibles en devtools. Los permisos
 * por columna que protegen ese secreto no aplican ahí, así que sondear es la
 * opción que no lo rompe.
 */
export function AutoRefresh({ intervalMs = 20_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      stop();
      timer = setInterval(() => router.refresh(), intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        start();
      } else {
        // Una pestaña de fondo no necesita datos frescos.
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [router, intervalMs]);

  return null;
}
