/**
 * Los límites de subida, en UN solo lugar.
 *
 * Estaban repartidos: la UI decía 5 MB, la acción del servidor validaba 5 MB…
 * y Next rechazaba el POST a 1 MB antes de que ninguna de las dos corriera.
 * El resultado era un 500 sin mensaje en vez de un "esa foto pesa mucho".
 *
 * ⚠️ Estos números tienen que quedar POR DEBAJO del `bodySizeLimit` de
 * `next.config.ts`. El límite de Next aplica al cuerpo HTTP crudo, así que hay
 * que dejarle aire al `multipart/form-data` (los separadores y las cabeceras
 * de cada parte suman ~10–20 KB) y a los otros campos del formulario.
 */

/** Tope del cuerpo entero, el mismo valor que `next.config.ts`. */
export const BODY_SIZE_LIMIT_MB = 4;

/** Una foto de antojo, ya comprimida. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Una foto de perfil: se recorta a 512px antes de subir, no necesita más. */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/**
 * El lado más largo al que se reduce una foto antes de subirla.
 *
 * Se muestra a 80px en el diálogo y a 56px en las filas; 1400 deja margen de
 * sobra para que se vea nítida en pantallas densas y si algún día se abre a
 * tamaño completo, sin cargar los 4000px que da la cámara de un celular.
 */
export const UPLOAD_MAX_EDGE = 1400;

/** Para los mensajes de la UI. */
export function formatBytes(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.round(bytes / 1024)} KB`;
}
