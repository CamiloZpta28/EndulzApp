"use server";

import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

/**
 * Guarda un dispositivo suscrito.
 *
 * Una fila por dispositivo y no por persona: alguien tiene el celular y el
 * computador y quiere el aviso en los dos. `endpoint` es único, así que
 * volver a suscribir el mismo dispositivo actualiza en vez de duplicar — el
 * navegador puede rotar las llaves de una suscripción y hay que quedarse con
 * las nuevas.
 */
export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<ActionState> {
  const { endpoint, p256dh, auth, userAgent } = input;
  if (!endpoint || !p256dh || !auth) {
    return fail("La suscripción llegó incompleta.");
  }

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Inicia sesión para activar los recordatorios.");

  // Sin `upsert` sobre `endpoint`: el borrado + inserción deja la fila con el
  // `user_id` correcto incluso si el mismo dispositivo cambió de cuenta.
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: userAgent?.slice(0, 300) ?? null,
  });

  if (error) {
    return fail(toMessage(error, "No pudimos activar los recordatorios."));
  }

  return done("Recordatorios activados en este dispositivo.");
}

/** Da de baja este dispositivo. */
export async function removePushSubscription(
  endpoint: string,
): Promise<ActionState> {
  if (!endpoint) return fail("Falta el dispositivo.");

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Inicia sesión.");

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    return fail(toMessage(error, "No pudimos apagar los recordatorios."));
  }

  return done("Recordatorios apagados en este dispositivo.");
}
