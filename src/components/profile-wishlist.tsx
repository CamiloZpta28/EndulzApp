"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { ImagePicker } from "@/components/image-picker";
import { ItemNameField } from "@/components/item-name-field";
import { ProfileItemRow } from "@/components/profile-item-row";
import { WISHLIST_META } from "@/lib/wishlist-meta";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addProfileItem } from "@/lib/actions/profile";
import { idle } from "@/lib/actions/types";
import type { ProfileWishlistItem, WishlistType } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Una sección de la lista base. Sin tope: acá no hay presupuesto porque la
 * lista todavía no pertenece a ningún grupo — el tope lo pone cada grupo
 * cuando la importas.
 */
export function ProfileWishlist({
  type,
  items,
}: {
  type: WishlistType;
  items: ProfileWishlistItem[];
}) {
  const meta = WISHLIST_META[type];
  const Icon = meta.icon;

  const [open, setOpen] = useState(false);
  const [addState, addAction] = useActionState(addProfileItem, idle);

  // Igual que en la lista de un grupo: al guardar el formulario se queda
  // abierto y vacío, para que agregar el siguiente cueste solo escribirlo.
  const [guardados, setGuardados] = useState(0);
  useActionToast(addState, () => setGuardados((n) => n + 1));

  return (
    <section className="space-y-3">
      <header
        className={cn(
          "flex items-center justify-between gap-2 rounded-xl border px-3 py-2",
          meta.dashed && "border-dashed",
        )}
        style={{ backgroundColor: meta.soft, borderColor: meta.color }}
      >
        <h3
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: meta.color }}
        >
          <Icon className="size-4" aria-hidden />
          {meta.label}
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <Plus className="size-3.5" aria-hidden />
          Agregar
        </Button>
      </header>

      {open && (
        <form
          key={guardados}
          action={addAction}
          className="bg-card space-y-3 rounded-xl border p-3"
        >
          <input type="hidden" name="type" value={type} />

          <ItemNameField id={`perfil-item-${type}`} type={type} autoFocus />

          <div className="space-y-1.5">
            <Label htmlFor={`perfil-url-${type}`}>Link (opcional)</Label>
            <Input
              id={`perfil-url-${type}`}
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`perfil-nota-${type}`}>Detalle (opcional)</Label>
            <Textarea
              id={`perfil-nota-${type}`}
              name="note"
              rows={2}
              placeholder="Talla M, color negro…"
            />
          </div>

          <ImagePicker idPrefix={`perfil-${type}`} />

          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar
          </SubmitButton>

          {guardados > 0 && (
            <p className="text-muted-foreground text-center text-xs">
              Listo, ya quedó en tu lista. Sigue agregando de a uno.
            </p>
          )}
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground px-1 text-sm">{meta.hint}</p>
      ) : (
        <>
          {items.length > 1 && type !== "vetado" && (
            <p className="text-muted-foreground px-1 text-xs">
              Arriba lo que más quieres — usa las flechitas para acomodarlo.
            </p>
          )}
          <ul className="space-y-2">
            {items.map((item, index) => (
              <ProfileItemRow
                key={item.id}
                item={item}
                priority={
                  items.length > 1
                    ? { ids: items.map((i) => i.id), index }
                    : undefined
                }
              />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
