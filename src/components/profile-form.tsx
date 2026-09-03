"use client";

import { useActionState, useRef, useState } from "react";
import { Cake, Mail, Phone, Upload, X } from "lucide-react";

import { AvatarCropper } from "@/components/avatar-cropper";
import { PersonAvatar } from "@/components/person-avatar";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeAvatar, updateProfile } from "@/lib/actions/profile";
import { idle } from "@/lib/actions/types";

export function ProfileForm({
  name,
  email,
  avatarUrl,
  birthday,
  phone,
}: {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  birthday: string | null;
  phone: string | null;
}) {
  const [state, formAction] = useActionState(updateProfile, idle);
  /** La foto escogida, esperando recorte. */
  const [picked, setPicked] = useState<File | null>(null);
  /** Vista previa de lo ya recortado, todavía sin guardar. */
  const [preview, setPreview] = useState<string | null>(null);

  const avatarRef = useRef<HTMLInputElement>(null);

  useActionToast(state, () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  });

  function clearPicked() {
    setPicked(null);
    // Sin esto, volver a escoger el mismo archivo no dispara `change`.
    if (avatarRef.current) avatarRef.current.value = "";
  }

  function usePhoto(cropped: File) {
    if (preview) URL.revokeObjectURL(preview);

    // `DataTransfer` es la única forma de meterle un File a un input de
    // archivo, y así el formulario sigue enviándose solo, sin fetch a mano.
    try {
      const transfer = new DataTransfer();
      transfer.items.add(cropped);
      if (avatarRef.current) avatarRef.current.files = transfer.files;
      setPreview(URL.createObjectURL(cropped));
    } catch {
      // Navegador sin DataTransfer: se sube la foto original sin recortar,
      // que es mejor que quedarse sin poder cambiarla.
      setPreview(picked ? URL.createObjectURL(picked) : null);
    }
    setPicked(null);
  }

  const shownAvatar = preview ?? avatarUrl;

  return (
    <>
      <form action={formAction} className="space-y-5">
        <div className="flex items-center gap-4">
          <PersonAvatar name={name} src={shownAvatar} size="lg" />

          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => avatarRef.current?.click()}
            >
              <Upload className="size-3.5" aria-hidden />
              {shownAvatar ? "Cambiar foto" : "Subir foto"}
            </Button>

            {shownAvatar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (preview) {
                    // Solo se descarta lo que aún no se ha subido.
                    URL.revokeObjectURL(preview);
                    setPreview(null);
                    if (avatarRef.current) avatarRef.current.value = "";
                  } else {
                    void removeAvatar();
                  }
                }}
              >
                <X className="size-3.5" aria-hidden />
                Quitar
              </Button>
            )}

            <p className="text-muted-foreground text-xs">
              PNG, JPG o WEBP. La recortas al subirla.
            </p>
          </div>
        </div>

        {/* Fuera de la vista pero dentro del form: lo abre el botón de arriba
            y guarda el recorte final que lee el Server Action. */}
        <input
          ref={avatarRef}
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            // Al asignar el recorte por `DataTransfer` no se dispara `change`,
            // así que acá siempre llega una foto recién escogida.
            if (file) setPicked(file);
          }}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="display_name">¿Cómo te llamas?</Label>
            <Input
              id="display_name"
              name="display_name"
              required
              maxLength={60}
              defaultValue={name}
            />
            <p className="text-muted-foreground text-xs">
              Este es el nombre que ve tu grupo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthday" className="flex items-center gap-1.5">
              <Cake className="size-3.5" aria-hidden />
              Cumpleaños
            </Label>
            <Input
              id="birthday"
              name="birthday"
              type="date"
              defaultValue={birthday ?? ""}
            />
            <p className="text-muted-foreground text-xs">
              Tu grupo ve el día y el mes, no el año.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="size-3.5" aria-hidden />
              Celular
            </Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              maxLength={30}
              defaultValue={phone ?? ""}
              placeholder="300 123 4567"
            />
            <p className="text-muted-foreground text-xs">
              Privado. No sale en el grupo.
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="size-3.5" aria-hidden />
              Correo
            </Label>
            <Input id="email" value={email ?? ""} disabled readOnly />
            <p className="text-muted-foreground text-xs">
              Viene de tu cuenta; se cambia desde ahí.
            </p>
          </div>
        </div>

        <SubmitButton className="w-full md:w-auto" pendingLabel="Guardando…">
          Guardar perfil
        </SubmitButton>
      </form>

      <AvatarCropper
        file={picked}
        onCancel={clearPicked}
        onCropped={usePhoto}
      />
    </>
  );
}
