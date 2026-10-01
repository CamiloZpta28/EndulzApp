import { missingPushEnv, sendPush, type PushPayload } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DeliveryPushTarget } from "@/lib/types";

/**
 * Los avisos push de las entregas. Solo servidor, y siempre dentro de un
 * `after()`: la persona no tiene por qué esperar a que salga la notificación
 * para ver su cambio guardado.
 *
 * Ningún texto nombra a quien da. A quien da sí se le puede hablar con
 * confianza: ya sabe a quién le dio.
 */

export type DeliveryNotice =
  /** Para quien recibe: la dejaron. */
  | "llego"
  /** Para quien recibe: la cambiaron de escondite tras un "no la encuentro". */
  | "pista"
  /** Para quien da. */
  | "encontrada"
  | "no_la_encuentro";

function buildPayload(
  notice: DeliveryNotice,
  target: DeliveryPushTarget,
  deliveryId: string,
): PushPayload {
  const title = `${target.emoji ? `${target.emoji} ` : ""}${target.group_name}`;
  const url = `/g/${target.group_id}`;
  const tag = `entrega-${deliveryId}`;

  switch (notice) {
    case "llego":
      return {
        title,
        body: "¡Te dejaron una endulzada! Entra a ver dónde quedó escondida.",
        tag,
        url,
      };
    case "pista":
      return {
        title,
        body: "Te dejaron una pista nueva para encontrar tu endulzada.",
        tag,
        url,
      };
    case "encontrada":
      return {
        title,
        body: "¡La encontró! Tu endulzada llegó a buen puerto. 🙌",
        tag,
        url,
      };
    case "no_la_encuentro":
      return {
        title,
        body: "No encuentra la endulzada que le dejaste. Dale otra pista.",
        tag,
        url,
      };
  }
}

export async function notifyDelivery(deliveryId: string, notice: DeliveryNotice) {
  // Sin llaves no hay push. No es un error: la app funciona sin avisos.
  if (missingPushEnv().length > 0) return;

  const to = notice === "llego" || notice === "pista" ? "recipient" : "giver";
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("delivery_push_targets", {
    p_delivery: deliveryId,
    p_to: to,
  });

  if (error) {
    console.error("delivery_push_targets falló:", error.message);
    return;
  }

  for (const target of data ?? []) {
    await sendPush(admin, target, buildPayload(notice, target, deliveryId));
  }
}
