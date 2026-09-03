import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

/**
 * Sube un archivo a un bucket bajo `<auth.uid()>/…`, que es exactamente lo
 * que revisan las políticas de Storage.
 *
 * Vive fuera de los archivos `"use server"` porque no es una Server Action:
 * esos archivos solo pueden exportar acciones.
 */
export async function uploadImage(
  supabase: SupabaseClient<Database>,
  {
    bucket,
    userId,
    file,
    maxBytes,
    allowed,
    label,
  }: {
    bucket: string;
    userId: string;
    file: File;
    maxBytes: number;
    allowed: Set<string>;
    /** Cómo llamarlo en el mensaje de error: "La imagen", "La foto"… */
    label: string;
  },
): Promise<{ url: string } | { error: string }> {
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { error: `${label} no puede pasar de ${mb} MB.` };
  }
  if (!allowed.has(file.type)) {
    const kinds = [...allowed]
      .map((mime) => mime.replace("image/", "").toUpperCase())
      .join(", ");
    return { error: `Solo aceptamos ${kinds}.` };
  }

  const extension = file.name.split(".").pop()?.toLowerCase().slice(0, 5) ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { error: error.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: publicUrl };
}

/** Borra el objeto al que apunta una URL pública de ese bucket, si es una. */
export async function removeUploaded(
  supabase: SupabaseClient<Database>,
  bucket: string,
  publicUrl: string | null,
) {
  if (!publicUrl) return;
  const marker = `/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  // Una dirección externa (pegada por la persona) no vive en el bucket: no
  // hay nada que borrar.
  if (index === -1) return;
  const path = decodeURIComponent(publicUrl.slice(index + marker.length));
  await supabase.storage.from(bucket).remove([path]);
}

/**
 * Normaliza a una URL http(s), o `null`. Sirve igual para el link del
 * producto y para la dirección de una foto: en los dos casos lo que importa
 * es que no se cuele un `javascript:`.
 */
export function parseHttpUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}
