"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { parseHttpUrl, removeUploaded, uploadImage } from "@/lib/upload";
import type { Database, WishlistType } from "@/lib/types";
import { type ActionState, done, fail, toMessage } from "./types";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Las fotos de la lista base van al mismo bucket que las de los grupos. */
const ITEM_BUCKET = "wishlist-images";
const MAX_ITEM_BYTES = 5 * 1024 * 1024;
const ITEM_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function parseType(value: FormDataEntryValue | null): WishlistType | null {
  const type = String(value ?? "");
  return type === "endulzada" || type === "regalo" ? type : null;
}

/** `YYYY-MM-DD` o nada. Un string vacío borra la fecha; `undefined` = inválida. */
function parseBirthday(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getUTCFullYear();
  if (year < 1900 || date.getTime() > Date.now()) return undefined;
  return raw;
}

/**
 * La foto de un antojo puede llegar como archivo (escogido o pegado) o como
 * dirección de internet. El archivo manda.
 */
async function resolveItemImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  formData: FormData,
): Promise<{ value: string | null } | { error: string }> {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadImage(supabase, {
      bucket: ITEM_BUCKET,
      userId,
      file,
      maxBytes: MAX_ITEM_BYTES,
      allowed: ITEM_MIME,
      label: "La imagen",
    });
    if ("error" in uploaded) return { error: uploaded.error };
    return { value: uploaded.url };
  }

  const pasted = String(formData.get("image_url") ?? "").trim();
  if (!pasted) return { value: null };

  const url = parseHttpUrl(pasted);
  if (!url) return { error: "Esa dirección de imagen no parece válida." };
  return { value: url };
}

/* -------------------------------------------------------------------------- */
/* Perfil                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) return fail("Ponle un nombre a tu perfil.");

  const birthday = parseBirthday(formData.get("birthday"));
  if (birthday === undefined) {
    return fail("Esa fecha de nacimiento no parece válida.");
  }

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Inicia sesión para editar tu perfil.");

  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
    display_name: displayName.slice(0, 60),
    birthday,
    phone: String(formData.get("phone") ?? "").trim().slice(0, 30) || null,
  };

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(supabase, {
      bucket: AVATAR_BUCKET,
      userId: user.id,
      file,
      maxBytes: MAX_AVATAR_BYTES,
      allowed: AVATAR_MIME,
      label: "La foto",
    });
    if ("error" in result) return fail(result.error);
    patch.avatar_url = result.url;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return fail(toMessage(error, "No pudimos guardar tu perfil."));

  // El nombre y la foto salen en el roster de cada grupo.
  revalidatePath("/perfil");
  revalidatePath("/dashboard", "layout");
  return done("Perfil actualizado.");
}

export async function removeAvatar(): Promise<void> {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return;

  const { data: before } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
  await removeUploaded(supabase, AVATAR_BUCKET, before?.avatar_url ?? null);

  revalidatePath("/perfil");
  revalidatePath("/dashboard", "layout");
}

/* -------------------------------------------------------------------------- */
/* Lista base del perfil                                                      */
/* -------------------------------------------------------------------------- */

export async function addProfileItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const type = parseType(formData.get("type"));
  const itemName = String(formData.get("item_name") ?? "").trim();
  if (!type) return fail("Falta la sección.");
  if (!itemName) return fail("¿Qué se te antoja? Escríbelo.");

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Inicia sesión para editar tu lista.");

  const image = await resolveItemImage(supabase, user.id, formData);
  if ("error" in image) return fail(image.error);

  const { error } = await supabase.from("profile_wishlists").insert({
    user_id: user.id,
    type,
    item_name: itemName,
    url: parseHttpUrl(formData.get("url")),
    note: String(formData.get("note") ?? "").trim() || null,
    image_url: image.value,
  });

  if (error) return fail(toMessage(error, "No pudimos guardar el antojo."));

  revalidatePath("/perfil");
  return done("Agregado a tu lista base.");
}

