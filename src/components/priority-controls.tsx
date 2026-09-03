"use client";

import { useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { reorderProfileWishlist } from "@/lib/actions/profile";
import { reorderWishlist } from "@/lib/actions/wishlists";
import type { WishlistType } from "@/lib/types";

/** De qué lista es este antojo. */
export type PriorityScope =
  | { kind: "group"; groupId: string; memberId: string; type: WishlistType }
  | { kind: "profile"; type: WishlistType };

/**
 * Las flechitas para subir o bajar un antojo. Arriba = lo que más quieres.
 *
 * Flechas y no arrastrar: en celular arrastrar dentro de una lista que también
 * hace scroll es un enredo, y esto funciona igual con teclado y con lector de
 * pantalla.
 *
 * Manda el orden completo, no "sube este": el servidor reescribe las
 * posiciones 1..N de una sola vez y no quedan empates.
 */
export function PriorityControls({
  ids,
  index,
  scope,
}: {
  /** Los ids de la sección, en el orden en que se ven ahora. */
  ids: string[];
  index: number;
  scope: PriorityScope;
}) {
  const [pending, startTransition] = useTransition();

  const move = (to: number) => {
    if (to < 0 || to >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);

    startTransition(async () => {
      const result =
        scope.kind === "group"
          ? await reorderWishlist({
              groupId: scope.groupId,
              memberId: scope.memberId,
              type: scope.type,
              ids: next,
            })
          : await reorderProfileWishlist({ type: scope.type, ids: next });

      if (!result.ok && result.message) toast.error(result.message);
    });
  };

  return (
    <div className="flex shrink-0 flex-col">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={pending || index === 0}
        onClick={() => move(index - 1)}
        aria-label="Subir la prioridad"
      >
        <ChevronUp className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={pending || index === ids.length - 1}
        onClick={() => move(index + 1)}
        aria-label="Bajar la prioridad"
      >
        <ChevronDown className="size-3.5" />
      </Button>
    </div>
  );
}
