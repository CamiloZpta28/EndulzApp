"use client";

import { useActionState } from "react";
import { Handshake } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { claimSeat } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";

/** On success `claimSeat` redirects into the group, so there is no success state. */
export function ClaimForm({
  token,
  claimed,
}: {
  token: string;
  claimed: boolean;
}) {
  const [state, formAction] = useActionState(claimSeat, idle);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />

      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {/*
        Left enabled even when the seat is taken: `claim_member` is idempotent
        for its own owner, so re-opening your own link just walks you in. If it
        belongs to somebody else, the action says so.
      */}
      <SubmitButton size="lg" className="w-full" pendingLabel="Reclamando…">
        <Handshake className="size-4" aria-hidden />
        {claimed ? "Entrar al parche" : "Reclamar mi puesto"}
      </SubmitButton>
    </form>
  );
}
