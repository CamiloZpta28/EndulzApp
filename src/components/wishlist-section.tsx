"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { ImagePicker } from "@/components/image-picker";
import { ItemNameField } from "@/components/item-name-field";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WishlistItemRow } from "@/components/wishlist-item-row";
import { idle } from "@/lib/actions/types";
import { addWishlistItem } from "@/lib/actions/wishlists";
import { formatMoney } from "@/lib/format";
import { WISHLIST_META } from "@/lib/wishlist-meta";
import type { WishlistItem, WishlistType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WishlistSection({
  type,
  items,
  groupId,
  memberId,
  budget,
  currency,
  editable,
}: {
  type: WishlistType;
  items: WishlistItem[];
  groupId: string;
  memberId: string;
  budget: number;
  currency: string;
  editable: boolean;
}) {
  const meta = WISHLIST_META[type];
  const Icon = meta.icon;

  const [open, setOpen] = useState(false);
  const [addState, addAction] = useActionState(addWishlistItem, idle);

  // El formulario NO se cierra al guardar: se remonta vacío y con el foco
  // puesto. Cerrarlo era la razón de fondo por la que la gente metía la lista
  // entera en una casilla — agregar el segundo antojo costaba buscarlo y
  // volverlo a abrir, así que salía más fácil escribirlo todo de una.
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
        <div className="min-w-0">
          <h3
            className="flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: meta.color }}
          >
            <Icon className="size-4" aria-hidden />
            {meta.label}
          </h3>
          {meta.hasBudget ? (
            <p className="text-foreground/70 text-xs">
              {budget > 0
                ? `Hasta ${formatMoney(budget, currency)}`
                : "Sin tope"}
            </p>
          ) : (
            <p className="text-foreground/70 text-xs">
              Mejor no me regalen esto
            </p>
          )}
        </div>
        {editable && (
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
        )}
      </header>

      {editable && open && (
        <form
          key={guardados}
          action={addAction}
          className="bg-card space-y-3 rounded-xl border p-3"
        >
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="member_id" value={memberId} />
          <input type="hidden" name="type" value={type} />

          <ItemNameField id={`item_name-${type}`} type={type} autoFocus />

          <div className="space-y-1.5">
            <Label htmlFor={`url-${type}`}>Link (opcional)</Label>
            <Input
              id={`url-${type}`}
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://…"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`note-${type}`}>Detalle (opcional)</Label>
            <Textarea
              id={`note-${type}`}
              name="note"
              rows={2}
              placeholder="Talla M, color negro…"
            />
          </div>

          <ImagePicker idPrefix={`nuevo-${type}`} />

          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar antojo
          </SubmitButton>

          {guardados > 0 && (
            <p className="text-muted-foreground text-center text-xs">
              Listo, ya quedó en tu lista. Sigue agregando de a uno.
            </p>
          )}
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground px-1 text-sm">
          {editable ? meta.hint : "Todavía no ha puesto nada por acá."}
        </p>
      ) : (
        <>
          {editable && items.length > 1 && type !== "vetado" && (
            <p className="text-muted-foreground px-1 text-xs">
              Arriba lo que más quieres — usa las flechitas para acomodarlo.
            </p>
          )}
          <ul className="space-y-2">
            {items.map((item, index) => (
              <WishlistItemRow
                key={item.id}
                item={item}
                groupId={groupId}
                editable={editable}
                priority={
                  items.length > 1
                    ? { ids: items.map((i) => i.id), index, memberId }
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
