"use client";

import { useState } from "react";

import { AssignmentReveal } from "@/components/assignment-reveal";
import { AssignmentWheel } from "@/components/assignment-wheel";
import { WishlistDialog } from "@/components/wishlist-dialog";
import type { WishlistItem } from "@/lib/types";

/**
 * Decide qué se ve en "Me salió": la ruleta o el spoiler.
 *
 * La primera vez de cada persona va la ruleta (`revealed_at` en la base, no
 * en el navegador, para que sea una sola vez de verdad y no una por
 * dispositivo). Después queda el spoiler de mantener presionado, que es lo
 * que sirve para consultarlo mil veces sin que lo vea quien pase por detrás.
 *
 * `alreadyRevealed` viene del servidor; el estado local solo cubre el salto
 * de la ruleta al spoiler dentro de la misma visita, sin esperar a que
 * `revalidatePath` vuelva.
 */
export function AssignmentGate({
  groupId,
  name,
  avatarUrl,
  alreadyRevealed,
  roster,
  winnerIndex,
  targetItems,
  currency,
  budgetEndulzada,
  budgetRegalo,
}: {
  groupId: string;
  name: string;
  avatarUrl: string | null;
  alreadyRevealed: boolean;
  roster: { name: string; avatarUrl: string | null }[];
  winnerIndex: number;
  targetItems: WishlistItem[];
  currency: string;
  budgetEndulzada: number;
  budgetRegalo: number;
}) {
  const [revealed, setRevealed] = useState(alreadyRevealed);
  const [listOpen, setListOpen] = useState(false);

  // Si el índice no cuadra (un roster que cambió en el medio), se cae al
  // spoiler en vez de girar una ruleta que apuntaría a otra persona.
  const canSpin = !revealed && winnerIndex >= 0 && roster.length > 1;

  const listDialog = (
    <WishlistDialog
      personName={name}
      avatarUrl={avatarUrl}
      items={targetItems}
      currency={currency}
      budgetEndulzada={budgetEndulzada}
      budgetRegalo={budgetRegalo}
      open={listOpen}
      onOpenChange={setListOpen}
    />
  );

  if (canSpin) {
    return (
      <>
        <AssignmentWheel
          groupId={groupId}
          slices={roster}
          winnerIndex={winnerIndex}
          // "Ver su lista" antes solo cambiaba al spoiler y parecía no hacer
          // nada; ahora abre la lista de verdad.
          onDone={({ openList }) => {
            setRevealed(true);
            if (openList) setListOpen(true);
          }}
        />
        {listDialog}
      </>
    );
  }

  return (
    <>
      <AssignmentReveal
        name={name}
        avatarUrl={avatarUrl}
        onOpenList={() => setListOpen(true)}
      />
      {listDialog}
    </>
  );
}