/** Editar un antojo de la lista base — antes solo se podía borrar y rehacer. */
export async function updateProfileItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const itemId = String(formData.get("item_id") ?? "");
  const itemName = String(formData.get("item_name") ?? "").trim();
  if (!itemId) return fail("Falta el antojo.");
  if (!itemName) return fail("El nombre no puede quedar vacío.");

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return fail("Inicia sesión para editar tu lista.");

  const { data: before } = await supabase
    .from("profile_wishlists")
    .select("image_url")
    .eq("id", itemId)
    .maybeSingle();

  // Si no mandaron foto nueva ni dirección, se conserva la que tenía.
  const sentImage =
    (formData.get("image") instanceof File &&
      (formData.get("image") as File).size > 0) ||
    formData.get("image_url") !== null;

  let imageUrl: string | null | undefined;
  if (sentImage) {
    const resolved = await resolveItemImage(supabase, user.id, formData);
    if ("error" in resolved) return fail(resolved.error);
    imageUrl = resolved.value;
  }

  const { error } = await supabase
    .from("profile_wishlists")
    .update({
      item_name: itemName,
      url: parseHttpUrl(formData.get("url")),
      note: String(formData.get("note") ?? "").trim() || null,
      ...(imageUrl === undefined ? {} : { image_url: imageUrl }),
    })
    .eq("id", itemId);

  if (error) return fail(toMessage(error, "No pudimos actualizar el antojo."));

  if (
    imageUrl !== undefined &&
    before?.image_url &&
    before.image_url !== imageUrl
  ) {
    await removeUploaded(supabase, ITEM_BUCKET, before.image_url);
  }

  revalidatePath("/perfil");
  return done("Antojo actualizado.");
}

/**
 * Guarda el orden de una sección de la lista base. Firma simple: la llaman
 * las flechitas dentro de un `startTransition`, no un `<form>`.
 */
export async function reorderProfileWishlist(input: {
  type: WishlistType;
  ids: string[];
}): Promise<ActionState> {
  const { type, ids } = input;

  if (!type) return fail("Falta la sección.");
  if (ids.length === 0) return fail("No hay nada que ordenar.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_profile_wishlist", {
    p_type: type,
    p_ids: ids,
  });

  if (error) return fail(toMessage(error, "No pudimos guardar el orden."));

  revalidatePath("/perfil");
  return done("Orden actualizado.");
}

export async function deleteProfileItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) return fail("Falta el antojo.");

  const supabase = await createClient();

  // Se lee la ruta antes de borrar la fila, si no queda el objeto huérfano.
  const { data: before } = await supabase
    .from("profile_wishlists")
    .select("image_url")
    .eq("id", itemId)
    .maybeSingle();

  const { error } = await supabase
    .from("profile_wishlists")
    .delete()
    .eq("id", itemId);

  if (error) return fail(toMessage(error, "No pudimos borrar el antojo."));

  await removeUploaded(supabase, ITEM_BUCKET, before?.image_url ?? null);

  revalidatePath("/perfil");
  return done("Antojo eliminado.");
}

/**
 * Copia la lista base al puesto de un grupo.
 *
 * Copia y no enlaza a propósito: así ajustar la lista de un grupo no le
 * cambia el regalo a nadie más, y editar la base después no toca los grupos
 * que ya están andando. El RPC salta los nombres repetidos.
 */
export async function importProfileWishlist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const type = parseType(formData.get("type"));
  if (!memberId) return fail("Falta tu puesto en el grupo.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_profile_wishlist", {
    p_member: memberId,
    p_type: type,
  });

  if (error) return fail(toMessage(error, "No pudimos importar tu lista."));

  revalidatePath(`/g/${groupId}`);

  if (!data) {
    return done("Tu lista base ya estaba completa en este grupo.");
  }
  return done(
    data === 1 ? "Se importó 1 antojo." : `Se importaron ${data} antojos.`,
  );
}
