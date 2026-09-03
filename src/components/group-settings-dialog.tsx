"use client";

import { useActionState, useState } from "react";
import { Settings2, Trash2 } from "lucide-react";

import { BudgetFields } from "@/components/budget-fields";
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
import { Separator } from "@/components/ui/separator";
import { deleteGroup, updateGroup } from "@/lib/actions/groups";
import { idle } from "@/lib/actions/types";
import type { Group } from "@/lib/types";

export function GroupSettingsDialog({ group }: { group: Group }) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [state, formAction] = useActionState(updateGroup, idle);
  const [deleteState, deleteAction] = useActionState(deleteGroup, idle);

  useActionToast(state, () => setOpen(false));
  useActionToast(deleteState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" className="w-full">
            <Settings2 className="size-4" aria-hidden />
            Ajustes del parche
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustes del parche</DialogTitle>
          <DialogDescription>
            Los topes se pueden cambiar incluso después del sorteo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="group_id" value={group.id} />

          <div className="space-y-2">
            <Label htmlFor="settings-name">Nombre</Label>
            <Input
              id="settings-name"
              name="name"
              required
              maxLength={80}
              defaultValue={group.name}
            />
          </div>

          <BudgetFields
            defaultCurrency={group.currency}
            defaultEndulzada={group.budget_endulzada}
            defaultRegalo={group.budget_regalo}
          />

          <SubmitButton className="w-full" pendingLabel="Guardando…">
            Guardar cambios
          </SubmitButton>
        </form>

        <Separator />

        {confirmingDelete ? (
          <form action={deleteAction} className="space-y-2">
            <input type="hidden" name="group_id" value={group.id} />
            <p className="text-sm">
              Se borra el parche completo: participantes, listas y el sorteo.
              Esto no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <SubmitButton
                variant="destructive"
                className="flex-1"
                pendingLabel="Borrando…"
              >
                Sí, borrar
              </SubmitButton>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                Mejor no
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            Borrar el parche
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
