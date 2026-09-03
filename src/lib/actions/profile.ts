"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database, WishlistType } from "@/lib/types";
import { type ActionState, done, fail, toMessage } from "./types";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

function parseType(value: FormDataEntryValue | null): WishlistType | null {
  const type = String(value ?? "");
  return type === "endulzada" || type === "regalo" ? type : null;
}

/** Solo http(s), para que una lista no pueda esconder un `javascript:`. */
function parseUrl(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

/** `YYYY-MM-DD` o nada. Un string vacío borra la fecha. */
function parseBirthday(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined; // inválido
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getUTCFullYear();
  if (year < 1900 || date.getTime() > Date.now()) return undefined;
  return raw;
}

async function uploadAvatar(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "La foto no puede pasar de 2 MB." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: "Solo aceptamos PNG, JPG o WEBP." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase().slice(0, 5) ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: toMessage(error, "No pudimos subir la foto.") };

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return { url: publicUrl };
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Inicia sesión para editar tu perfil.");

  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
    display_name: displayName.slice(0, 60),
    birthday,
    phone: String(formData.get("phone") ?? "").trim().slice(0, 30) || null,
  };

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    const result = await uploadAvatar(supabase, user.id, file);
    if ("error" in result) return fail(result.error);
    patch.avatar_url = result.url;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id);

  if (error) return fail(toMessage(error, "No pudimos guardar tu perfil."));

  // El nombre y la foto salen en el roster de cada parche.
  revalidatePath("/perfil");
  revalidatePath("/dashboard", "layout");
  return done("Perfil actualizado.");
}

export async function removeAvatar(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Inicia sesión para editar tu lista.");

  const { error } = await supabase.from("profile_wishlists").insert({
    user_id: user.id,
    type,
    item_name: itemName,
    url: parseUrl(formData.get("url")),
    note: String(formData.get("note") ?? "").trim() || null,
  });

  if (error) return fail(toMessage(error, "No pudimos guardar el antojo."));

  revalidatePath("/perfil");
  return done("Agregado a tu lista base.");
}

export async function deleteProfileItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const itemId = String(formData.get("item_id") ?? "");
  if (!itemId) return fail("Falta el antojo.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_wishlists")
    .delete()
    .eq("id", itemId);

  if (error) return fail(toMessage(error, "No pudimos borrar el antojo."));

  revalidatePath("/perfil");
  return done("Antojo eliminado.");
}

/**
 * Copia la lista base al puesto de un parche.
 *
 * Copia y no enlaza a propósito: así ajustar la lista de un parche no le
 * cambia el regalo a nadie más, y editar la base después no toca los parches
 * que ya están andando. El RPC salta los nombres repetidos.
 */
export async function importProfileWishlist(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const groupId = String(formData.get("group_id") ?? "");
  const memberId = String(formData.get("member_id") ?? "");
  const type = parseType(formData.get("type"));
  if (!memberId) return fail("Falta tu puesto en el parche.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("import_profile_wishlist", {
    p_member: memberId,
    p_type: type,
  });

  if (error) return fail(toMessage(error, "No pudimos importar tu lista."));

  revalidatePath(`/g/${groupId}`);

  if (!data) {
    return done("Tu lista base ya estaba completa en este parche.");
  }
  return done(
    data === 1 ? "Se importó 1 antojo." : `Se importaron ${data} antojos.`,
  );
}
