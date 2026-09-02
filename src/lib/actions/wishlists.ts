"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, WishlistType } from "@/lib/types";
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

/** Only http(s) links, so a wishlist can't smuggle a `javascript:` URL. */
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

/**
 * Upload to Storage under `<user id>/…`, which is exactly what the bucket
 * policy checks. Returns the public URL, or an error string.
 */
async function uploadImage(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "La imagen no puede pasar de 5 MB." };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: "Solo aceptamos PNG, JPG, WEBP o GIF." };
  }

  const extension = file.name.split(".").pop()?.toLowerCase().slice(0, 5) ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: toMessage(error, "No pudimos subir la imagen.") };

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: publicUrl };
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Inicia sesión para editar tu lista.");

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const result = await uploadImage(supabase, user.id, file);
    if ("error" in result) return fail(result.error);
    imageUrl = result.url;
  }

  const { error } = await supabase.from("wishlists").insert({
    member_id: memberId,
    type,
    item_name: itemName,
    url: parseUrl(formData.get("url")),
    note: String(formData.get("note") ?? "").trim() || null,
    image_url: imageUrl,
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
  const { error } = await supabase
    .from("wishlists")
    .update({
      item_name: itemName,
      url: parseUrl(formData.get("url")),
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .eq("id", itemId);

  if (error) return fail(toMessage(error, "No pudimos actualizar el antojo."));

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

  // Grab the stored path first so the object doesn't outlive the row.
  const { data: item } = await supabase
    .from("wishlists")
    .select("image_url")
    .eq("id", itemId)
    .maybeSingle();

  const { error } = await supabase.from("wishlists").delete().eq("id", itemId);
  if (error) return fail(toMessage(error, "No pudimos borrar el antojo."));

  if (item?.image_url) {
    const marker = `/${BUCKET}/`;
    const index = item.image_url.indexOf(marker);
    if (index !== -1) {
      const path = item.image_url.slice(index + marker.length);
      await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
    }
  }

  revalidatePath(`/g/${groupId}`);
  return done("Antojo eliminado.");
}
