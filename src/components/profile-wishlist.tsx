"use client";

import { useActionState, useRef, useState } from "react";
import { Candy, Gift, Plus } from "lucide-react";

import { ImagePicker } from "@/components/image-picker";
import { ProfileItemRow } from "@/components/profile-item-row";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addProfileItem } from "@/lib/actions/profile";
import { idle } from "@/lib/actions/types";
import type { ProfileWishlistItem, WishlistType } from "@/lib/types";

const META: Record<
  WishlistType,
  { label: string; icon: typeof Candy; color: string; soft: string; hint: string }
> = {
  endulzada: {
    label: "Endulzada",
    icon: Candy,
    color: "var(--endulzada)",
    soft: "var(--endulzada-soft)",
    hint: "Dulces, mecato, cafecitos — las cositas del día a día.",
  },
  regalo: {
    label: "Regalo",
    icon: Gift,
    color: "var(--regalo)",
    soft: "var(--regalo-soft)",
    hint: "Los regalos grandes que siempre se te antojan.",
  },
};

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
  const meta = META[type];
  const Icon = meta.icon;

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [addState, addAction] = useActionState(addProfileItem, idle);
  useActionToast(addState, () => {
    formRef.current?.reset();
    setOpen(false);
  });

  return (
    <section className="space-y-3">
      <header
        className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
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
          ref={formRef}
          action={addAction}
          className="bg-card space-y-3 rounded-xl border p-3"
        >
          <input type="hidden" name="type" value={type} />

          <div className="space-y-1.5">
            <Label htmlFor={`perfil-item-${type}`}>¿Qué se te antoja?</Label>
            <Input
              id={`perfil-item-${type}`}
              name="item_name"
              required
              maxLength={140}
              placeholder={
                type === "endulzada" ? "Chocolatinas Jet" : "Audífonos bluetooth"
              }
            />
          </div>

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
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground px-1 text-sm">{meta.hint}</p>
      ) : (
        <>
          {items.length > 1 && (
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
