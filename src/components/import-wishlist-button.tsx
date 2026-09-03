"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { importProfileWishlist } from "@/lib/actions/profile";
import { idle } from "@/lib/actions/types";

/**
 * Trae la lista base del perfil a este parche.
 *
 * Si la lista base está vacía no se ofrece el botón — sería un botón que no
 * hace nada; en su lugar se manda a armarla.
 */
export function ImportWishlistButton({
  groupId,
  memberId,
  profileItemCount,
}: {
  groupId: string;
  memberId: string;
  profileItemCount: number;
}) {
  const [state, action] = useActionState(importProfileWishlist, idle);
  useActionToast(state);

  if (profileItemCount === 0) {
    return (
      <div className="bg-muted/50 space-y-2 rounded-xl border border-dashed p-3 text-center">
        <p className="text-muted-foreground text-sm">
          Si armas tu lista base en el perfil, la puedes importar a cualquier
          parche de un toque.
        </p>
        <ButtonLink href="/perfil" variant="outline" size="sm">
          Armar mi lista base
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="member_id" value={memberId} />
      <SubmitButton
        variant="outline"
        className="w-full"
        pendingLabel="Importando…"
      >
        <Download className="size-4" aria-hidden />
        Importar mi lista base ({profileItemCount})
      </SubmitButton>
    </form>
  );
}
