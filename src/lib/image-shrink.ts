import { UPLOAD_MAX_EDGE } from "@/lib/upload-limits";

/**
 * Reduce y recomprime una foto EN EL NAVEGADOR antes de subirla.
 *
 * Es el arreglo de fondo del error `Body exceeded 1 MB limit`: una foto de
 * celular pesa entre 3 y 8 MB, y esta app la muestra a 80px. Subir el límite
 * del servidor habría hecho que el error pasara de "revienta" a "tarda
 * muchísimo"; achicarla acá lo resuelve de verdad — sube en un segundo y
 * nadie nota la diferencia.
 *
 * Los GIF salen intactos: recodificarlos en un canvas les mata la animación,
 * y una lista de regalos con un GIF quieto no tiene sentido. A cambio, un GIF
 * pesado se rechaza con un mensaje en vez de comprimirse.
 *
 * Solo cliente: usa `canvas` y `createImageBitmap`.
 */
export async function shrinkImage(
  file: File,
  {
    maxEdge = UPLOAD_MAX_EDGE,
    maxBytes,
  }: { maxEdge?: number; maxBytes: number },
): Promise<{ file: File; shrunk: boolean } | { error: string }> {
  // Animado: no se toca.
  if (file.type === "image/gif") {
    if (file.size > maxBytes) {
      return {
        error:
          "Ese GIF pesa mucho y no se puede comprimir sin perder la animación. Prueba con uno más liviano o con una imagen fija.",
      };
    }
    return { file, shrunk: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Un archivo que el navegador no sabe decodificar: se deja pasar tal cual
    // y que decida la validación de tamaño.
    return file.size > maxBytes
      ? { error: "No pudimos leer esa imagen. Prueba con otra." }
      : { file, shrunk: false };
  }

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return { file, shrunk: false };
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const toBlob = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, quality),
    );

  // WEBP pesa bastante menos que JPEG a la misma calidad; si el navegador no
  // lo soporta, `toBlob` devuelve PNG y el tamaño delata que hay que caer a
  // JPEG.
  const attempts: [string, number][] = [
    ["image/webp", 0.82],
    ["image/webp", 0.7],
    ["image/jpeg", 0.82],
    ["image/jpeg", 0.65],
  ];

  for (const [type, quality] of attempts) {
    const blob = await toBlob(type, quality);
    if (!blob || blob.type !== type) continue;
    if (blob.size <= maxBytes) {
      const extension = type === "image/webp" ? "webp" : "jpg";
      const base = file.name.replace(/\.[^.]+$/, "") || "foto";
      return {
        file: new File([blob], `${base}.${extension}`, { type }),
        shrunk: blob.size < file.size,
      };
    }
  }

  return {
    error:
      "Esa imagen pesa mucho incluso comprimida. Prueba con una más pequeña o con un recorte.",
  };
}
