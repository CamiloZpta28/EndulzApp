"use client";

import { useActionState, useState } from "react";
import { IdCard } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { useActionToast } from "@/components/use-action-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateNickname } from "@/lib/actions/members";
import { idle } from "@/lib/actions/types";

/**
 * El apodo con el que apareces en este grupo.
 *
 * Es por grupo, no global: en la oficina puedes ser "Camilo" y con los
 * primos "el Mono". Vacío vuelve a mostrar el nombre del perfil.
 */
export function NicknameDialog({
  groupId,
  memberId,
  currentNickname,
  profileName,
  forSomeoneElse = false,
}: {
  groupId: string;
  memberId: string;
  currentNickname: string | null;
  profileName: string;
  /** El admin poniéndole apodo a alguien más cambia solo los textos. */
  forSomeoneElse?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(updateNickname, idle);

  useActionToast(state, () => setOpen(false));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <IdCard className="size-3.5" aria-hidden />
            {forSomeoneElse
              ? currentNickname
                ? "Cambiar su apodo"
                : "Ponerle un apodo"
              : currentNickname
                ? "Cambiar mi apodo"
                : "Ponerme un apodo"}
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {forSomeoneElse
              ? `Apodo de ${profileName} en este grupo`
              : "Mi apodo en este grupo"}
          </DialogTitle>
          <DialogDescription>
            {forSomeoneElse
              ? "Solo aplica en este grupo. En sus otros grupos sigue apareciendo con su nombre."
              : "Solo aplica acá. En tus otros grupos sigues apareciendo como siempre."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="group_id" value={groupId} />
          <input type="hidden" name="member_id" value={memberId} />

          <div className="space-y-2">
            <Label htmlFor="nickname">Apodo</Label>
            <Input
              id="nickname"
              name="nickname"
              maxLength={40}
              defaultValue={currentNickname ?? ""}
              placeholder={profileName}
              autoComplete="off"
            />
            <p className="text-muted-foreground text-xs">
              Déjalo vacío para volver al nombre de{" "}
              <strong className="text-foreground">{profileName}</strong>.
            </p>
          </div>

          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar apodo
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
