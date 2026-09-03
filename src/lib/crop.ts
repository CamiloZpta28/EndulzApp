/**
 * La geometría del recorte de la foto de perfil.
 *
 * Está aparte del componente y sin tocar el DOM a propósito: las
 * restricciones de pan y zoom son la parte que se equivoca en silencio (se
 * cuela una franja vacía en el borde y solo se nota con una foto muy alargada),
 * así que acá se pueden probar con números.
 *
 * Modelo:
 *  - El marco es un cuadrado de lado `frame` (px CSS). La máscara circular es
 *    solo pintura encima; el recorte real es el cuadrado.
 *  - `zoom` es relativo al ajuste "cover": 1 = la imagen apenas cubre el marco.
 *  - `offset` es cuánto se corrió el centro de la imagen respecto al centro del
 *    marco, en px CSS.
 */

export type Size = { width: number; height: number };
export type Offset = { x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** Lado del PNG/JPEG que se sube. Suficiente para un avatar grande. */
export const OUTPUT_SIZE = 512;

/** Escala a la que la imagen apenas cubre el marco por su lado más corto. */
export function coverScale(natural: Size, frame: number) {
  const shortest = Math.min(natural.width, natural.height);
  return shortest > 0 ? frame / shortest : 1;
}

/** El tamaño con el que se pinta la imagen dentro del marco. */
export function displayedSize(
  natural: Size,
  frame: number,
  zoom: number,
): Size {
  const scale = coverScale(natural, frame) * zoom;
  return { width: natural.width * scale, height: natural.height * scale };
}

/**
 * Recorta el desplazamiento para que el marco nunca se salga de la imagen.
 * Sin esto aparecen franjas vacías al arrastrar hasta el borde.
 */
export function clampOffset(
  offset: Offset,
  natural: Size,
  frame: number,
  zoom: number,
): Offset {
  const shown = displayedSize(natural, frame, zoom);
  // Con zoom 1 el lado corto calza exacto, así que su margen es 0 — y
  // `Math.max(0, …)` evita un límite negativo por error de redondeo.
  const maxX = Math.max(0, (shown.width - frame) / 2);
  const maxY = Math.max(0, (shown.height - frame) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  };
}

export function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/**
 * Al cambiar el zoom, el desplazamiento se escala con la imagen para que el
 * punto que estaba en el centro del marco siga en el centro. Sin esto la foto
 * "salta" cada vez que se mueve el slider.
 */
export function rezoom(
  offset: Offset,
  natural: Size,
  frame: number,
  fromZoom: number,
  toZoom: number,
): Offset {
  const ratio = fromZoom > 0 ? toZoom / fromZoom : 1;
  return clampOffset(
    { x: offset.x * ratio, y: offset.y * ratio },
    natural,
    frame,
    toZoom,
  );
}

export type CropRect = { sx: number; sy: number; size: number };

/**
 * El cuadrado de la imagen original que queda dentro del marco, en píxeles de
 * la fuente — justo lo que espera `drawImage`.
 */
export function cropRect(
  natural: Size,
  frame: number,
  zoom: number,
  offset: Offset,
): CropRect {
  const scale = coverScale(natural, frame) * zoom;
  const shown = displayedSize(natural, frame, zoom);
  const safe = clampOffset(offset, natural, frame, zoom);

  const sx = (shown.width / 2 - safe.x - frame / 2) / scale;
  const sy = (shown.height / 2 - safe.y - frame / 2) / scale;
  const size = frame / scale;

  // Redondear puede empujar el rectángulo un pixel fuera de la imagen; se
  // ancla dentro para que `drawImage` no devuelva un borde transparente.
  const bounded = Math.min(size, natural.width, natural.height);
  return {
    sx: Math.min(Math.max(0, sx), natural.width - bounded),
    sy: Math.min(Math.max(0, sy), natural.height - bounded),
    size: bounded,
  };
}

/** Distancia entre dos punteros, para el pellizco. */
export function pinchDistance(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
