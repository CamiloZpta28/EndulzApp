import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_IMAGE_BYTES } from "@/lib/upload-limits";

/**
 * Las fotos de las entregas anónimas. Solo servidor.
 *
 * Van aparte de `lib/upload.ts` a propósito. Las fotos de las listas viven en
 * un bucket PÚBLICO bajo `<user_id>/...`, y el roster le entrega el `user_id`
 * de cada miembro a todo el grupo: con esa misma receta, quien recibe vería la
 * dirección de la foto, buscaría el id en el grupo y sabría quién se la mandó.
 *
 * Acá todo es distinto:
 *  - bucket privado y sin políticas: ningún usuario lo toca directo;
 *  - el archivo se nombra por la ENTREGA (`<delivery_id>/<uuid>.webp`);
 *  - sube y lee el servidor con la llave de servicio, y solo después de que
 *    una función con la sesión del usuario confirmó que la entrega es suya;
 *  - el navegador ve una ruta de la app (`/g/.../entregas/.../foto`), no una
 *    de Storage.
 *
 * La llave de servicio es la misma del cron. Sin ella las entregas funcionan
 * igual, solo que sin foto: `deliveryPhotosEnabled()` lo dice y el formulario
 * esconde el campo.
 */

const BUCKET = "delivery-photos";
const TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

export function deliveryPhotosEnabled() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

/** La ruta de la app que sirve la foto. `v` cambia con la foto y rompe el caché. */
export function deliveryPhotoUrl(
  groupId: string,
  deliveryId: string,
  photoPath: string | null,
) {
  if (!photoPath) return null;
  const version = photoPath.split("/").pop()?.split(".")[0] ?? "";
  return `/g/${groupId}/entregas/${deliveryId}/foto?v=${version}`;
}

/** Valida y sube. Devuelve la ruta o un mensaje para la persona. */
export async function uploadDeliveryPhoto(
  deliveryId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  // Solo lo que sale de la compresión del navegador, que re-dibuja la foto y
  // con eso le quita los metadatos. Cualquier otra cosa no pasó por ahí.
  const extension = TYPES[file.type];
  if (!extension) {
    return { error: "La foto tiene que ser JPG o WEBP. Vuelve a escogerla." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "La foto pesa mucho. Prueba con otra." };
  }

  // El nombre original del archivo se descarta: `IMG_20261001_080312.jpg`
  // diría a qué hora se tomó.
  const path = `${deliveryId}/${crypto.randomUUID()}.${extension}`;
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.error("subida de foto de entrega falló:", error.message);
    return {
      error: /bucket.*not.*found/i.test(error.message)
        ? "Falta correr el patch 012 en Supabase."
        : "No pudimos subir la foto.",
    };
  }
  return { path };
}

/** Borra sin quejarse: un archivo que ya no está no es un error. */
export async function removeDeliveryPhoto(path: string | null) {
  if (!path || !deliveryPhotosEnabled()) return;
  const { error } = await createAdminClient().storage.from(BUCKET).remove([path]);
  if (error) console.error("no se pudo borrar la foto de entrega:", error.message);
}

export async function downloadDeliveryPhoto(path: string) {
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .download(path);
  if (error || !data) return null;
  return data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Borra las carpetas de entregas que ya no existen.
 *
 * Las entregas se borran en cascada desde SQL (se quitó una fecha, se borró
 * el grupo, se reinició el sorteo) y SQL no puede borrar archivos de
 * Storage. Lo hace el cron, una vez al día. Devuelve cuántas carpetas borró.
 */
export async function sweepOrphanDeliveryPhotos(
  admin: ReturnType<typeof createAdminClient>,
) {
  const bucket = admin.storage.from(BUCKET);
  const { data: folders, error } = await bucket.list("", { limit: 1000 });
  if (error) throw error;

  const ids = (folders ?? [])
    .map((entry) => entry.name)
    .filter((name) => UUID.test(name));
  if (ids.length === 0) return 0;

  const { data: alive, error: aliveError } = await admin.rpc(
    "existing_delivery_ids",
    { p_ids: ids },
  );
  if (aliveError) throw aliveError;

  const vivos = new Set(alive ?? []);
  let borradas = 0;
  for (const id of ids) {
    if (vivos.has(id)) continue;
    const { data: files } = await bucket.list(id, { limit: 100 });
    const paths = (files ?? []).map((file) => `${id}/${file.name}`);
    if (paths.length > 0) await bucket.remove(paths);
    borradas++;
  }
  return borradas;
}
