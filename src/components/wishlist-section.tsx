"use client";

import { useActionState, useRef, useState } from "react";
import { Candy, Gift, Plus } from "lucide-react";

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
import type { WishlistItem, WishlistType } from "@/lib/types";

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
    hint: "El regalo grande del final.",
  },
};

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
  const meta = META[type];
  const Icon = meta.icon;

  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [addState, addAction] = useActionState(addWishlistItem, idle);

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
        <div className="min-w-0">
          <h3
            className="flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: meta.color }}
          >
            <Icon className="size-4" aria-hidden />
            {meta.label}
          </h3>
          <p className="text-foreground/70 text-xs">
            {budget > 0 ? `Hasta ${formatMoney(budget, currency)}` : "Sin tope"}
          </p>
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
          ref={formRef}
          action={addAction}
          className="bg-card space-y-3 rounded-xl border p-3"
        >
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="member_id" value={memberId} />
          <input type="hidden" name="type" value={type} />

          <div className="space-y-1.5">
            <Label htmlFor={`item_name-${type}`}>¿Qué se te antoja?</Label>
            <Input
              id={`item_name-${type}`}
              name="item_name"
              required
              maxLength={140}
              placeholder={
                type === "endulzada" ? "Chocolatinas Jet" : "Audífonos bluetooth"
              }
            />
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor={`image-${type}`}>Foto (opcional)</Label>
            <Input
              id={`image-${type}`}
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
            />
            <p className="text-muted-foreground text-xs">Máximo 5 MB.</p>
          </div>

          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar antojo
          </SubmitButton>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground px-1 text-sm">
          {editable ? meta.hint : "Todavía no ha puesto nada por acá."}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <WishlistItemRow
              key={item.id}
              item={item}
              groupId={groupId}
              editable={editable}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
