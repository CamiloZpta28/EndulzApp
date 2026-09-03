"use client";

import { useActionState } from "react";
import { Handshake } from "lucide-react";

import { ButtonLink } from "@/components/button-link";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { joinGroup } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";

/** Si sale bien, `joinGroup` redirige al parche: no hay estado de éxito. */
export function JoinConfirm({
  code,
  groupName,
}: {
  code: string;
  groupName: string;
}) {
  const [state, formAction] = useActionState(joinGroup, idle);

  return (
    <div className="space-y-3">
      <p className="text-center font-medium">
        ¿Quieres unirte a <span className="text-primary">{groupName}</span>?
      </p>

      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="code" value={code} />
        <SubmitButton size="lg" className="w-full" pendingLabel="Uniéndote…">
          <Handshake className="size-4" aria-hidden />
          Sí, únanme
        </SubmitButton>
      </form>

      <ButtonLink href="/dashboard" variant="ghost" className="w-full">
        Ahora no
      </ButtonLink>
    </div>
  );
}
