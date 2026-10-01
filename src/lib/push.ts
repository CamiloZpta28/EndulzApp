import webpush from "web-push";

import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mandar push, compartido entre el cron de recordatorios y los avisos
 * inmediatos de las entregas.
 *
 * Runtime Node: `web-push` firma con crypto de Node y no corre en edge.
 */

export type PushPayload = {
  title: string;
  body: string;
  /** Avisos con el mismo tag se reemplazan en vez de apilarse. */
  tag: string;
  /** Adónde lleva tocar la notificación. */
  url: string;
};

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

/** Las variables que faltan, por nombre. Vacío = se puede mandar. */
export function missingPushEnv() {
  return [
    ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
    ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY],
    ["VAPID_PRIVATE_KEY", process.env.VAPID_PRIVATE_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name as string);
}

let configured = false;

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hola@endulzapp.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/**
 * Manda a un dispositivo. Si el navegador ya desechó esa suscripción (404 o
 * 410), la borra: si no, se le seguiría intentando para siempre.
 */
export async function sendPush(
  admin: ReturnType<typeof createAdminClient>,
  target: PushTarget,
  payload: PushPayload,
): Promise<"sent" | "dropped" | "failed"> {
  configure();
  try {
    await webpush.sendNotification(
      {
        endpoint: target.endpoint,
        keys: { p256dh: target.p256dh, auth: target.auth },
      },
      JSON.stringify(payload),
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await admin.rpc("drop_push_subscription", { p_endpoint: target.endpoint });
      return "dropped";
    }
    console.error("push falló:", status ?? error);
    return "failed";
  }
}
