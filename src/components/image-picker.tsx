"use client";

import { useRef, useState } from "react";
import { ClipboardPaste, ImagePlus, Link2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/**
 * Tres formas de ponerle foto a un antojo: escoger archivo, **pegar** una
 * imagen del portapapeles, o pegar la dirección de una foto de internet.
 *
 * Pegar es el camino que importa: uno copia la foto del producto de la tienda
 * y la suelta acá, sin pasar por descargar y volver a subir.
 *
 * ## El contrato con el servidor tiene TRES estados, no dos
 *
 * Antes este componente mandaba siempre `image_url`, vacío cuando no se había
 * tocado nada — y el servidor leía ese vacío como "quítale la foto". Es decir
 * que editar el nombre de un antojo le borraba la imagen, y encima el archivo
 * se borraba de Storage. Por eso ahora:
 *
 *  - no se tocó nada  → no se manda ningún campo → el servidor **conserva**
 *  - se quitó la foto → `image_clear=1`          → el servidor **borra**
 *  - hay archivo o dirección → `image` / `image_url` → el servidor **cambia**
 *
 * "No mandar nada" y "mandar vacío" tienen que significar cosas distintas.
 */
export function ImagePicker({
  idPrefix,
  existingUrl = null,
}: {
  idPrefix: string;
  /** La foto que ya tiene el antojo, si se está editando. */
  existingUrl?: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [urlValue, setUrlValue] = useState("");
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(false);

  function acceptFile(file: File) {
    if (!ALLOWED.has(file.type)) {
      setError("Solo PNG, JPG, WEBP o GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("La imagen no puede pasar de 5 MB.");
      return;
    }
    setError(null);
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      if (fileRef.current) fileRef.current.files = transfer.files;
    } catch {
      setError("Tu navegador no deja pegar imágenes; usa «Subir».");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    // Una imagen sube y desplaza cualquier dirección escrita antes.
    setUrlValue("");
    setCleared(false);
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setUrlValue("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    // Solo cuenta como "quitar" si de verdad había algo guardado.
    setCleared(Boolean(existingUrl));
  }

  const pastedUrl =
    !preview && /^https?:\/\/\S+$/i.test(urlValue.trim())
      ? urlValue.trim()
      : null;
  const shown = preview ?? pastedUrl ?? (cleared ? null : existingUrl);
  const isNew = Boolean(preview ?? pastedUrl);

  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-imagen`} className="flex items-center gap-1.5">
        <ImagePlus className="size-3.5" aria-hidden />
        Foto de referencia (opcional)
      </Label>

      {/* Zona de pegado: recibe Ctrl+V mientras tenga el foco. */}
      <div
        id={`${idPrefix}-imagen`}
        tabIndex={0}
        role="group"
        aria-label="Pega una imagen o una dirección de imagen"
        onPaste={(event) => {
          const item = [...event.clipboardData.items].find((entry) =>
            entry.type.startsWith("image/"),
          );
          if (item) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              acceptFile(file);
              return;
            }
          }
          const text = event.clipboardData.getData("text").trim();
          if (/^https?:\/\/\S+$/i.test(text)) {
            event.preventDefault();
            setShowUrl(true);
            setUrlValue(text);
            setCleared(false);
            setError(null);
          }
        }}
        className="focus-visible:border-ring focus-visible:ring-ring/50 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 focus-visible:ring-3 focus-visible:outline-none"
      >
        {shown ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shown}
              alt=""
              className="size-14 rounded-lg object-cover"
              style={{ maxWidth: "none" }}
            />
            <span className="text-muted-foreground flex-1 text-xs">
              {isNew ? "Foto nueva, lista para guardar" : "Foto actual"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              aria-label="Quitar la imagen"
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-3.5" aria-hidden />
              Subir
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUrl((value) => !value)}
              aria-expanded={showUrl}
            >
              <Link2 className="size-3.5" aria-hidden />
              Pegar dirección
            </Button>
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <ClipboardPaste className="size-3" aria-hidden />
              o pega acá con Ctrl+V
            </span>
          </>
        )}
      </div>

      {showUrl && !preview && (
        <Input
          type="url"
          inputMode="url"
          placeholder="https://…/foto.jpg"
          value={urlValue}
          onChange={(event) => {
            setUrlValue(event.target.value);
            setCleared(false);
          }}
          aria-label="Dirección de la imagen"
        />
      )}

      {cleared && (
        <p className="text-muted-foreground text-xs">
          Se va a quitar la foto al guardar.
        </p>
      )}

      {error && <p className="text-destructive text-xs">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        name="image"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) acceptFile(file);
        }}
      />

      {/* Los dos campos van SOLO cuando hay algo que decir. Si no se tocó la
          foto, el formulario no manda ninguno y el servidor la conserva. */}
      {pastedUrl && <input type="hidden" name="image_url" value={pastedUrl} />}
      {cleared && <input type="hidden" name="image_clear" value="1" />}
    </div>
  );
}
