"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  OUTPUT_SIZE,
  type Offset,
  type Size,
  clampOffset,
  clampZoom,
  cropRect,
  displayedSize,
  pinchDistance,
  rezoom,
} from "@/lib/crop";

/**
 * Lado del marco, fijo. Se mantiene constante (y no medido del layout) para
 * que la geometría de `@/lib/crop` sea determinista y se pueda probar con
 * números; 256 entra cómodo en una pantalla de 375.
 */
const FRAME = 256;

/**
 * Recorte circular con arrastre y zoom, como en cualquier app.
 *
 * El recorte se hace acá y se sube ya cuadrado: así el archivo que llega a
 * Storage pesa unos pocos kB en vez de la foto original de la cámara, y no
 * hace falta procesar imágenes en el servidor.
 */
export function AvatarCropper({
  file,
  onCancel,
  onCropped,
}: {
  file: File | null;
  onCancel: () => void;
  onCropped: (cropped: File) => void;
}) {
  /**
   * La imagen ya decodificada, junto con el `File` del que salió. Se guardan
   * juntos para que "esto es de otra foto" sea derivable, en vez de tener que
   * limpiar el estado desde el efecto.
   */
  const [loaded, setLoaded] = useState<{
    file: File;
    image: HTMLImageElement;
    natural: Size;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  // Punteros activos, para distinguir arrastre de pellizco.
  const pointers = useRef(new Map<number, { clientX: number; clientY: number }>());
  const dragStart = useRef<{ x: number; y: number; offset: Offset } | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  // Carga la imagen escogida y arranca centrada, en zoom 1. Todos los
  // `setState` van dentro del callback de `onload`, nunca en el cuerpo del
  // efecto.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setLoaded({
        file,
        image: img,
        natural: { width: img.naturalWidth, height: img.naturalHeight },
      });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Mientras la foto nueva decodifica, la anterior no se muestra.
  const current = loaded && loaded.file === file ? loaded : null;
  const image = current?.image ?? null;
  // Memoizado porque `applyZoom` depende de él: un objeto nuevo en cada
  // render volvería a crear el callback sin necesidad.
  const natural = useMemo<Size>(
    () => current?.natural ?? { width: 0, height: 0 },
    [current],
  );

  const applyZoom = useCallback(
    (next: number) => {
      const target = clampZoom(next);
      setOffset((current) => rezoom(current, natural, FRAME, zoom, target));
      setZoom(target);
    },
    [natural, zoom],
  );

  function onPointerDown(event: React.PointerEvent) {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const active = [...pointers.current.values()];
    if (active.length === 2) {
      pinchStart.current = {
        distance: pinchDistance(active[0], active[1]),
        zoom,
      };
      dragStart.current = null;
    } else {
      dragStart.current = { x: event.clientX, y: event.clientY, offset };
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const active = [...pointers.current.values()];

    if (active.length === 2 && pinchStart.current) {
      const distance = pinchDistance(active[0], active[1]);
      if (pinchStart.current.distance > 0) {
        applyZoom(
          pinchStart.current.zoom * (distance / pinchStart.current.distance),
        );
      }
      return;
    }

    if (dragStart.current) {
      const moved = {
        x: dragStart.current.offset.x + (event.clientX - dragStart.current.x),
        y: dragStart.current.offset.y + (event.clientY - dragStart.current.y),
      };
      setOffset(clampOffset(moved, natural, FRAME, zoom));
    }
  }

  function onPointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
  }

  async function confirm() {
    if (!image || !file) return;
    setBusy(true);
    try {
      const rect = cropRect(natural, FRAME, zoom, offset);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("sin canvas");

      // Fondo blanco: el JPEG no lleva transparencia y un PNG recortado
      // quedaría con el alfa en negro.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        rect.sx,
        rect.sy,
        rect.size,
        rect.size,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("sin blob");

      onCropped(
        new File([blob], "avatar.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  const shown = displayedSize(natural, FRAME, zoom);

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajusta tu foto</DialogTitle>
          <DialogDescription>
            Arrastra para mover y usa el zoom. Lo que quede en el círculo es tu
            foto de perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div
            className="relative touch-none overflow-hidden rounded-full border-2 select-none"
            style={{ width: FRAME, height: FRAME, cursor: "grab" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="application"
            aria-label="Área de recorte: arrastra para mover la foto"
          >
            {image && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute"
                style={{
                  width: shown.width,
                  height: shown.height,
                  // El preflight de Tailwind trae `img { max-width: 100% }`,
                  // que recortaba el ancho al del marco mientras el alto sí se
                  // aplicaba: la foto salía estirada, y más a más zoom.
                  maxWidth: "none",
                  maxHeight: "none",
                  left: "50%",
                  top: "50%",
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                }}
              />
            )}
          </div>

          <div className="w-full max-w-[256px] space-y-1.5">
            <Label htmlFor="avatar-zoom" className="flex items-center gap-1.5">
              <ZoomIn className="size-3.5" aria-hidden />
              Zoom
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Alejar"
                onClick={() => applyZoom(zoom - 0.25)}
              >
                <Minus className="size-4" />
              </Button>
              <input
                id="avatar-zoom"
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(event) => applyZoom(Number(event.target.value))}
                className="accent-primary h-1.5 flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Acercar"
                onClick={() => applyZoom(zoom + 0.25)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              className="flex-1"
              disabled={!image || busy}
              onClick={confirm}
            >
              {busy ? "Recortando…" : "Usar esta foto"}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
