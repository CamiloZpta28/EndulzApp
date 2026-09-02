"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroup } from "@/lib/actions/groups";
import { idle } from "@/lib/actions/types";

/** On success `createGroup` redirects to the new group, so this never closes itself. */
export function CreateGroupDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createGroup, idle);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg" className="w-full">
            <Plus className="size-4" aria-hidden />
            Crear parche nuevo
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo parche</DialogTitle>
          <DialogDescription>
            Tú quedas como admin y ya tienes tu puesto en el sorteo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del parche</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={80}
              placeholder="Navidad 2026 · Oficina"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin_seat_name">Tu nombre en la lista</Label>
            <Input
              id="admin_seat_name"
              name="admin_seat_name"
              maxLength={60}
              placeholder="Camilo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="budget_endulzada">Tope endulzada</Label>
              <Input
                id="budget_endulzada"
                name="budget_endulzada"
                inputMode="numeric"
                defaultValue="20000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget_regalo">Tope regalo</Label>
              <Input
                id="budget_regalo"
                name="budget_regalo"
                inputMode="numeric"
                defaultValue="80000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Moneda</Label>
            <Input
              id="currency"
              name="currency"
              maxLength={3}
              defaultValue="COP"
              className="uppercase"
            />
          </div>

          {state.message && !state.ok && (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <SubmitButton className="w-full" size="lg" pendingLabel="Creando…">
              Crear parche
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
