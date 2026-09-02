"use client";

import { useActionState } from "react";
import { RotateCcw, Shuffle } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { drawGroup, resetDraw } from "@/lib/actions/groups";
import { idle } from "@/lib/actions/types";
import type { GroupStatus } from "@/lib/types";

const MIN_PARTICIPANTS = 3;

/** Admin-only. The real authority is `public.perform_draw`, which re-checks. */
export function DrawPanel({
  groupId,
  status,
  memberCount,
}: {
  groupId: string;
  status: GroupStatus;
  memberCount: number;
}) {
  const [drawState, drawAction] = useActionState(drawGroup, idle);
  const [resetState, resetAction] = useActionState(resetDraw, idle);

  useActionToast(drawState);
  useActionToast(resetState);

  if (status === "drawn") {
    return (
      <form action={resetAction} className="space-y-3">
        <input type="hidden" name="group_id" value={groupId} />
        <Alert>
          <AlertDescription>
            El sorteo ya está hecho. Si reinicias, se borran todos los
            emparejamientos y toca sortear otra vez.
          </AlertDescription>
        </Alert>
        <SubmitButton
          variant="destructive"
          className="w-full"
          pendingLabel="Reiniciando…"
        >
          <RotateCcw className="size-4" aria-hidden />
          Reiniciar el sorteo
        </SubmitButton>
      </form>
    );
  }

  const short = memberCount < MIN_PARTICIPANTS;

  return (
    <form action={drawAction} className="space-y-3">
      <input type="hidden" name="group_id" value={groupId} />
      {short ? (
        <Alert>
          <AlertDescription>
            Necesitas al menos {MIN_PARTICIPANTS} participantes para sortear.
            Van {memberCount}.
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-muted-foreground text-sm">
          Al sortear, cada uno de los {memberCount} parceros recibe a otro
          distinto. Nadie se saca a sí mismo, y ni tú como admin puedes ver los
          emparejamientos.
        </p>
      )}
      <SubmitButton
        size="lg"
        className="w-full"
        disabled={short}
        pendingLabel="Sorteando…"
      >
        <Shuffle className="size-4" aria-hidden />
        Hacer el sorteo
      </SubmitButton>
    </form>
  );
}
