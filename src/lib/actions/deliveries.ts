"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { notifyDelivery } from "@/lib/delivery-notify";
import {
  deliveryPhotosEnabled,
  removeDeliveryPhoto,
  uploadDeliveryPhoto,
} from "@/lib/delivery-photos";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, done, fail, toMessage } from "./types";

/**
 * Las entregas de endulzadas.
 *
 * Toda decisión de "quién puede qué" la toma la base con la sesión de quien
 * pide (`deliver_endulzada`, `set_delivery_photo`, …). La llave de servicio
 * solo entra DESPUÉS, para lo que un usuario no puede hacer por sí mismo:
 * guardar la foto en el bucket privado y avisarle a la otra persona.
 */

/**
 * "Ya la dejé" / "Ya la tengo lista". Sirve también para editar: la base hace
 * upsert sobre (endulzada, quien recibe).
 */
export async function saveDelivery(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const endulzadaId = String(formData.get("endulzada_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  // Solo para el texto de confirmación. Lo que de verdad depende del modo
  // (si se guarda el mensaje, si se avisa) lo decide la base.
  const hidden = formData.get("mode") === "escondida";

  if (!groupId || !endulzadaId) return fail("Falta escoger la endulzada.");
  if (message.length > 500) return fail("El mensaje es muy largo (máximo 500).");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("deliver_endulzada", {
    p_group: groupId,
    p_endulzada: endulzadaId,
    p_message: message || null,
  });

  const row = data?.[0];
  if (error || !row) {
    return fail(toMessage(error, "No pudimos guardar la entrega."));
  }

  const photoProblem = hidden
    ? await applyPhoto(supabase, row.delivery_id, formData)
    : null;

  // La base dice si amerita aviso: la primera vez, o un escondite nuevo tras
  // un "no la encuentro". Corregir una coma no le manda push a nadie.
  const notice = row.notice;
  if (notice) after(() => notifyDelivery(row.delivery_id, notice));

  revalidatePath(`/g/${groupId}`);

  if (photoProblem) return fail(`El aviso quedó, pero la foto no: ${photoProblem}`);
  return done(
    hidden
      ? "Listo, ya le avisamos. No va a saber que fuiste tú."
      : "Listo, quedó marcada como lista.",
  );
}

/** Foto nueva, foto quitada o nada. Devuelve un problema legible, o `null`. */
async function applyPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deliveryId: string,
  formData: FormData,
): Promise<string | null> {
  const image = formData.get("image");
  const clear = formData.get("image_clear") === "1";

  if (image instanceof File && image.size > 0) {
    if (!deliveryPhotosEnabled()) {
      return "el servidor todavía no tiene configuradas las fotos.";
    }

    const uploaded = await uploadDeliveryPhoto(deliveryId, image);
    if ("error" in uploaded) return uploaded.error;

    const { data: oldPath, error } = await supabase.rpc("set_delivery_photo", {
      p_delivery: deliveryId,
      p_path: uploaded.path,
    });
    if (error) {
      // La base no la aceptó: el archivo recién subido sobra.
      await removeDeliveryPhoto(uploaded.path);
      return toMessage(error, "no se pudo guardar.");
    }
    await removeDeliveryPhoto(oldPath);
    return null;
  }

  if (clear) {
    const { data: oldPath, error } = await supabase.rpc("set_delivery_photo", {
      p_delivery: deliveryId,
      p_path: null,
    });
    if (error) return toMessage(error, "no se pudo quitar.");
    await removeDeliveryPhoto(oldPath);
  }

  return null;
}

/** Quien da se arrepiente, mientras no la hayan encontrado. */
export async function undoDelivery(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const deliveryId = String(formData.get("delivery_id") ?? "");
  if (!groupId || !deliveryId) return fail("Falta la entrega.");

  const supabase = await createClient();
  const { data: photoPath, error } = await supabase.rpc("undo_delivery", {
    p_delivery: deliveryId,
  });
  if (error) return fail(toMessage(error, "No pudimos deshacerla."));

  await removeDeliveryPhoto(photoPath);
  revalidatePath(`/g/${groupId}`);
  return done("Listo, se deshizo.");
}

/** Quien recibe: "¡La encontré!" o "No la encuentro". Solo esos dos. */
export async function respondDelivery(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const deliveryId = String(formData.get("delivery_id") ?? "");
  const status = formData.get("status");
  if (!groupId || !deliveryId) return fail("Falta la entrega.");
  if (status !== "encontrada" && status !== "no_la_encuentro") {
    return fail("Respuesta inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_delivery", {
    p_delivery: deliveryId,
    p_status: status,
  });
  if (error) return fail(toMessage(error, "No pudimos guardar tu respuesta."));

  after(() => notifyDelivery(deliveryId, status));

  revalidatePath(`/g/${groupId}`);
  return done(
    status === "encontrada"
      ? "¡Qué bien! Ya le avisamos."
      : "Le avisamos para que te dé otra pista.",
  );
}
