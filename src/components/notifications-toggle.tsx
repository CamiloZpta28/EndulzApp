"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/lib/actions/push";

/** El navegador entrega las llaves en binario; el servidor las guarda en texto. */
function toBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** VAPID viaja como base64url y `subscribe()` pide bytes. */
function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Estado =
  | "cargando"
  | "no-soportado"
  | "necesita-instalar"
  | "bloqueado"
  | "apagado"
  | "encendido";

/**
 * El interruptor de recordatorios de este dispositivo.
 *
 * Los estados existen porque las razones por las que esto no funciona son muy
 * distintas y cada una necesita otra explicación:
 *
 *  - `no-soportado`: el navegador no tiene push. No hay nada que hacer.
 *  - `necesita-instalar`: iOS solo permite push a una app agregada a la
 *    pantalla de inicio. Es la trampa que más confunde, porque el botón se
 *    vería normal y al tocarlo fallaría sin explicación.
 *  - `bloqueado`: ya dijo "no" una vez. El navegador no vuelve a preguntar,
 *    hay que cambiarlo desde los ajustes del sitio.
 */
export function NotificationsToggle() {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelado = false;

    (async () => {
      const soportado =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      // iOS: `standalone` solo existe en Safari y solo es `true` dentro de la
      // app instalada. Se combina con el media query para cubrir Android.
      const instalado =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as { standalone?: boolean }).standalone === true;
      const esIOS =
        /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

      if (!soportado) {
        if (!cancelado) setEstado(esIOS && !instalado ? "necesita-instalar" : "no-soportado");
        return;
      }
      if (esIOS && !instalado) {
        if (!cancelado) setEstado("necesita-instalar");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelado) setEstado("bloqueado");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existente = await registration.pushManager.getSubscription();

      if (cancelado) return;
      if (existente) {
        setEndpoint(existente.endpoint);
        setEstado("encendido");
      } else {
        setEstado("apagado");
      }
    })().catch(() => {
      if (!cancelado) setEstado("no-soportado");
    });

    return () => {
      cancelado = true;
    };
  }, []);

  const encender = () => {
    startTransition(async () => {
      try {
        const permiso = await Notification.requestPermission();
        if (permiso !== "granted") {
          setEstado(permiso === "denied" ? "bloqueado" : "apagado");
          return;
        }

        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          toast.error("Faltan las llaves de notificaciones en el servidor.");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          // Obligatorio en todos los navegadores actuales: no se permiten
          // pushes silenciosos.
          userVisibleOnly: true,
          applicationServerKey: fromBase64Url(publicKey),
        });

        const result = await savePushSubscription({
          endpoint: subscription.endpoint,
          p256dh: toBase64Url(subscription.getKey("p256dh")),
          auth: toBase64Url(subscription.getKey("auth")),
          userAgent: navigator.userAgent,
        });

        if (!result.ok) {
          await subscription.unsubscribe();
          toast.error(result.message ?? "No pudimos activarlos.");
          return;
        }

        setEndpoint(subscription.endpoint);
        setEstado("encendido");
        toast.success(result.message ?? "Recordatorios activados.");
      } catch {
        toast.error("El navegador no dejó activar las notificaciones.");
      }
    });
  };

  const apagar = () => {
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const target = subscription?.endpoint ?? endpoint;

        await subscription?.unsubscribe();
        if (target) await removePushSubscription(target);

        setEndpoint(null);
        setEstado("apagado");
        toast.success("Recordatorios apagados en este dispositivo.");
      } catch {
        toast.error("No pudimos apagarlos.");
      }
    });
  };

  if (estado === "cargando") {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Revisando notificaciones…
      </p>
    );
  }

  if (estado === "necesita-instalar") {
    return (
      <div className="bg-muted/50 space-y-1 rounded-xl border border-dashed p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          Instala la app para recibir recordatorios
        </p>
        <p className="text-muted-foreground text-xs">
          En iPhone las notificaciones solo funcionan si agregas EndulzApp a la
          pantalla de inicio: toca «Compartir» y luego «Agregar a inicio».
          Después vuelve acá y actívalas.
        </p>
      </div>
    );
  }

  if (estado === "no-soportado") {
    return (
      <p className="text-muted-foreground text-sm">
        Este navegador no soporta notificaciones. Puedes agregar las fechas a
        tu calendario desde la pestaña del grupo.
      </p>
    );
  }

  if (estado === "bloqueado") {
    return (
      <div className="bg-muted/50 space-y-1 rounded-xl border border-dashed p-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <BellOff className="size-3.5 shrink-0" aria-hidden />
          Notificaciones bloqueadas
        </p>
        <p className="text-muted-foreground text-xs">
          Le dijiste «no» antes y el navegador no vuelve a preguntar. Se
          cambia en los ajustes del sitio (el candado junto a la dirección) y
          después recargas.
        </p>
      </div>
    );
  }

  const encendido = estado === "encendido";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={encendido ? "outline" : "default"}
        className="w-full"
        onClick={encendido ? apagar : encender}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Un momento…
          </>
        ) : encendido ? (
          <>
            <BellOff className="size-4" aria-hidden />
            Apagar recordatorios en este dispositivo
          </>
        ) : (
          <>
            <Bell className="size-4" aria-hidden />
            Activar recordatorios
          </>
        )}
      </Button>
      <p className="text-muted-foreground text-xs">
        Te avisamos 3 días antes y el mismo día de cada endulzada, y del
        descubrimiento. Se activa por dispositivo, así que hazlo en el celular
        si es ahí donde quieres el aviso.
      </p>
    </div>
  );
}
