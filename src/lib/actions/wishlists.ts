"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { parseHttpUrl, removeUploaded, uploadImage } from "@/lib/upload";
import type { WishlistType } from "@/lib/types";
import { type ActionState, done, fail, toMessage } from "./types";

const BUCKET = "wishlist-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function parseType(value: FormDataEntryValue | null): WishlistType | null {
  const type = String(value ?? "");
  return type === "endulzada" || type === "regalo" ? type : null;
}

/**
 * Resuelve qué hacer con la foto. Tres resultados, no dos:
 *
 *   `undefined` → no la tocaron, se conserva la que tenga
 *   `null`      → la quitaron a propósito (`image_clear=1`)
 *   string      → foto nueva (archivo subido o dirección pegada)
 *
 * Antes `image_url` llegaba siempre, vacío cuando no se había tocado nada, y
 * eso se leía como "quítala": editar el nombre de un antojo le borraba la
 * imagen y encima el archivo se iba de Storage. "No mandar nada" y "mandar
 * vacío" tienen que significar cosas distintas.
 */
async function resolveImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
): Promise<{ value: string | null | undefined } | { error: string }> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(supabase, {
      bucket: BUCKET,
      userId,
      file,
      maxBytes: MAX_IMAGE_BYTES,
      allowed: ALLOWED_MIME,
      label: "La imagen",
    });
    if ("error" in result) return { error: result.error };
    return { value: result.url };
  }

  // Quitarla es explícito.
  if (formData.get("image_clear") === "1") return { value: null };

  const raw = formData.get("image_url");
  // Ningún campo de foto en el formulario: se conserva la que tenía.
  if (raw === null) return { value: undefined };

  const text = String(raw).trim();
  if (!text) return { value: undefined };

  const url = parseHttpUrl(text);
  if (!url) return { error: "Esa dirección de imagen no parece válida." };
  return { value: url };
}

export async function addWishlistItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const type = parseType(formData.get("type"));
  const itemName = String(formData.get("item_name") ?? "").trim();

  if (!memberId || !type) return fail("Falta información del antojo.");
  if (!itemName) return fail("¿Qué es lo que quieres? Escríbelo.");

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Inicia sesión para editar tu lista.");

  const image = await resolveImage(supabase, user.id, formData);
  if ("error" in image) return fail(image.error);

  const { error } = await supabase.from("wishlists").insert({
    member_id: memberId,
    type,
    item_name: itemName,
    url: parseHttpUrl(formData.get("url")),
    note: String(formData.get("note") ?? "").trim() || null,
    image_url: image.value ?? null,
  });

  if (error) return fail(toMessage(error, "No pudimos guardar el antojo."));

  revalidatePath(`/g/${groupId}`);
  return done("Agregado a tu lista.");
}

export async function updateWishlistItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const itemName = String(formData.get("item_name") ?? "").trim();

  if (!itemId) return fail("Falta el antojo.");
  if (!itemName) return fail("El nombre no puede quedar vacío.");

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Inicia sesión para editar tu lista.");

  const image = await resolveImage(supabase, user.id, formData);
  if ("error" in image) return fail(image.error);

  const { data: before } = await supabase
    .from("wishlists")
    .select("image_url")
    .eq("id", itemId)
    .maybeSingle();

  const { error } = await supabase
    .from("wishlists")
    .update({
      item_name: itemName,
      url: parseHttpUrl(formData.get("url")),
      note: String(formData.get("note") ?? "").trim() || null,
      // `undefined` deja la columna como estaba.
      ...(image.value === undefined ? {} : { image_url: image.value }),
    })
    .eq("id", itemId);

  if (error) return fail(toMessage(error, "No pudimos actualizar el antojo."));

  // La foto vieja se borra solo si de verdad cambió, para no dejar basura en
  // Storage — ni borrar la que se sigue usando.
  if (
    image.value !== undefined &&
    before?.image_url &&
    before.image_url !== image.value
  ) {
    await removeUploaded(supabase, BUCKET, before.image_url);
  }

  revalidatePath(`/g/${groupId}`);
  return done("Antojo actualizado.");
}

export async function deleteWishlistItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) return fail("Falta el antojo.");

  const supabase = await createClient();

  // Se lee la ruta antes de borrar la fila, si no queda el objeto huérfano.
  const { data: item } = await supabase
    .from("wishlists")
    .select("image_url")
    .eq("id", itemId)
    .maybeSingle();

  const { error } = await supabase.from("wishlists").delete().eq("id", itemId);
  if (error) return fail(toMessage(error, "No pudimos borrar el antojo."));

  await removeUploaded(supabase, BUCKET, item?.image_url ?? null);

  revalidatePath(`/g/${groupId}`);
  return done("Antojo eliminado.");
}

/**
 * Guarda el orden de una sección: arriba lo que más se quiere.
 *
 * Firma simple (no `(prev, formData)`) porque las flechitas la llaman
 * directo dentro de un `startTransition`, no desde un `<form>`.
 *
 * Recibe el orden completo y no "sube este uno": así la misma acción sirve
 * para las flechas de hoy y para arrastrar después, y nunca quedan dos
 * antojos peleando por el mismo puesto.
 */
export async function reorderWishlist(input: {
  groupId: string;
  memberId: string;
  type: WishlistType;
  ids: string[];
}): Promise<ActionState> {
  const { groupId, memberId, type, ids } = input;

  if (!memberId || !type) return fail("Falta información de la lista.");
  if (ids.length === 0) return fail("No hay nada que ordenar.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_wishlist", {
    p_member: memberId,
    p_type: type,
    p_ids: ids,
  });

  if (error) return fail(toMessage(error, "No pudimos guardar el orden."));

  revalidatePath(`/g/${groupId}`);
  return done("Orden actualizado.");
}
